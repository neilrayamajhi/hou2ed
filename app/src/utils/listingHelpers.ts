/**
 * Listing utility functions
 *
 * Helper functions for working with listings across the app
 */

/**
 * Check if a listing ID or provider ID is from OpenStreetMap
 *
 * OSM listings are community resources pulled from OpenStreetMap data.
 * They have IDs in the format "osm-{number}" instead of UUIDs.
 *
 * @param id - The listing ID or provider ID to check
 * @returns true if this is an OSM listing, false otherwise
 *
 * @example
 * isOSMListing("osm-1043250060") // true
 * isOSMListing("550e8400-e29b-41d4-a716-446655440000") // false
 * isOSMListing(null) // false
 */
export function isOSMListing(id: string | null | undefined): boolean {
  if (!id) return false;
  return typeof id === 'string' && id.startsWith('osm-');
}
