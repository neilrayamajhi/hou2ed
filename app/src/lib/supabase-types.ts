/**
 * Comprehensive Supabase database types
 * Generated from the schema and includes all tables, views, and functions
 */

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          email: string;
          full_name: string;
          username: string;
          role: "seeker" | "provider" | "admin";
          phone?: string;
          avatar_url?: string;
          is_verified: boolean;
          push_notifications_enabled: boolean;
          email_notifications_enabled: boolean;
          
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          email: string;
          full_name: string;
          username: string;
          role: "seeker" | "provider" | "admin";
          phone?: string;
          avatar_url?: string;
          is_verified?: boolean;
          push_notifications_enabled?: boolean;
          email_notifications_enabled?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          email?: string;
          full_name?: string;
          username?: string;
          role?: "seeker" | "provider" | "admin";
          phone?: string;
          avatar_url?: string;
          is_verified?: boolean;
          push_notifications_enabled?: boolean;
          email_notifications_enabled?: boolean;
        };
      };
      providers: {
        Row: {
          id: string;
          user_id: string;
          organization_name: string;
          organization_type: string;
          contact_email: string;
          contact_phone: string;
          website?: string;
          tax_id?: string;
          verified: boolean;
          verified_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_name: string;
          organization_type: string;
          contact_email: string;
          contact_phone: string;
          website?: string;
          tax_id?: string;
          verified?: boolean;
          verified_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_name?: string;
          organization_type?: string;
          contact_email?: string;
          contact_phone?: string;
          website?: string;
          tax_id?: string;
          verified?: boolean;
          verified_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: string;
          provider_id: string;
          title: string;
          description?: string;
          housing_type:
            | "emergency"
            | "transitional"
            | "permanent_supportive"
            | "rapid_rehousing"
            | "shelter";
          unit_beds: "single" | "shared" | "family" | "dorm";
          beds_available_today: number;
          beds_available_this_week: number;
          waitlist_days?: number;
          monthly_rent?: number;
          security_deposit?: number;
          utilities_included: boolean;
          pets_allowed: boolean;
          accessibility_features?: string[];
          amenities?: string[];
          requirements?: string[];
          application_process?: string;
          coordinates?: { lat: number; lng: number };
          address?: string;
          city: string;
          state: string;
          zip_code?: string;
          contact_phone?: string;
          contact_email?: string;
          photos?: string[];
          domestic_violence_focus: boolean;
          active: boolean;
          intake?: {
            documents_required?: Array<{
              id: string;
              label: string;
              description?: string;
              required: boolean;
              category?:
                | "identification"
                | "financial"
                | "medical"
                | "reference"
                | "legal"
                | "custom"
                | "other";
            }>;
          };
          created_at: string;
          updated_at: string;
          last_confirmed: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          title: string;
          description?: string;
          housing_type:
            | "emergency"
            | "transitional"
            | "permanent_supportive"
            | "rapid_rehousing"
            | "shelter";
          unit_beds: "single" | "shared" | "family" | "dorm";
          beds_available_today?: number;
          beds_available_this_week?: number;
          waitlist_days?: number;
          monthly_rent?: number;
          security_deposit?: number;
          utilities_included?: boolean;
          pets_allowed?: boolean;
          accessibility_features?: string[];
          amenities?: string[];
          requirements?: string[];
          application_process?: string;
          coordinates?: { lat: number; lng: number };
          address?: string;
          city: string;
          state: string;
          zip_code?: string;
          contact_phone?: string;
          contact_email?: string;
          photos?: string[];
          domestic_violence_focus?: boolean;
          active?: boolean;
          intake?: {
            documents_required?: Array<{
              id: string;
              label: string;
              description?: string;
              required: boolean;
              category?:
                | "identification"
                | "financial"
                | "medical"
                | "reference"
                | "legal"
                | "custom"
                | "other";
            }>;
          };
          created_at?: string;
          updated_at?: string;
          last_confirmed?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          name?: string;
          description?: string;
          housing_type?:
            | "emergency"
            | "transitional"
            | "permanent_supportive"
            | "rapid_rehousing"
            | "shelter";
          unit_beds?: "single" | "shared" | "family" | "dorm";
          beds_available_today?: number;
          beds_available_this_week?: number;
          waitlist_days?: number;
          monthly_rent?: number;
          security_deposit?: number;
          utilities_included?: boolean;
          pets_allowed?: boolean;
          accessibility_features?: string[];
          amenities?: string[];
          requirements?: string[];
          application_process?: string;
          coordinates?: { lat: number; lng: number };
          address?: string;
          district?: string;
          island?:
            | "Oahu"
            | "Maui"
            | "BigIsland"
            | "Kauai"
            | "Molokai"
            | "Lanai";
          contact_phone?: string;
          contact_email?: string;
          photos?: string[];
          domestic_violence_focus?: boolean;
          active?: boolean;
          intake?: {
            documents_required?: Array<{
              id: string;
              label: string;
              description?: string;
              required: boolean;
              category?:
                | "identification"
                | "financial"
                | "medical"
                | "reference"
                | "legal"
                | "custom"
                | "other";
            }>;
          };
          created_at?: string;
          updated_at?: string;
          last_confirmed?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          listing_id: string;
          seeker_id: string;
          status:
            | "draft"
            | "new"
            | "submitted"
            | "docs_needed"
            | "under_review"
            | "interview_scheduled"
            | "approved"
            | "rejected"
            | "waitlisted"
            | "withdrawn";
          urgency_level: "low" | "medium" | "high" | "critical";
          household_size: number;
          has_dependents: boolean;
          employment_status?: string;
          monthly_income?: number;
          veteran_status: boolean;
          disability_status: boolean;
          criminal_history: boolean;
          eviction_history: boolean;
          additional_info?: string;
          seeker_notes?: string;
          provider_notes?: string;
          submitted_at?: string;
          reviewed_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          seeker_id: string;
          status?:
            | "draft"
            | "new"
            | "submitted"
            | "docs_needed"
            | "under_review"
            | "interview_scheduled"
            | "approved"
            | "rejected"
            | "waitlisted"
            | "withdrawn";
          urgency_level?: "low" | "medium" | "high" | "critical";
          household_size?: number;
          has_dependents?: boolean;
          employment_status?: string;
          monthly_income?: number;
          veteran_status?: boolean;
          disability_status?: boolean;
          criminal_history?: boolean;
          eviction_history?: boolean;
          additional_info?: string;
          seeker_notes?: string;
          provider_notes?: string;
          submitted_at?: string;
          reviewed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          seeker_id?: string;
          status?:
            | "draft"
            | "new"
            | "submitted"
            | "docs_needed"
            | "under_review"
            | "interview_scheduled"
            | "approved"
            | "rejected"
            | "waitlisted"
            | "withdrawn";
          urgency_level?: "low" | "medium" | "high" | "critical";
          household_size?: number;
          has_dependents?: boolean;
          employment_status?: string;
          monthly_income?: number;
          veteran_status?: boolean;
          disability_status?: boolean;
          criminal_history?: boolean;
          eviction_history?: boolean;
          additional_info?: string;
          seeker_notes?: string;
          provider_notes?: string;
          submitted_at?: string;
          reviewed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      application_documents: {
        Row: {
          id: string;
          application_id: string;
          document_type:
            | "id"
            | "income"
            | "employment"
            | "reference"
            | "medical"
            | "other";
          document_url: string;
          document_name: string;
          uploaded_by: string;
          uploaded_at: string;
          verified: boolean;
          verified_by?: string;
          verified_at?: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          document_type:
            | "id"
            | "income"
            | "employment"
            | "reference"
            | "medical"
            | "other";
          document_url: string;
          document_name: string;
          uploaded_by: string;
          uploaded_at?: string;
          verified?: boolean;
          verified_by?: string;
          verified_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          document_type?:
            | "id"
            | "income"
            | "employment"
            | "reference"
            | "medical"
            | "other";
          document_url?: string;
          document_name?: string;
          uploaded_by?: string;
          uploaded_at?: string;
          verified?: boolean;
          verified_by?: string;
          verified_at?: string;
        };
      };
      message_threads: {
        Row: {
          id: string;
          subject?: string;
          participant_ids: string[];
          listing_id?: string;
          application_id?: string;
          last_message_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject?: string;
          participant_ids: string[];
          listing_id?: string;
          application_id?: string;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject?: string;
          participant_ids?: string[];
          listing_id?: string;
          application_id?: string;
          last_message_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          body: string;
          attachment_urls?: string[];
          read_by: string[];
          edited_at?: string;
          deleted_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          body: string;
          attachment_urls?: string[];
          read_by?: string[];
          edited_at?: string;
          deleted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          body?: string;
          attachment_urls?: string[];
          read_by?: string[];
          edited_at?: string;
          deleted_at?: string;
          created_at?: string;
        };
      };
      saved_listings: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          notes?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          listing_id?: string;
          notes?: string;
          created_at?: string;
        };
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description?: string;
          filters: any; // JSON type for search filters
          notification_enabled: boolean;
          notification_frequency?: "instant" | "daily" | "weekly";
          last_notified_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          filters: any;
          notification_enabled?: boolean;
          notification_frequency?: "instant" | "daily" | "weekly";
          last_notified_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          filters?: any;
          notification_enabled?: boolean;
          notification_frequency?: "instant" | "daily" | "weekly";
          last_notified_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      saved_search_alerts: {
        Row: {
          id: string;
          search_id: string;
          user_id: string;
          listing_id: string;
          alert_type: "new_match" | "availability_update" | "price_change";
          message: string;
          seen: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          search_id: string;
          user_id: string;
          listing_id: string;
          alert_type?: "new_match" | "availability_update" | "price_change";
          message: string;
          seen?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          search_id?: string;
          user_id?: string;
          listing_id?: string;
          alert_type?: "new_match" | "availability_update" | "price_change";
          message?: string;
          seen?: boolean;
          created_at?: string;
        };
      };
      availability_history: {
        Row: {
          id: string;
          listing_id: string;
          provider_id: string;
          beds_available_today?: number;
          beds_available_this_week?: number;
          waitlist_days?: number;
          change_type: "created" | "updated" | "confirmed";
          changes?: any; // JSON array of changes
          notes?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          provider_id: string;
          beds_available_today?: number;
          beds_available_this_week?: number;
          waitlist_days?: number;
          change_type: "created" | "updated" | "confirmed";
          changes?: any;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          provider_id?: string;
          beds_available_today?: number;
          beds_available_this_week?: number;
          waitlist_days?: number;
          change_type?: "created" | "updated" | "confirmed";
          changes?: any;
          notes?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      public_listings: {
        Row: {
          id: string;
          provider_id: string;
          title: string;
          description?: string;
          housing_type: string;
          unit_beds: string;
          beds_available_today: number;
          beds_available_this_week: number;
          waitlist_days?: number;
          monthly_rent?: number;
          security_deposit?: number;
          utilities_included: boolean;
          pets_allowed: boolean;
          accessibility_features?: string[];
          amenities?: string[];
          requirements?: string[];
          application_process?: string;
          coordinates?: { lat: number; lng: number };
          address?: string;
          district: string;
          island: string;
          location_note?: string;
          contact_phone?: string;
          contact_email?: string;
          active: boolean;
          created_at: string;
          updated_at: string;
          last_confirmed: string;
        };
      };
    };
    Functions: {
      fn_search_listings: {
        Args: {
          p_user_location?: { lat: number; lng: number };
          p_housing_type?: string;
          p_unit_beds?: string;
          p_min_price?: number;
          p_max_price?: number;
          p_island?: string;
          p_district?: string;
          p_pets_allowed?: boolean;
          p_accessibility?: boolean;
          p_has_availability?: boolean;
          p_include_dv?: boolean;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          listing_id: string;
          provider_id: string;
          title: string;
          description: string;
          housing_type: string;
          unit_beds: string;
          beds_available_today: number;
          beds_available_this_week: number;
          waitlist_days: number;
          monthly_rent: number;
          security_deposit: number;
          utilities_included: boolean;
          pets_allowed: boolean;
          accessibility_features: string[];
          amenities: string[];
          requirements: string[];
          application_process: string;
          coordinates: any;
          address: string;
          district: string;
          island: string;
          contact_phone: string;
          contact_email: string;
          photos: string[];
          active: boolean;
          created_at: string;
          updated_at: string;
          distance_miles: number;
          relevance_score: number;
        }[];
      };
      fn_update_availability: {
        Args: {
          p_listing_id: string;
          p_beds_today?: number;
          p_beds_week?: number;
          p_waitlist_days?: number;
          p_confirm_only?: boolean;
        };
        Returns: {
          success: boolean;
          message?: string;
          error?: string;
          data?: {
            listing_id: string;
            beds_today: number;
            beds_week: number;
            waitlist_days: number;
            last_confirmed: string;
            confirmed_at?: string;
            changes?: any[];
          };
        };
      };
      fn_check_saved_search_alerts: {
        Args: {
          p_listing_id: string;
        };
        Returns: void;
      };
      is_admin: {
        Args: {};
        Returns: boolean;
      };
      is_provider: {
        Args: {};
        Returns: boolean;
      };
      get_provider_id: {
        Args: {};
        Returns: string;
      };
      can_view_dv_listing: {
        Args: {
          listing_id: string;
        };
        Returns: boolean;
      };
    };
  };
};

