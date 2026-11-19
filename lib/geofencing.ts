/**
 * Geofencing & Location Verification Engine
 * Multi-factor verification: GPS Haversine, Accuracy bounds, Mock location detection,
 * and Office Corporate Network / Wi-Fi IP bypass.
 */

export interface GeofenceResult {
  within: boolean;
  distance: number;
}

export interface GeofenceEvaluation {
  allowed: boolean;
  tier: "network_verified" | "on_premise_gps" | "indoor_drift_exception" | "outside_geofence" | "spoof_detected";
  status: "verified" | "drift_exception" | "rejected";
  distanceMeters: number;
  accuracyMeters: number;
  requiresManagerApproval: boolean;
  message: string;
}

export interface OfficeCoordinates {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxDriftRadiusMeters?: number;
}

export const DEFAULT_OFFICE_COORDINATES: OfficeCoordinates = {
  latitude: 28.6007974,
  longitude: 77.4323678,
  radiusMeters: 100,
  maxDriftRadiusMeters: 250,
};

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

/**
 * Enterprise Tiered Location Verification:
 * 1. Fraud Check: Detect fake GPS / mock providers
 * 2. Network Bypass: Instant pass if connected to Office Public IP / VPN Gateway
 * 3. On-Premise GPS: Pass if within 100m
 * 4. Indoor Drift Exception: Allow punch if between 101m - 250m with manager flag
 * 5. Outside Geofence: Reject if > 250m
 */
export function evaluateGeofencePunch(params: {
  userLat?: number;
  userLng?: number;
  accuracyMeters?: number;
  isMockLocation?: boolean;
  clientIp?: string;
  officeIps?: string[];
  officeLat?: number;
  officeLng?: number;
  officeRadius?: number;
  maxDriftRadius?: number;
}): GeofenceEvaluation {
  const accuracy = params.accuracyMeters ?? 10;

  // 1. Mock location / spoofing detection
  if (params.isMockLocation) {
    return {
      allowed: false,
      tier: "spoof_detected",
      status: "rejected",
      distanceMeters: 0,
      accuracyMeters: accuracy,
      requiresManagerApproval: false,
      message: "Mock or spoofed GPS location detected. Punch blocked.",
    };
  }

  // 2. Corporate Office Network / Wi-Fi IP bypass
  if (params.clientIp && params.officeIps && params.officeIps.length > 0) {
    const isOfficeNetwork = params.officeIps.some(
      (ip) => ip.trim() === params.clientIp?.trim()
    );
    if (isOfficeNetwork) {
      return {
        allowed: true,
        tier: "network_verified",
        status: "verified",
        distanceMeters: 0,
        accuracyMeters: 0,
        requiresManagerApproval: false,
        message: "Verified on official corporate office network.",
      };
    }
  }

  // Require coordinates if not verified via network
  if (params.userLat === undefined || params.userLng === undefined) {
    return {
      allowed: false,
      tier: "outside_geofence",
      status: "rejected",
      distanceMeters: -1,
      accuracyMeters: accuracy,
      requiresManagerApproval: false,
      message: "GPS coordinates not available.",
    };
  }

  const officeLat = params.officeLat ?? DEFAULT_OFFICE_COORDINATES.latitude;
  const officeLng = params.officeLng ?? DEFAULT_OFFICE_COORDINATES.longitude;
  const radius = params.officeRadius ?? DEFAULT_OFFICE_COORDINATES.radiusMeters;
  const maxDrift = params.maxDriftRadius ?? DEFAULT_OFFICE_COORDINATES.maxDriftRadiusMeters ?? 250;

  const distance = Math.round(haversineDistance(params.userLat, params.userLng, officeLat, officeLng));

  // 3. Strict On-Premise GPS (Within 100m and reasonable accuracy)
  if (distance <= radius && accuracy <= 50) {
    return {
      allowed: true,
      tier: "on_premise_gps",
      status: "verified",
      distanceMeters: distance,
      accuracyMeters: accuracy,
      requiresManagerApproval: false,
      message: `Verified on-premise (${distance}m from office).`,
    };
  }

  // 4. Indoor Drift Exception (Between 101m - 250m or degraded GPS accuracy indoors)
  if (distance <= maxDrift) {
    return {
      allowed: true,
      tier: "indoor_drift_exception",
      status: "drift_exception",
      distanceMeters: distance,
      accuracyMeters: accuracy,
      requiresManagerApproval: true,
      message: `Indoor drift exception logged (${distance}m from office, accuracy ±${accuracy}m). Sent to manager for confirmation.`,
    };
  }

  // 5. Far Outside Geofence
  return {
    allowed: false,
    tier: "outside_geofence",
    status: "rejected",
    distanceMeters: distance,
    accuracyMeters: accuracy,
    requiresManagerApproval: false,
    message: `Outside designated office radius (${distance}m away; maximum permitted drift is ${maxDrift}m).`,
  };
}
