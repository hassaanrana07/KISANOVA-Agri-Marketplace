/**
 * Geodesic GIS Area & Acreage Calculation Utility
 * Computes exact surface area on a spherical Earth model for farm boundaries.
 */

const EARTH_RADIUS = 6371000; // Earth mean radius in meters
const SQ_METERS_TO_ACRES = 0.000247105381;

/**
 * Calculate polygon area in Acres from array of { lat, lng } points
 * @param {Array<{lat: number, lng: number}>} points
 * @returns {number} Area in Acres (rounded to 2 decimal places)
 */
export const calculatePolygonAcreage = (points) => {
  if (!points || points.length < 3) {
    return 0;
  }

  // Normalize points format (support both [lat, lng] and {lat, lng})
  const coords = points.map((p) => {
    if (Array.isArray(p)) return { lat: p[0], lng: p[1] };
    return { lat: Number(p.lat), lng: Number(p.lng) };
  });

  const numPoints = coords.length;
  let total = 0;

  for (let i = 0; i < numPoints; i++) {
    const prevIndex = (i - 1 + numPoints) % numPoints;
    const nextIndex = (i + 1) % numPoints;

    const prev = coords[prevIndex];
    const next = coords[nextIndex];
    const curr = coords[i];

    const dLng = ((next.lng - prev.lng) * Math.PI) / 180;
    const latRad = (curr.lat * Math.PI) / 180;

    total += dLng * Math.sin(latRad);
  }

  const areaSqMeters = Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
  const acres = areaSqMeters * SQ_METERS_TO_ACRES;

  return Math.round(acres * 100) / 100;
};

/**
 * Compute centroid of polygon
 * @param {Array<{lat: number, lng: number}>} points
 * @returns {{lat: number, lng: number}|null}
 */
export const calculatePolygonCentroid = (points) => {
  if (!points || points.length === 0) return null;

  const coords = points.map((p) => {
    if (Array.isArray(p)) return { lat: p[0], lng: p[1] };
    return { lat: Number(p.lat), lng: Number(p.lng) };
  });

  let sumLat = 0;
  let sumLng = 0;

  coords.forEach((p) => {
    sumLat += p.lat;
    sumLng += p.lng;
  });

  return {
    lat: parseFloat((sumLat / coords.length).toFixed(6)),
    lng: parseFloat((sumLng / coords.length).toFixed(6))
  };
};

/**
 * Calculate Great Circle / Haversine distance between two coordinates in Kilometers
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export default {
  calculatePolygonAcreage,
  calculatePolygonCentroid,
  calculateDistanceKm
};
