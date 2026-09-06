import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  CheckCircle2,
  Trash2,
  Maximize2,
  Minimize2,
  Pencil,
  Info,
  Search,
  Globe,
  Store,
  X
} from 'lucide-react';
import {
  PAKISTAN_PROVINCES,
  PAKISTAN_MAJOR_MANDIS,
  getDistrictsByProvince,
  getTehsilsByDistrict,
  getTehsilCenter,
  getSampleLocalities
} from '../../data/pakistanLocations';
import { calculatePolygonAcreage, calculateDistanceKm } from '../../utils/gis';
import { useLanguage } from '../../context/LanguageContext';

// Fix for default Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [30.1575, 71.5249]; // Multan / Punjab Agro Region

const FarmLocationPicker = ({
  province = 'Punjab',
  district = 'Sahiwal',
  tehsil = 'Sahiwal',
  village = 'Chak 88/9-L',
  latitude,
  longitude,
  farmPolygon = null,
  declaredAcreage = '',
  onChangeLocation,
  readOnly = false
}) => {
  const { t, isRTL } = useLanguage();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polygonLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const vertexMarkersRef = useRef([]);
  const mandiMarkersRef = useRef([]);

  // Internal Coordinates & Polygon State
  const [currentProvince, setCurrentProvince] = useState(province || 'Punjab');
  const [currentDistrict, setCurrentDistrict] = useState(district || 'Sahiwal');
  const [currentTehsil, setCurrentTehsil] = useState(tehsil || 'Sahiwal');
  const [currentVillage, setCurrentVillage] = useState(village || '');
  const [customVillage, setCustomVillage] = useState('');

  const [coords, setCoords] = useState({
    lat: latitude ? parseFloat(latitude) : DEFAULT_CENTER[0],
    lng: longitude ? parseFloat(longitude) : DEFAULT_CENTER[1]
  });

  // Map Display Modes & Layers
  const [layerType, setLayerType] = useState('map'); // 'map' | 'satellite'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMandis, setShowMandis] = useState(false);

  // Search Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Parse existing polygon or default to empty array
  const parseInitialPolygon = (poly) => {
    if (!poly) return [];
    if (typeof poly === 'string') {
      try { return JSON.parse(poly); } catch (e) { return []; }
    }
    return Array.isArray(poly) ? poly : [];
  };

  const [polygonPoints, setPolygonPoints] = useState(parseInitialPolygon(farmPolygon));
  const [drawMode, setDrawMode] = useState(false);
  const [declaredAcres, setDeclaredAcres] = useState(declaredAcreage || '');
  const [calculatedAcres, setCalculatedAcres] = useState(
    polygonPoints.length >= 3 ? calculatePolygonAcreage(polygonPoints) : 0
  );

  // Available dependent dropdown lists
  const availableDistricts = getDistrictsByProvince(currentProvince);
  const availableTehsils = getTehsilsByDistrict(currentProvince, currentDistrict);
  const sampleLocalities = getSampleLocalities(currentProvince, currentDistrict, currentTehsil);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = coords.lat || DEFAULT_CENTER[0];
      const initialLng = coords.lng || DEFAULT_CENTER[1];

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 12,
        scrollWheelZoom: !readOnly
      });

      const initialTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);
      tileLayerRef.current = initialTiles;

      // Farm Center Marker
      const marker = L.marker([initialLat, initialLng], {
        draggable: !readOnly && !drawMode
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <strong style="color: #15803d;">Farm Harvest Gate</strong><br>
          ${currentVillage ? `Locality: ${currentVillage}<br>` : ''}
          ${currentTehsil}, ${currentDistrict}
        </div>
      `);

      if (!readOnly) {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          setCoords({ lat: newLat, lng: newLng });
          notifyChange({ lat: newLat, lng: newLng });
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        polygonLayerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // 2. Tile Layer Toggle (Standard Map vs High-Resolution Satellite)
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
      ? 'Tiles &copy; Esri World Imagery &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    const newLayer = L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
    tileLayerRef.current = newLayer;
  }, [layerType]);

  // 3. Fullscreen Invalidate Size
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 150);
    }
  }, [isFullscreen]);

  // 4. Nearby Agricultural Markets / Mandis Display
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    mandiMarkersRef.current.forEach((m) => map.removeLayer(m));
    mandiMarkersRef.current = [];

    if (showMandis) {
      PAKISTAN_MAJOR_MANDIS.forEach((mandi) => {
        const distKm = calculateDistanceKm(coords.lat, coords.lng, mandi.lat, mandi.lng);

        const mandiIcon = L.divIcon({
          className: 'custom-mandi-marker',
          html: `<div style="background:#b45309;color:#fff;border:2px solid #fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);font-size:12px;">🏪</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const mMarker = L.marker([mandi.lat, mandi.lng], { icon: mandiIcon }).addTo(map);
        mMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 170px;">
            <strong style="color: #b45309; font-size: 13px;">${mandi.name}</strong><br/>
            <span style="color: #475569;">${mandi.city}, ${mandi.province}</span><br/>
            <span style="color: #64748b; font-size: 11px;">Primary: ${mandi.type}</span>
            <div style="margin-top: 5px; padding: 3px 6px; background: #fef3c7; color: #92400e; border-radius: 6px; font-weight: 700; font-size: 11px;">
              📍 Distance: ${distKm} km
            </div>
          </div>
        `);

        mandiMarkersRef.current.push(mMarker);
      });
    }
  }, [showMandis, coords.lat, coords.lng]);

  // 2. Sync Map Click listener according to drawMode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || readOnly) return;

    const handleMapClick = (e) => {
      const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
      const clickedLng = parseFloat(e.latlng.lng.toFixed(6));

      if (drawMode) {
        // Add vertex to polygon
        setPolygonPoints((prev) => {
          const updated = [...prev, { lat: clickedLat, lng: clickedLng }];
          const acreage = calculatePolygonAcreage(updated);
          setCalculatedAcres(acreage);
          notifyChange({ polygon: updated, calculatedAcreage: acreage });
          return updated;
        });
      } else {
        // Reposition farm center marker
        setCoords({ lat: clickedLat, lng: clickedLng });
        if (markerRef.current) {
          markerRef.current.setLatLng([clickedLat, clickedLng]);
        }
        notifyChange({ lat: clickedLat, lng: clickedLng });
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [drawMode, readOnly, currentProvince, currentDistrict, currentTehsil, currentVillage, declaredAcres]);

  // 3. Render Polygon Layer & Vertex Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing polygon layer and vertex markers
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    vertexMarkersRef.current.forEach((m) => map.removeLayer(m));
    vertexMarkersRef.current = [];

    if (polygonPoints && polygonPoints.length >= 3) {
      const latLngs = polygonPoints.map((p) => [p.lat, p.lng]);

      const polygon = L.polygon(latLngs, {
        color: '#059669', // Emerald 600
        weight: 3,
        opacity: 0.9,
        fillColor: '#10b981', // Emerald 500
        fillOpacity: 0.25,
        dashArray: drawMode ? '6, 6' : null
      }).addTo(map);

      polygon.bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <strong style="color: #047857;">Authoritative Farm Boundary</strong><br>
          Boundary Area: <strong>${calculatePolygonAcreage(polygonPoints)} Acres</strong><br>
          Vertices: ${polygonPoints.length} boundary points
        </div>
      `);

      polygonLayerRef.current = polygon;
    }

    // If in drawMode, show small clickable vertex circles
    if (drawMode && polygonPoints.length > 0) {
      polygonPoints.forEach((p, idx) => {
        const circle = L.circleMarker([p.lat, p.lng], {
          radius: 6,
          fillColor: '#047857',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);

        circle.bindTooltip(`Point ${String.fromCharCode(65 + (idx % 26))}`, {
          permanent: false,
          direction: 'top'
        });

        vertexMarkersRef.current.push(circle);
      });
    }
  }, [polygonPoints, drawMode]);

  // Notify parent component of changes
  const notifyChange = (overrides = {}) => {
    if (!onChangeLocation) return;
    const finalProvince = overrides.province !== undefined ? overrides.province : currentProvince;
    const finalDistrict = overrides.district !== undefined ? overrides.district : currentDistrict;
    const finalTehsil = overrides.tehsil !== undefined ? overrides.tehsil : currentTehsil;
    const finalVillage = overrides.village !== undefined ? overrides.village : (customVillage || currentVillage);
    const finalLat = overrides.lat !== undefined ? overrides.lat : coords.lat;
    const finalLng = overrides.lng !== undefined ? overrides.lng : coords.lng;
    const finalPolygon = overrides.polygon !== undefined ? overrides.polygon : polygonPoints;
    const finalCalculated = overrides.calculatedAcreage !== undefined ? overrides.calculatedAcreage : calculatedAcres;
    const finalDeclared = overrides.declaredAcreage !== undefined ? overrides.declaredAcreage : declaredAcres;

    onChangeLocation({
      province: finalProvince,
      district: finalDistrict,
      tehsil: finalTehsil,
      village: finalVillage,
      latitude: finalLat,
      longitude: finalLng,
      farm_polygon: finalPolygon,
      calculated_polygon_area_acres: finalCalculated,
      seller_declared_area_acres: finalDeclared ? parseFloat(finalDeclared) : null
    });
  };

  // Location Cascade Event Handlers
  const handleProvinceChange = (e) => {
    const newProv = e.target.value;
    setCurrentProvince(newProv);
    const districts = getDistrictsByProvince(newProv);
    const firstDistrict = districts[0]?.name || '';
    setCurrentDistrict(firstDistrict);

    const tehsils = getTehsilsByDistrict(newProv, firstDistrict);
    const firstTehsil = tehsils[0]?.name || '';
    setCurrentTehsil(firstTehsil);

    const center = getTehsilCenter(newProv, firstDistrict, firstTehsil) || DEFAULT_CENTER;
    recenterMap(center[0], center[1]);
    setCurrentVillage('');
    setCustomVillage('');

    notifyChange({
      province: newProv,
      district: firstDistrict,
      tehsil: firstTehsil,
      village: '',
      lat: center[0],
      lng: center[1]
    });
  };

  const handleDistrictChange = (e) => {
    const newDist = e.target.value;
    setCurrentDistrict(newDist);
    const tehsils = getTehsilsByDistrict(currentProvince, newDist);
    const firstTehsil = tehsils[0]?.name || '';
    setCurrentTehsil(firstTehsil);

    const center = getTehsilCenter(currentProvince, newDist, firstTehsil) || DEFAULT_CENTER;
    recenterMap(center[0], center[1]);
    setCurrentVillage('');
    setCustomVillage('');

    notifyChange({
      district: newDist,
      tehsil: firstTehsil,
      village: '',
      lat: center[0],
      lng: center[1]
    });
  };

  const handleTehsilChange = (e) => {
    const newTehsil = e.target.value;
    setCurrentTehsil(newTehsil);
    const center = getTehsilCenter(currentProvince, currentDistrict, newTehsil) || DEFAULT_CENTER;
    recenterMap(center[0], center[1]);
    setCurrentVillage('');
    setCustomVillage('');

    notifyChange({
      tehsil: newTehsil,
      village: '',
      lat: center[0],
      lng: center[1]
    });
  };

  const handleLocalitySelect = (localityName) => {
    setCurrentVillage(localityName);
    setCustomVillage('');
    notifyChange({ village: localityName });
  };

  const handleCustomVillageChange = (e) => {
    const val = e.target.value;
    setCustomVillage(val);
    setCurrentVillage(val);
    notifyChange({ village: val });
  };

  const recenterMap = (lat, lng) => {
    setCoords({ lat, lng });
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 13);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = parseFloat(pos.coords.latitude.toFixed(6));
          const newLng = parseFloat(pos.coords.longitude.toFixed(6));
          recenterMap(newLat, newLng);
          notifyChange({ lat: newLat, lng: newLng });
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err);
        }
      );
    }
  };

  const handleDeclaredAcresChange = (e) => {
    const val = e.target.value;
    setDeclaredAcres(val);
    notifyChange({ declaredAcreage: val });
  };

  const handleClearPolygon = () => {
    setPolygonPoints([]);
    setCalculatedAcres(0);
    notifyChange({ polygon: [], calculatedAcreage: 0 });
  };

  // Real-time Geocoding Search (Nominatim OSM with suggestions)
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&countrycodes=pk&addressdetails=1&limit=5`
        );
        const data = await res.json();
        setSearchResults(data || []);
      } catch (err) {
        console.error('Nominatim search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(parseFloat(result.lat).toFixed(6));
    const lng = parseFloat(parseFloat(result.lon).toFixed(6));
    setSearchResults([]);
    setSearchQuery(result.display_name);

    recenterMap(lat, lng);

    const addr = result.address || {};
    const detectedCity = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';

    if (detectedCity) {
      setCurrentVillage(detectedCity);
      setCustomVillage(detectedCity);
    }

    notifyChange({
      lat,
      lng,
      village: detectedCity || currentVillage
    });
  };

  return (
    <div className={`space-y-4 ${isRTL ? 'font-urdu' : ''}`}>
      {/* 1. Administrative Location Hierarchy */}
      {!readOnly && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Compass className="w-4 h-4 text-agro-600" />
            <span>{t('profile.location_hierarchy', 'Administrative Location Hierarchy')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Province Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">{t('profile.province', 'Province / Region')} *</label>
              <select
                value={currentProvince}
                onChange={handleProvinceChange}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-agro-500"
              >
                {PAKISTAN_PROVINCES.map((prov) => (
                  <option key={prov.id} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">{t('profile.district', 'District')} *</label>
              <select
                value={currentDistrict}
                onChange={handleDistrictChange}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-agro-500"
              >
                {availableDistricts.map((dist) => (
                  <option key={dist.name} value={dist.name}>
                    {dist.name} District
                  </option>
                ))}
              </select>
            </div>

            {/* Tehsil Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">{t('profile.tehsil', 'Tehsil / Town / City')} *</label>
              <select
                value={currentTehsil}
                onChange={handleTehsilChange}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-agro-500"
              >
                {availableTehsils.map((teh) => (
                  <option key={teh.name} value={teh.name}>
                    {teh.name} Tehsil
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Locality / Village Selection & Custom Entry */}
          <div className="pt-1">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              {t('profile.village', 'Village / Locality / Chak')} *
            </label>
            <div className="space-y-2">
              {sampleLocalities.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Sample Localities:</span>
                  {sampleLocalities.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleLocalitySelect(loc)}
                      className={`text-xs px-2.5 py-0.5 rounded-full border transition-all ${
                        currentVillage === loc && !customVillage
                          ? 'bg-agro-600 text-white border-agro-600 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-agro-400'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 italic">
                * Sample reference localities for this tehsil. You can select one or enter your exact village/chak/mauza below.
              </p>

              <div className="relative max-w-sm">
                <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRTL ? 'right-3' : 'left-3'} top-2.5`} />
                <input
                  type="text"
                  placeholder={t('profile.custom_village', 'Or enter custom village/tanda/mauza name...')}
                  value={customVillage || (sampleLocalities.includes(currentVillage) ? '' : currentVillage)}
                  onChange={handleCustomVillageChange}
                  className={`w-full bg-white border border-slate-200 rounded-xl ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-agro-500 font-medium`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Real-time Location Search with Autocomplete */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-300 p-2 shadow-sm">
          <Search className={`w-4 h-4 text-slate-400 ${isRTL ? 'mr-2' : 'ml-2'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            placeholder={t('profile.search_location', 'Search village, mandi, city or landmark in Pakistan...')}
            className="flex-1 bg-transparent border-none text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSearching && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-agro-600 mr-2"></div>
          )}
        </div>

        {/* Search Results Autocomplete Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
            {searchResults.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className={`w-full ${isRTL ? 'text-right' : 'text-left'} px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors flex items-start gap-2 text-slate-800`}
              >
                <MapPin className="w-4 h-4 text-agro-600 flex-shrink-0 mt-0.5" />
                <span className="truncate">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Interactive Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900 text-white rounded-2xl text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Map vs Satellite Toggle */}
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setLayerType('map')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                layerType === 'map' ? 'bg-agro-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{t('profile.map_view', 'Map')}</span>
            </button>
            <button
              type="button"
              onClick={() => setLayerType('satellite')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                layerType === 'satellite' ? 'bg-agro-600 text-white shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>{t('profile.satellite_view', 'Satellite')}</span>
            </button>
          </div>

          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => setDrawMode(false)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all inline-flex items-center gap-1.5 ${
                  !drawMode ? 'bg-agro-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t('profile.position_pin', 'Position Pin')}</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawMode(true)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all inline-flex items-center gap-1.5 ${
                  drawMode ? 'bg-agro-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{t('profile.draw_boundary', 'Draw Farm Boundary')}</span>
              </button>

              {polygonPoints.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearPolygon}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-red-300 hover:bg-red-900/40 font-bold transition-all inline-flex items-center gap-1 border border-slate-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('profile.clear_boundary', 'Clear Boundary')}</span>
                </button>
              )}
            </>
          )}

          {/* Nearby Mandis Toggle */}
          <button
            type="button"
            onClick={() => setShowMandis(!showMandis)}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all inline-flex items-center gap-1 border border-slate-700 ${
              showMandis ? 'bg-amber-600 text-white shadow' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
            title="Discover wholesale grain and fruit mandis"
          >
            <Store className="w-3.5 h-3.5" />
            <span>{t('profile.nearby_mandis', 'Nearby Mandis')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {!readOnly && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors inline-flex items-center gap-1 border border-slate-700"
            >
              <Navigation className="w-3 h-3 text-agro-400" />
              <span>{t('profile.my_gps', 'My GPS')}</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title={isFullscreen ? t('profile.exit_fullscreen', 'Exit Fullscreen') : t('profile.fullscreen', 'Fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4. Drawing Mode Guidance Alert */}
      {!readOnly && drawMode && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>{isRTL ? 'حدود کی نشاندہی فعال ہے:' : 'Boundary Drawing Active:'}</strong>{' '}
              {isRTL
                ? 'فارم کی بیرونی حدود پر کلک کرتے جائیں (A، B، C، D)۔ کم از کم 3 نکات سے رقبہ خودکار طور پر شمار ہو جائے گا۔'
                : 'Click on the map or high-resolution satellite imagery to mark boundary perimeter vertices. A minimum of 3 points creates the farm polygon.'}
            </span>
          </div>
          <span className="font-bold text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg flex-shrink-0">
            {polygonPoints.length} {isRTL ? 'نکات' : 'Points'}
          </span>
        </div>
      )}

      {/* 5. Leaflet Map Container (Standard or Fullscreen Modal) */}
      {isFullscreen ? (
        <div className="fixed inset-0 z-50 p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm flex flex-col space-y-3">
          <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{t('profile.fullscreen', 'Fullscreen Farm Geographic Map')}</span>
              <span className="text-xs text-emerald-400 font-bold">
                {calculatedAcres > 0 ? `(${calculatedAcres} ${t('profile.acres_unit', 'Acres')})` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 border border-slate-700"
            >
              <Minimize2 className="w-4 h-4" />
              <span>{t('profile.exit_fullscreen', 'Exit Fullscreen')}</span>
            </button>
          </div>
          <div
            ref={mapContainerRef}
            className="flex-1 w-full rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative"
          />
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="w-full h-80 sm:h-96 rounded-2xl border border-slate-300 shadow-inner z-0 overflow-hidden relative"
        />
      )}

      {/* 6. Farm Area / Acreage Display & Declared Input */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs">
        {/* Declared Acreage Input */}
        <div>
          <label className="text-[11px] font-bold text-slate-600 block mb-1">
            {t('profile.declared_acres', 'Seller Declared Farm Area')}
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="e.g. 18.5"
              value={declaredAcres}
              onChange={handleDeclaredAcresChange}
              disabled={readOnly}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl ${isRTL ? 'pr-3 pl-14' : 'pl-3 pr-14'} py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-agro-500 disabled:bg-slate-100`}
            />
            <span className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-2 font-bold text-slate-400 text-xs pointer-events-none`}>
              {t('profile.acres_unit', 'Acres')}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {t('profile.acres_official_hint', 'Official land ownership/lease area registered with district revenue.')}
          </p>
        </div>

        {/* Calculated Polygon Acreage (From Geodesic Geometry) */}
        <div className="flex flex-col justify-center p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {t('profile.calculated_acres', 'GIS Boundary Calculated Area')}:
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              {polygonPoints.length >= 3 ? 'Geodesic' : 'No Polygon'}
            </span>
          </div>

          <p className="text-xl font-black text-agro-800">
            {calculatedAcres > 0 ? `${calculatedAcres} ${t('profile.acres_unit', 'acres')}` : `0.00 ${t('profile.acres_unit', 'acres')}`}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {polygonPoints.length >= 3
              ? (isRTL ? `نقشے پر لگائے گئے ${polygonPoints.length} باؤنڈری نکات کے مطابق پیمائش شدہ رقبہ۔` : `Calculated from ${polygonPoints.length}-point farm boundary polygon.`)
              : (isRTL ? 'فارم کی حدود بنانے کے لیے اوپر بٹن دبائیں۔' : 'Click "Draw Farm Boundary" above to mark farm perimeter.')}
          </p>
        </div>
      </div>

      {/* 7. Selected Coordinates Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs gap-1 text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-agro-600 flex-shrink-0" />
          <span className="font-semibold text-slate-800">
            {currentVillage || 'Farm'}, {currentTehsil}, {currentDistrict}, {currentProvince}
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-700">
          Lat: <span className="font-bold text-agro-700">{coords.lat}</span> | Lng:{' '}
          <span className="font-bold text-agro-700">{coords.lng}</span>
        </div>
      </div>
    </div>
  );
};

export default FarmLocationPicker;
