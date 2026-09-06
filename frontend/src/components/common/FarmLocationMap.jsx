import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass, Layers, Globe } from 'lucide-react';

// Fix for default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const FarmLocationMap = ({
  latitude,
  longitude,
  farmPolygon = null,
  farmName = 'Farm Location',
  city = '',
  district = '',
  province = '',
  declaredAcreage = null,
  calculatedAcreage = null,
  height = 'h-64'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [layerType, setLayerType] = useState('map'); // 'map' | 'satellite'

  const hasCoords = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  const lat = hasCoords ? parseFloat(latitude) : 30.1575;
  const lng = hasCoords ? parseFloat(longitude) : 71.5249;

  const parsePolygon = (poly) => {
    if (!poly) return [];
    if (typeof poly === 'string') {
      try { return JSON.parse(poly); } catch (e) { return []; }
    }
    return Array.isArray(poly) ? poly : [];
  };

  const polygonPoints = parsePolygon(farmPolygon);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = layerType === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = layerType === 'satellite'
      ? 'Tiles &copy; Esri World Imagery'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    const newLayer = L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [layerType]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: hasCoords ? 13 : 6,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Farm Pin Marker
      if (hasCoords) {
        const marker = L.marker([lat, lng]).addTo(map);
        marker
          .bindPopup(`
            <div style="font-family: inherit; padding: 2px;">
              <strong style="color: #15803d; font-size: 13px;">${farmName}</strong>
              <div style="font-size: 11px; color: #475569; margin-top: 3px;">
                ${city ? `<b>Locality / City:</b> ${city}<br>` : ''}
                ${district ? `<b>District:</b> ${district}, ${province}<br>` : ''}
                ${declaredAcreage ? `<b>Farm Area:</b> ${declaredAcreage} acres` : ''}
              </div>
            </div>
          `)
          .openPopup();
      }

      // Farm Boundary Polygon
      if (polygonPoints && polygonPoints.length >= 3) {
        const latLngs = polygonPoints.map((p) => [p.lat, p.lng]);
        const polygon = L.polygon(latLngs, {
          color: '#059669',
          weight: 3,
          fillColor: '#10b981',
          fillOpacity: 0.25
        }).addTo(map);

        polygon.bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <strong style="color: #047857;">Verified Farm Boundary</strong><br>
            Acreage: <strong>${calculatedAcreage || declaredAcreage || ''} Acres</strong>
          </div>
        `);

        // Fit map bounds to encompass the farm polygon
        try {
          map.fitBounds(polygon.getBounds(), { padding: [20, 20] });
        } catch (e) {
          console.warn('Could not fit map bounds:', e);
        }
      }

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], hasCoords ? 13 : 6);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, hasCoords, farmPolygon, farmName, city, district, province, declaredAcreage, calculatedAcreage]);

  if (!hasCoords && polygonPoints.length === 0) {
    return (
      <div className={`w-full ${height} rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-500`}>
        <MapPin className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Farm Location Coordinates Not Listed</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          The cultivator has not published GPS perimeter boundaries yet. Inquire directly via Kisanova Chat for harvest gate directions.
        </p>
      </div>
    );
  }

  const locationHierarchyText = [city, district, province].filter(Boolean).join(', ');

  return (
    <div className="space-y-2">
      {/* Map Element Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div
          ref={mapContainerRef}
          className={`w-full ${height} z-0 overflow-hidden relative`}
        />

        {/* Floating Map vs Satellite Toggle */}
        <div className="absolute top-2 right-2 z-10 flex items-center bg-slate-900/85 backdrop-blur-sm rounded-xl p-0.5 border border-slate-700 shadow-md text-white text-[11px]">
          <button
            type="button"
            onClick={() => setLayerType('map')}
            className={`px-2 py-0.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              layerType === 'map' ? 'bg-agro-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Map</span>
          </button>
          <button
            type="button"
            onClick={() => setLayerType('satellite')}
            className={`px-2 py-0.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
              layerType === 'satellite' ? 'bg-agro-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Satellite</span>
          </button>
        </div>
      </div>

      {/* Farm Location & Boundary Summary Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-1 gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-agro-600 flex-shrink-0" />
          <span className="font-semibold text-slate-800">
            {locationHierarchyText || 'Harvest Field Location'}
          </span>

          {/* Acreage Badges */}
          {declaredAcreage && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
              {declaredAcreage} Acres
            </span>
          )}

          {polygonPoints.length >= 3 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              <Layers className="w-3 h-3" />
              Boundary Polygon Verified
            </span>
          )}
        </div>

        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-agro-600 hover:text-agro-700 font-bold inline-flex items-center gap-1 hover:underline ml-auto"
        >
          <Navigation className="w-3 h-3" />
          Open in Google Maps
        </a>
      </div>
    </div>
  );
};

export default FarmLocationMap;
