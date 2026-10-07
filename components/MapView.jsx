'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function MapView({ logs = [], focusedCoords = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const circlesGroupRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: true,
      }).setView([-6.2088, 106.8456], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      circlesGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount if needed
    };
  }, []);

  // Update Markers when logs change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersGroupRef.current || !circlesGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    circlesGroupRef.current.clearLayers();

    const bounds = [];

    logs.forEach((log) => {
      const { latitude, longitude, accuracy } = log.coordinates || {};
      if (!latitude || !longitude) return;

      bounds.push([latitude, longitude]);

      // Accuracy Circle
      L.circle([latitude, longitude], {
        radius: accuracy || 20,
        color: '#06b6d4',
        fillColor: '#06b6d4',
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(circlesGroupRef.current);

      // Pulse Radar Marker
      const icon = L.divIcon({
        className: 'custom-radar-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; width: 24px; height: 24px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: pulse-ring 1.8s infinite;"></div>
            <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #2563eb; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 8px rgba(37,99,235,0.8);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([latitude, longitude], { icon }).addTo(markersGroupRef.current);

      const popupHtml = `
        <div style="font-family: inherit;">
          <h4 style="margin: 0 0 6px; color: #38bdf8; font-size: 0.95rem;">📍 ${log.address?.road || 'Lokasi Terdeteksi'}</h4>
          <p style="margin: 2px 0; font-size: 0.8rem; color: #cbd5e1;"><strong>Kecamatan:</strong> ${log.address?.district || '-'}</p>
          <p style="margin: 2px 0; font-size: 0.8rem; color: #cbd5e1;"><strong>Kota/Kab:</strong> ${log.address?.city || '-'}</p>
          <p style="margin: 2px 0; font-size: 0.8rem; color: #cbd5e1;"><strong>Koordinat:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
          <p style="margin: 2px 0; font-size: 0.8rem; color: #cbd5e1;"><strong>Akurasi GPS:</strong> &plusmn;${Math.round(accuracy || 0)} m</p>
          <a href="${log.googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 8px; padding: 4px 10px; background: #2563eb; color: white; border-radius: 6px; font-size: 0.75rem; text-decoration: none;">Buka di Google Maps ↗</a>
        </div>
      `;

      marker.bindPopup(popupHtml);
    });

    if (bounds.length > 0 && !focusedCoords) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 16 });
    }
  }, [logs]);

  // Handle manual focus
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusedCoords) return;

    map.flyTo([focusedCoords.lat, focusedCoords.lng], 17, {
      animate: true,
      duration: 1.2
    });
  }, [focusedCoords]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '480px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1
      }}
    />
  );
}
