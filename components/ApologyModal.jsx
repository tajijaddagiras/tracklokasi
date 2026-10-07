'use client';

import React from 'react';

export default function ApologyModal({ isOpen, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(28, 25, 23, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '26px',
          padding: '34px 26px 30px 26px',
          boxShadow: '0 25px 60px -12px rgba(156, 65, 70, 0.35), 0 0 0 1px rgba(230, 215, 210, 0.8)',
          textAlign: 'center',
          position: 'relative',
          animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Soft decorative badge with Heart SVG */}
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#fdf2f2',
            border: '1px solid rgba(225, 175, 175, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
            boxShadow: '0 6px 16px rgba(156, 65, 70, 0.12)'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#9c4146">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>

        {/* Modal Title */}
        <h3
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: '1.45rem',
            fontWeight: 600,
            color: '#1c1917',
            margin: '0 0 12px 0',
            letterSpacing: '-0.01em',
            lineHeight: 1.3
          }}
        >
          Pesan Khusus Untukmu
        </h3>

        {/* Heartfelt Content */}
        <p
          style={{
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            fontSize: '0.94rem',
            lineHeight: 1.65,
            color: '#57534e',
            margin: '0 0 26px 0',
            padding: '0 4px'
          }}
        >
          Ada hal yang ingin kusampaikan dari lubuk hatiku yang terdalam... Izinkan kami menghubungkan pesan ini dan sentuh lanjutkan untuk membuka kenangan kita.
        </p>

        {/* Single Main CTA Button: Lanjutkan */}
        <button
          onClick={onConfirm}
          style={{
            width: '100%',
            padding: '14px 20px',
            backgroundColor: '#9c4146',
            backgroundImage: 'linear-gradient(135deg, #9c4146 0%, #b8545a 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '9999px',
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(156, 65, 70, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(156, 65, 70, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(156, 65, 70, 0.35)';
          }}
        >
          <span>Lanjutkan</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
