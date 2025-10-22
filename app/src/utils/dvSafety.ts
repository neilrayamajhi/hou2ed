/**
 * DV Safety Utilities
 * Handles location obfuscation and safety measures for domestic violence sensitive listings
 *
 * Per PRD Section B3.2 & B5:
 * - Hide precise locations for DV-sensitive listings
 * - Obfuscate coordinates to city-level precision
 * - Show "Sensitive location - hidden for safety" message
 * - Only authorized users (providers, admins, approved applicants) can see full details
 */

import { useAuthStore } from '../state/useAuthStore';

export interface DVSafeLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lng: number;
  isObfuscated: boolean;
}

export interface DVAccessPermissions {
  canViewFullAddress: boolean;
  canViewExactLocation: boolean;
  canContact: boolean;
  reason: string;
}

/**
 * Check if current user can view DV-sensitive details
 */
export function checkDVAccess(
  listing: {
    dv_sensitive?: boolean;
    provider_id?: string;
  },
  userId?: string,
  userRole?: string,
  hasApprovedApplication?: boolean
): DVAccessPermissions {
  // Non-DV listings are always fully visible
  if (!listing.dv_sensitive) {
    return {
      canViewFullAddress: true,
      canViewExactLocation: true,
      canContact: true,
      reason: 'Not a DV-sensitive listing',
    };
  }

  // Check user permissions
  if (!userId) {
    return {
      canViewFullAddress: false,
      canViewExactLocation: false,
      canContact: false,
      reason: 'Authentication required for DV-sensitive listings',
    };
  }

  // Provider owns the listing
  if (listing.provider_id === userId) {
    return {
      canViewFullAddress: true,
      canViewExactLocation: true,
      canContact: true,
      reason: 'Provider owns this listing',
    };
  }

  // Admin users
  if (userRole === 'admin') {
    return {
      canViewFullAddress: true,
      canViewExactLocation: true,
      canContact: true,
      reason: 'Admin access granted',
    };
  }

  // User has approved application
  if (hasApprovedApplication) {
    return {
      canViewFullAddress: true,
      canViewExactLocation: true,
      canContact: true,
      reason: 'Approved application for this listing',
    };
  }

  // Default: Hide DV-sensitive information
  return {
    canViewFullAddress: false,
    canViewExactLocation: false,
    canContact: false,
    reason: 'DV-sensitive listing - referral required',
  };
}

/**
 * Obfuscate location for DV-sensitive listings
 * Rounds coordinates to ~7 miles precision (0.1 degree)
 */
export function obfuscateLocation(
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    lat: number;
    lng: number;
  },
  permissions: DVAccessPermissions
): DVSafeLocation {
  if (permissions.canViewExactLocation) {
    return {
      ...location,
      isObfuscated: false,
    };
  }

  return {
    address: permissions.canViewFullAddress
      ? location.address
      : `${location.city}, ${location.state} area`,
    city: location.city,
    state: location.state,
    zipCode: permissions.canViewFullAddress
      ? location.zipCode
      : location.zipCode.substring(0, 3) + 'XX',
    lat: Math.round(location.lat * 10) / 10, // Round to 0.1 degree (~7 miles)
    lng: Math.round(location.lng * 10) / 10,
    isObfuscated: true,
  };
}

/**
 * Get safe contact information for DV-sensitive listings
 */
export function getSafeContactInfo(
  listing: {
    dv_sensitive?: boolean;
    intake?: {
      phone?: string;
      email?: string;
      hours?: string;
      referralRequired?: boolean;
    };
  },
  permissions: DVAccessPermissions
) {
  if (!listing.dv_sensitive || permissions.canContact) {
    return listing.intake;
  }

  // Return referral-only contact info for DV listings
  return {
    phone: '211', // Universal helpline
    email: null,
    hours: 'Call 211 for referral',
    referralRequired: true,
    message: 'Contact information protected for safety. Call 211 for referral.',
  };
}

/**
 * Format address for display based on DV sensitivity
 */
export function formatSafeAddress(
  location: DVSafeLocation,
  showSafetyNotice: boolean = true
): string {
  if (!location.isObfuscated) {
    return location.address;
  }

  const baseAddress = `${location.city}, ${location.state} area`;

  if (showSafetyNotice) {
    return `${baseAddress} (Location hidden for safety)`;
  }

  return baseAddress;
}

/**
 * Get safety notice for DV-sensitive listings
 */
export function getDVSafetyNotice(isDVSensitive: boolean): string | null {
  if (!isDVSensitive) return null;

  return 'This is a confidential location for safety reasons. Exact address will be provided after referral approval.';
}

/**
 * Check if coordinates should be shown on map
 */
export function shouldShowOnMap(
  listing: {
    dv_sensitive?: boolean;
    coordinates?: { lat: number; lng: number };
  },
  permissions: DVAccessPermissions
): boolean {
  if (!listing.dv_sensitive) return true;
  if (!listing.coordinates) return false;

  // Only show on map if user has permission OR if showing obfuscated location
  return permissions.canViewExactLocation || true; // Always show, but obfuscated if needed
}

/**
 * Get map marker style based on DV sensitivity
 */
export function getDVMapMarkerStyle(
  isDVSensitive: boolean,
  hasPermission: boolean
) {
  if (!isDVSensitive || hasPermission) {
    return {
      opacity: 1,
      scale: 1,
    };
  }

  // Make DV markers more subtle/generic
  return {
    opacity: 0.7,
    scale: 0.9,
  };
}

/**
 * Hook to use DV safety features
 */
export function useDVSafety(listing: any) {
  const { user } = useAuthStore();

  const permissions = checkDVAccess(
    listing,
    user?.id,
    user?.role,
    false // TODO: Check if user has approved application
  );

  const safeLocation = listing.coordinates
    ? obfuscateLocation(
        {
          address: listing.address,
          city: listing.city,
          state: listing.state,
          zipCode: listing.zipCode,
          lat: listing.coordinates.lat,
          lng: listing.coordinates.lng,
        },
        permissions
      )
    : null;

  const safeContactInfo = getSafeContactInfo(listing, permissions);
  const safetyNotice = getDVSafetyNotice(listing.dv_sensitive);

  return {
    permissions,
    safeLocation,
    safeContactInfo,
    safetyNotice,
    isObfuscated: safeLocation?.isObfuscated || false,
  };
}

export default {
  checkDVAccess,
  obfuscateLocation,
  getSafeContactInfo,
  formatSafeAddress,
  getDVSafetyNotice,
  shouldShowOnMap,
  getDVMapMarkerStyle,
  useDVSafety,
};