/**
 * Haversine formula to calculate geodesic distance between two GPS coordinates in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export interface GeofenceResult {
  within: boolean;
  distance: number;
}

export function isWithinGeofence(
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number = 100
): GeofenceResult {
  const distance = haversineDistance(userLat, userLng, officeLat, officeLng);
  return {
    within: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}

export const DEFAULT_OFFICE_COORDINATES = {
  latitude: 28.6007974,
  longitude: 77.4323678,
  radiusMeters: 100,
};
