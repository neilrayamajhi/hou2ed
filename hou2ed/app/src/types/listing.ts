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

// Legacy simple housing type
export type SimpleHousingType =
  | "emergency_shelter"
  | "transitional_housing"
  | "rapid_rehousing"
  | "permanent_supportive"
  | "sober_living"
  | "veterans_housing"
  | "youth_housing"
  | "domestic_violence_shelter";

// Extended housing types matching PRD
export type HousingType =
  | 'apartment'
  | 'shared_room'
  | 'private_room'
  | 'house'
  | 'hotel_motel'
  | 'shelter'
  | 'transitional'
  | 'sober_living'
  | 'medical_respite'
  | 'psychiatric_facility'
  | 'detox'
  | '5150_capable';

export type AvailabilityStatus = "available" | "full" | "waitlist" | "unknown";

export interface PriceInfo {
  min: number;
  max: number;
  isFree: boolean;
  acceptsVouchers: boolean;
}

// Unit/Bed Types
export interface UnitBeds {
  single_occupancy?: number;
  double_occupancy?: number;
  family_unit?: number;
  dormitory?: number;
  couples?: number;
}

export type UnitBedType = keyof UnitBeds;

// Gender Rooming
export type GenderRooming = 'male' | 'female' | 'co_ed' | 'family' | 'couples';

// Amenities
export interface Amenities {
  basic?: string[];
  kitchen?: string[];
  bathroom?: string[];
  technology?: string[];
  safety?: string[];
  comfort?: string[];
}

// Accessibility
export interface Accessibility {
  mobility?: string[];
  sensory?: string[];
  cognitive?: string[];
}

// Eligibility
export interface Eligibility {
  age_range?: [number, number];
  gender?: string[];
  family_status?: string[];
  veterans?: boolean;
  documentation?: string[];
  background?: string[];
  substance?: string[];
}

// Services
export interface Services {
  case_management?: boolean;
  medical?: string[];
  mental_health?: string[];
  substance?: string[];
  employment?: string[];
  education?: string[];
  life_skills?: string[];
  transportation?: string[];
}

// Rules
export interface Rules {
  curfew?: string;
  visitors?: string;
  substances?: string[];
  chores?: boolean;
  meetings?: string[];
  medication?: string;
  pets?: string;
}

// Cost
export interface Cost {
  monthly?: number;
  deposit?: number;
  program_fee?: number;
  accepts?: string[];
  sliding_scale?: boolean;
  free?: boolean;
}

// Intake
export interface Intake {
  process?: 'walk_in' | 'appointment' | 'referral' | 'waitlist';
  hours?: string;
  documents_required?: string[];
  response_time?: string;
}

// Availability
export interface Availability {
  beds_today: number;
  beds_week: number;
  waitlist: number;
  last_updated_at: string | null;
}

// Responsiveness
export interface Responsiveness {
  average_response_time?: string;
  response_rate?: number;
  last_active?: string;
}

// Provider
export interface Provider {
  id: string;
  full_name: string;
  username: string;
  is_verified: boolean;
  provider_profile?: any;
}

// Full listing from database
export interface Listing {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  lat: number;
  lng: number;
  housing_type: HousingType;
  unit_beds: UnitBeds;
  ada_beds: number;
  gender_rooming?: GenderRooming;
  amenities?: Amenities;
  accessibility?: Accessibility;
  eligibility?: Eligibility;
  services?: Services;
  rules?: Rules;
  cost?: Cost;
  intake?: Intake;
  availability: Availability;
  verified: boolean;
  certifications?: string[];
  images: string[];
  responsiveness?: Responsiveness;
  dv_sensitive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provider?: Provider;

  // Computed fields
  distance?: number; // miles from user
}

// Search result with scoring
export interface SearchResult extends Listing {
  score: number;
  reasons: string[];
  special_badges?: string[];
}

// Map bounds for geographic search
export interface LocationBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Search filters
export interface SearchFilters {
  housingType?: HousingType[];
  unitBedType?: UnitBedType[];
  amenities?: string[];
  accessibility?: string[];
  roomDetails?: string[];
  eligibility?: string[];
  supportPrograms?: string[];
  costPayment?: CostFilters;
  locationEnv?: LocationFilters;
  rulesRequirements?: string[];
  availabilityIntake?: AvailabilityFilters;
  providerQuality?: string[];
  communityLifestyle?: string[];
  advanced?: AdvancedFilters;
}

export interface CostFilters {
  maxMonthly?: number;
  freeOnly?: boolean;
  acceptsVouchers?: boolean;
}

export interface AvailabilityFilters {
  immediateOnly?: boolean;
  acceptingApplications?: boolean;
  noWaitlist?: boolean;
}

export interface LocationFilters {
  city?: string;
  zipCode?: string;
  maxDistance?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface AdvancedFilters {
  keywords?: string;
  excludeKeywords?: string;
  updatedWithinDays?: number;
  verifiedOnly?: boolean;
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