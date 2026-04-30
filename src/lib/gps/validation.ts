/**
 * Haversine formula: calculate distance between two GPS coordinates in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Check if a position is within a workplace's geofence
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  workplaceLat: number,
  workplaceLon: number,
  radiusMeters: number = 100
): boolean {
  const distance = haversineDistance(userLat, userLon, workplaceLat, workplaceLon);
  return distance <= radiusMeters;
}

/**
 * Find the nearest workplace from a list
 */
export function findNearestWorkplace<
  T extends { latitude: number; longitude: number; radius_meters: number }
>(
  userLat: number,
  userLon: number,
  workplaces: T[]
): { workplace: T; distance: number; isWithin: boolean } | null {
  if (workplaces.length === 0) return null;

  let nearest: { workplace: T; distance: number; isWithin: boolean } | null = null;

  for (const wp of workplaces) {
    const distance = haversineDistance(userLat, userLon, wp.latitude, wp.longitude);
    const isWithin = distance <= wp.radius_meters;

    if (!nearest || distance < nearest.distance) {
      nearest = { workplace: wp, distance, isWithin };
    }
  }

  return nearest;
}
