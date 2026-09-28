const STORAGE_KEY = 'blood-donor-finder-data';

const defaultDonors = [
  {
    id: 'donor-1',
    name: 'Ayesha Khan',
    bloodGroup: 'O+',
    phone: '+91 98765 43210',
    location: 'Bengaluru',
    availability: 'Available now'
  },
  {
    id: 'donor-2',
    name: 'Rohit Sharma',
    bloodGroup: 'A+',
    phone: '+91 99887 66123',
    location: 'Mumbai',
    availability: 'Available today'
  },
  {
    id: 'donor-3',
    name: 'Neha Verma',
    bloodGroup: 'B+',
    phone: '+91 91234 56789',
    location: 'Delhi',
    availability: 'Emergency only'
  },
  {
    id: 'donor-4',
    name: 'Vikram Singh',
    bloodGroup: 'AB-',
    phone: '+91 95000 22334',
    location: 'Pune',
    availability: 'Available now'
  }
];

function seedStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDonors));
  }
}

function getDonors() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [...defaultDonors];

  try {
    return JSON.parse(saved);
  } catch (error) {
    return [...defaultDonors];
  }
}

function saveDonors(donors) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donors));
}

function formatAvailabilityClass(value) {
  if (value === 'Available now' || value === 'Available today') return 'available';
  if (value === 'Emergency only') return 'emergency';
  return 'unavailable';
}

function sanitizePhoneNumber(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function createDonorCard(donor) {
  const card = document.createElement('article');
  const telNumber = sanitizePhoneNumber(donor.phone);
  card.className = 'donor-card';
  card.innerHTML = `
    <div class="donor-card-header">
      <h3 class="donor-name">${donor.name}</h3>
      <span class="blood-badge">${donor.bloodGroup}</span>
    </div>
    <ul class="meta-list">
      <li><span>📍</span><strong>${donor.location}</strong></li>
      <li><span>📞</span><strong>${donor.phone}</strong></li>
    </ul>
    <span class="availability ${formatAvailabilityClass(donor.availability)}">${donor.availability}</span>
    <div class="contact-row">
      <button class="call-link" type="button" data-action="call" data-phone="${telNumber}" data-name="${donor.name}" aria-label="Call ${donor.name}">Call donor</button>
      <div class="card-actions">
        <button class="card-action edit" type="button" data-action="edit" data-id="${donor.id}">Edit</button>
        <button class="card-action delete" type="button" data-action="delete" data-id="${donor.id}">Delete</button>
      </div>
    </div>
  `;

  return card;
}

function renderFeaturedDonors() {
  const container = document.getElementById('featuredDonors');
  if (!container) return;

  const donors = getDonors().slice(0, 3);
  container.innerHTML = '';

  if (!donors.length) {
    container.innerHTML = '<div class="empty-state">No donors registered yet.</div>';
    return;
  }

  donors.forEach((donor) => container.appendChild(createDonorCard(donor)));
}

function updateHomeStats() {
  const total = document.getElementById('stats-total');
  const available = document.getElementById('stats-available');
  const cityCount = document.getElementById('stats-city');

  if (!total || !available || !cityCount) return;

  const donors = getDonors();
  const availableNow = donors.filter((donor) => donor.availability === 'Available now').length;
  const uniqueCities = new Set(donors.map((donor) => donor.location.trim().toLowerCase())).size;

  total.textContent = donors.length;
  available.textContent = availableNow;
  cityCount.textContent = uniqueCities;
}

function renderSearchResults(list = getDonors()) {
  const results = document.getElementById('searchResults');
  const count = document.getElementById('resultsCount');

  if (!results) return;

  results.innerHTML = '';

  if (!list.length) {
    results.innerHTML = '<div class="empty-state">No matching donors found. Try another blood group or location.</div>';
    if (count) count.textContent = '0 donors';
    return;
  }

  if (count) count.textContent = `${list.length} donor${list.length > 1 ? 's' : ''}`;
  list.forEach((donor) => results.appendChild(createDonorCard(donor)));
}

function handleSearchSubmit(event) {
  event.preventDefault();

  const bloodGroup = document.getElementById('searchBloodGroup')?.value.trim();
  const location = document.getElementById('searchLocation')?.value.trim().toLowerCase();

  const donors = getDonors().filter((donor) => {
    const matchesBlood = !bloodGroup || donor.bloodGroup === bloodGroup;
    const matchesLocation = !location || donor.location.toLowerCase().includes(location);
    return matchesBlood && matchesLocation;
  });

  renderSearchResults(donors);
}

function resetSearchForm() {
  const form = document.getElementById('searchForm');
  if (form) form.reset();
  renderSearchResults(getDonors());
}

function getFormValues(form) {
  const data = new FormData(form);
  return {
    id: data.get('donorId') || `donor-${Date.now()}`,
    name: String(data.get('name') || '').trim(),
    bloodGroup: String(data.get('bloodGroup') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    location: String(data.get('location') || '').trim(),
    availability: String(data.get('availability') || '').trim()
  };
}

function setFormMessage(text, type) {
  const messageBox = document.getElementById('formMessage');
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

function fillEditForm(donorId) {
  const donor = getDonors().find((item) => item.id === donorId);
  if (!donor) return;

  const form = document.getElementById('donorForm');
  if (!form) return;

  form.querySelector('#donorId').value = donor.id;
  form.querySelector('#name').value = donor.name;
  form.querySelector('#bloodGroup').value = donor.bloodGroup;
  form.querySelector('#phone').value = donor.phone;
  form.querySelector('#location').value = donor.location;
  form.querySelector('#availability').value = donor.availability;

  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  if (formTitle) formTitle.textContent = 'Update donor profile';
  if (submitBtn) submitBtn.textContent = 'Update donor';
  if (cancelBtn) cancelBtn.classList.remove('hidden');
}

function resetDonorForm() {
  const form = document.getElementById('donorForm');
  if (!form) return;
  form.reset();
  form.querySelector('#donorId').value = '';

  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  if (formTitle) formTitle.textContent = 'Register donor profile';
  if (submitBtn) submitBtn.textContent = 'Save donor';
  if (cancelBtn) cancelBtn.classList.add('hidden');
}

function handleDonorSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const donor = getFormValues(form);

  if (!donor.name || !donor.bloodGroup || !donor.phone || !donor.location || !donor.availability) {
    setFormMessage('Please complete all donor fields.', 'error');
    return;
  }

  const donors = getDonors();
  const donorIndex = donors.findIndex((item) => item.id === donor.id);

  if (donorIndex >= 0) {
    donors[donorIndex] = donor;
    setFormMessage('Donor updated successfully.', 'success');
  } else {
    donors.unshift(donor);
    setFormMessage('Donor registered successfully.', 'success');
  }

  saveDonors(donors);
  renderFeaturedDonors();
  renderSearchResults();
  updateHomeStats();

  if (donorIndex < 0) {
    form.reset();
    form.querySelector('#donorId').value = '';
  } else {
    setTimeout(() => {
      window.location.href = 'search.html';
    }, 600);
  }
}

async function attemptDial(phoneNumber, donorName) {
  if (!phoneNumber) return;

  const button = document.querySelector(`[data-phone="${phoneNumber}"]`);
  if (button) {
    button.disabled = true;
    button.textContent = 'Calling...';
  }

  try {
    const response = await fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorName,
        phone: phoneNumber
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Call request failed.');
    }

    window.alert(`${data.message}`);
  } catch (error) {
    const message = error.message || 'The server was not able to place the live call.';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(phoneNumber).catch(() => {});
    }
    window.alert(`${message} Number copied to clipboard: ${phoneNumber}`);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Call donor';
    }
  }
}

