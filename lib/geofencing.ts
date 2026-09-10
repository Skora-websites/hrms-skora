/**
 * Haversine formula to calculate distance between two GPS coordinates.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if a user's location is within the allowed geofence radius.
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param officeLat - Office latitude
 * @param officeLng - Office longitude
 * @param radiusMeters - Allowed radius (default 100m)
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number = 100
): { within: boolean; distance: number } {
  const distance = haversineDistance(userLat, userLng, officeLat, officeLng);
  return {
    within: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}
