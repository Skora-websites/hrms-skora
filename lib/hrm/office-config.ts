import { getDb } from "@/lib/db/mongo-helper";

export interface OfficeConfig {
  latitude: number;
  longitude: number;
  geofenceRadius: number;
}

const DEFAULT_OFFICE: OfficeConfig = {
  latitude: 28.6007594,
  longitude: 77.4319307,
  geofenceRadius: 100,
};

/**
 * Resolve the active office geofence from the same settings sources used by
 * the HRMS tenant configuration endpoint. Keeping this server-side prevents
 * attendance tracking from silently using a different office than the UI.
 */
export async function getOfficeConfig(): Promise<OfficeConfig> {
  const config = { ...DEFAULT_OFFICE };

  try {
    const db = await getDb();
    if (!db) return config;

    const settingsDoc = await db.collection("settings").findOne({
      key: "super_admin_system",
    });

    const settings = settingsDoc?.settings || {};
    const office = settings.office || settings.officeLocation || {};

    const geofence = settings.geofence || {};
    const latitude = office.latitude ?? settings.officeLatitude ?? geofence.latitude;
    const longitude = office.longitude ?? settings.officeLongitude ?? geofence.longitude;
    const radius = office.geofenceRadius ?? settings.geofenceRadius ?? settings.officeRules?.geofenceRadius ?? geofence.radius;

    if (typeof latitude === "number" && Number.isFinite(latitude)) {
      config.latitude = latitude;
    }
    if (typeof longitude === "number" && Number.isFinite(longitude)) {
      config.longitude = longitude;
    }
    if (typeof radius === "number" && Number.isFinite(radius) && radius > 0) {
      config.geofenceRadius = radius;
    }
  } catch {
    // Safe fallback for an unavailable/misconfigured settings document.
  }

  return config;
}
