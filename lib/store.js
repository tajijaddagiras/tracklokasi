import fs from 'fs';
import path from 'path';

// Global cache for Vercel serverless environment
const globalForStore = globalThis;

if (!globalForStore._trackStore) {
  globalForStore._trackStore = {
    links: [],
    logs: []
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

function loadFromFile() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.links) globalForStore._trackStore.links = parsed.links;
      if (parsed.logs) globalForStore._trackStore.logs = parsed.logs;
    }
  } catch (err) {
    // If running in readonly environment like Vercel, use memory
  }
}

function saveToFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(globalForStore._trackStore, null, 2), 'utf8');
  } catch (err) {
    // Readonly filesystem in production serverless, fallback in memory
  }
}

// Initial load
loadFromFile();

export const store = {
  getLinks() {
    return globalForStore._trackStore.links || [];
  },

  getLinkById(id) {
    return (globalForStore._trackStore.links || []).find((l) => l.id === id);
  },

  createLink({ title, preset, targetDestination, note }) {
    const id = 'loc-' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4);
    const newLink = {
      id,
      title: title?.trim() || 'Titik Lokasi Pertemuan',
      preset: preset || 'maps',
      targetDestination: targetDestination?.trim() || '',
      note: note?.trim() || '',
      createdAt: new Date().toISOString(),
      clicks: 0,
      captures: 0
    };

    globalForStore._trackStore.links.unshift(newLink);
    saveToFile();
    return newLink;
  },

  deleteLink(id) {
    globalForStore._trackStore.links = globalForStore._trackStore.links.filter((l) => l.id !== id);
    globalForStore._trackStore.logs = globalForStore._trackStore.logs.filter((log) => log.linkId !== id);
    saveToFile();
    return true;
  },

  incrementClick(id) {
    const link = (globalForStore._trackStore.links || []).find((l) => l.id === id);
    if (link) {
      link.clicks = (link.clicks || 0) + 1;
      saveToFile();
      return link.clicks;
    }
    return 0;
  },

  getLogs(linkId) {
    let logs = globalForStore._trackStore.logs || [];
    if (linkId) {
      logs = logs.filter((l) => l.linkId === linkId);
    }
    return logs;
  },

  addLog(entry) {
    const logId = 'log-' + Math.random().toString(36).substring(2, 9);
    const logWithId = {
      id: logId,
      timestamp: new Date().toISOString(),
      ...entry
    };

    const link = (globalForStore._trackStore.links || []).find((l) => l.id === entry.linkId);
    if (link) {
      link.captures = (link.captures || 0) + 1;
    }

    globalForStore._trackStore.logs.unshift(logWithId);
    saveToFile();
    return logWithId;
  },

  deleteLog(id) {
    globalForStore._trackStore.logs = globalForStore._trackStore.logs.filter((l) => l.id !== id);
    saveToFile();
    return true;
  },

  clearLogs() {
    globalForStore._trackStore.logs = [];
    (globalForStore._trackStore.links || []).forEach((l) => (l.captures = 0));
    saveToFile();
    return true;
  }
};

// Helper: OpenStreetMap Reverse Geocoding
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TrackLokasiNextApp/1.0 (Admin Geolocation Monitoring)',
        'Accept-Language': 'id, en;q=0.8'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      throw new Error(`Nominatim error ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};

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
    console.warn('Reverse geocode fallback:', err.message);
    return {
      road: 'Posisi GPS Terdeteksi',
      village: '-',
      district: '-',
      city: '-',
      state: '-',
      postcode: '-',
      country: 'Indonesia',
      full_address: `Koordinat: ${lat}, ${lng}`
    };
  }
}

// Helper: Parse User Agent
export function parseUserAgent(ua = '') {
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
