/**
 * Application-wide constants
 */

// Image placeholders
export const PLACEHOLDER_IMAGE =
  "https://via.placeholder.com/400x300/000000/666666?text=No+Image";
export const PLACEHOLDER_AVATAR =
  "https://via.placeholder.com/150x150/000000/666666?text=No+Avatar";

// API timeouts (in milliseconds)
export const DEFAULT_TIMEOUT = 30000;
export const UPLOAD_TIMEOUT = 120000;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

// Map constants
export const DEFAULT_MAP_REGION = {
  latitude: 34.0522, // Los Angeles
  longitude: -118.2437,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

// Refresh intervals (in milliseconds)
export const AVAILABILITY_REFRESH_INTERVAL = 60000; // 1 minute
export const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds

// Stale data thresholds (in hours)
export const STALE_DATA_THRESHOLD_HOURS = 48;
export const CRITICAL_STALE_THRESHOLD_HOURS = 168; // 1 week

// Facility badge types
export const FACILITY_BADGES = {
  "5150": "5150 Capable",
  respite: "Medical Respite",
  detox: "Detox",
} as const;

export type FacilityBadgeType = keyof typeof FACILITY_BADGES;