function handleCardActionClick(event) {
  const callLink = event.target.closest('[data-action="call"]');
  if (callLink) {
    const telNumber = callLink.dataset.phone;
    const donorName = callLink.dataset.name || 'Donor';
    if (telNumber) {
      attemptDial(telNumber, donorName);
    }
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;

  const donorId = button.dataset.id;
  const action = button.dataset.action;

  if (action === 'edit') {
    window.location.href = `register.html?edit=${donorId}`;
    return;
  }

  if (action === 'delete') {
    const confirmed = window.confirm('Are you sure you want to delete this donor?');
    if (!confirmed) return;

    const donors = getDonors().filter((donor) => donor.id !== donorId);
    saveDonors(donors);
    renderFeaturedDonors();
    renderSearchResults();
    updateHomeStats();
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }
}

function initializePage() {
  seedStorage();
  registerServiceWorker();

  const page = document.body.dataset.page;

  if (page === 'home') {
    renderFeaturedDonors();
    updateHomeStats();
    return;
  }

  if (page === 'register') {
    const form = document.getElementById('donorForm');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const params = new URLSearchParams(window.location.search);
    const donorId = params.get('edit');

    if (donorId) {
      fillEditForm(donorId);
    }

    form?.addEventListener('submit', handleDonorSubmit);
    cancelBtn?.addEventListener('click', () => {
      resetDonorForm();
      setFormMessage('Edit cancelled.', 'success');
      setTimeout(() => {
        window.location.href = 'search.html';
      }, 400);
    });
    return;
  }

  if (page === 'search') {
    renderSearchResults(getDonors());

    document.getElementById('searchForm')?.addEventListener('submit', handleSearchSubmit);
    document.getElementById('resetSearchBtn')?.addEventListener('click', resetSearchForm);
    document.addEventListener('click', handleCardActionClick);
  }
}

document.addEventListener('DOMContentLoaded', initializePage);
