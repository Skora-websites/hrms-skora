import { haversineDistance } from "@/lib/geofencing";

/**
 * Check if coordinates fall within a geofence radius.
 * Returns the result with field names expected by the server actions.
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  officeLat: number,
  officeLng: number,
  radiusMeters: number = 100
): { isWithin: boolean; distanceMeters: number } {
  const distance = haversineDistance(userLat, userLng, officeLat, officeLng);
  return {
    isWithin: distance <= radiusMeters,
    distanceMeters: Math.round(distance),
  };
}
