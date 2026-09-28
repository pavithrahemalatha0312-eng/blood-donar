const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const PROJECT_ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request body too large.'));
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', reject);
  });
}

function safeResolveFile(filePath) {
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(PROJECT_ROOT)) {
    return null;
  }
  return normalized;
}

function serveStaticFile(res, filePath) {
  const resolvedPath = safeResolveFile(path.join(PROJECT_ROOT, filePath));

  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const fileType = path.extname(resolvedPath).toLowerCase();
  const mimeType = MIME_TYPES[fileType] || 'application/octet-stream';

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }

    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  });
}

async function makeTwilioCall(donorName, donorPhone) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio environment variables are missing. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your .env file.');
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">This is a blood donor finder emergency call for ${donorName}. Please answer the call and help save a life.</Say></Response>`;

  const body = new URLSearchParams({
    To: donorPhone,
    From: fromNumber,
    Twiml: twiml
  });

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: body.toString()
  });

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(rawText || 'Twilio rejected the outbound call.');
  }

  let result = {};
  try {
    result = JSON.parse(rawText);
  } catch (error) {
    result = { sid: null };
  }

  return {
    success: true,
    sid: result.sid || null,
    message: `Call request accepted for ${donorName} (${donorPhone}).`
  };
}

async function handleCallRequest(req, res) {
  try {
    const payload = await readRequestBody(req);
    const donorName = String(payload.donorName || '').trim();
    const donorPhone = String(payload.phone || payload.donorPhone || '').trim();

    if (!donorName || !donorPhone) {
      sendJson(res, 400, {
        success: false,
        error: 'Donor name and phone number are required.'
      });
      return;
    }

    const result = await makeTwilioCall(donorName, donorPhone);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      error: error.message || 'Unable to place call.'
    });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      app: 'Blood Donor Finder',
      status: 'running'
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/call') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    await handleCallRequest(req, res);
    return;
  }

  const safePath = url.pathname === '/' ? '/index.html' : url.pathname;
  serveStaticFile(res, safePath);
});

server.listen(PORT, () => {
  console.log(`Blood Donor Finder app is running on http://localhost:${PORT}`);
});