// Export specific table types for convenience
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Provider = Database["public"]["Tables"]["providers"]["Row"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationDocument =
  Database["public"]["Tables"]["application_documents"]["Row"];
export type MessageThread =
  Database["public"]["Tables"]["message_threads"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type SavedListing =
  Database["public"]["Tables"]["saved_listings"]["Row"];
export type SavedSearch = Database["public"]["Tables"]["saved_searches"]["Row"];
export type SavedSearchAlert =
  Database["public"]["Tables"]["saved_search_alerts"]["Row"];
export type AvailabilityHistory =
  Database["public"]["Tables"]["availability_history"]["Row"];

// Insert types
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProviderInsert =
  Database["public"]["Tables"]["providers"]["Insert"];
export type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
export type ApplicationInsert =
  Database["public"]["Tables"]["applications"]["Insert"];
export type ApplicationDocumentInsert =
  Database["public"]["Tables"]["application_documents"]["Insert"];
export type MessageThreadInsert =
  Database["public"]["Tables"]["message_threads"]["Insert"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
export type SavedListingInsert =
  Database["public"]["Tables"]["saved_listings"]["Insert"];
export type SavedSearchInsert =
  Database["public"]["Tables"]["saved_searches"]["Insert"];
export type SavedSearchAlertInsert =
  Database["public"]["Tables"]["saved_search_alerts"]["Insert"];
export type AvailabilityHistoryInsert =
  Database["public"]["Tables"]["availability_history"]["Insert"];

// Update types
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type ProviderUpdate =
  Database["public"]["Tables"]["providers"]["Update"];
export type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];
export type ApplicationUpdate =
  Database["public"]["Tables"]["applications"]["Update"];
export type ApplicationDocumentUpdate =
  Database["public"]["Tables"]["application_documents"]["Update"];
export type MessageThreadUpdate =
  Database["public"]["Tables"]["message_threads"]["Update"];
export type MessageUpdate = Database["public"]["Tables"]["messages"]["Update"];
export type SavedListingUpdate =
  Database["public"]["Tables"]["saved_listings"]["Update"];
export type SavedSearchUpdate =
  Database["public"]["Tables"]["saved_searches"]["Update"];
export type SavedSearchAlertUpdate =
  Database["public"]["Tables"]["saved_search_alerts"]["Update"];
export type AvailabilityHistoryUpdate =
  Database["public"]["Tables"]["availability_history"]["Update"];

// View types
export type PublicListing =
  Database["public"]["Views"]["public_listings"]["Row"];

// Function return types
export type SearchResult =
  Database["public"]["Functions"]["fn_search_listings"]["Returns"][0];
export type AvailabilityResult =
  Database["public"]["Functions"]["fn_update_availability"]["Returns"];
