/**
 * Listing types for housing placements
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export type HousingType =
  | "emergency_shelter"
  | "transitional_housing"
  | "rapid_rehousing"
  | "permanent_supportive"
  | "sober_living"
  | "veterans_housing"
  | "youth_housing"
  | "domestic_violence_shelter";

export type AvailabilityStatus = "available" | "full" | "waitlist" | "unknown";

export interface PriceInfo {
  min: number;
  max: number;
  isFree: boolean;
  acceptsVouchers: boolean;
}

export interface Listing {
  id: string;
  name: string;
  type: HousingType;
  description: string;
  coverImage?: string;
  images?: string[];
  coordinates: Coordinates;
  address: Address;
  distance?: number; // miles from user
  price: PriceInfo;
  availability: AvailabilityStatus;
  bedsAvailable: number;
  totalBeds: number;
  amenities: string[];
  requirements: string[];
  features: {
    acceptsFamilies: boolean;
    acceptsVeterans: boolean;
    acceptsSingleMen: boolean;
    acceptsSingleWomen: boolean;
    petsAllowed: boolean;
    wheelchairAccessible: boolean;
    lgbtqFriendly: boolean;
  };
  contact: {
    phone: string;
    email?: string;
    hours?: string;
  };
  rating?: number;
  reviewCount?: number;
  lastUpdated: string;
  provider: string;
  verified: boolean;
}

export interface SearchMeta {
  total: number;
  showing: number;
  hasMore: boolean;
  searchId: string;
}

export interface SearchResults {
  items: Listing[];
  meta: SearchMeta;
}