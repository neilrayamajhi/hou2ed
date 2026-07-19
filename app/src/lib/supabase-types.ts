export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      applications: {
        Row: {
          application_data: Json | null;
          created_at: string | null;
          deleted_at: string | null;
          id: string;
          last_notified_status: string | null;
          listing_id: string;
          notes: string | null;
          seeker_id: string;
          stage_timestamps: Json | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          application_data?: Json | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          last_notified_status?: string | null;
          listing_id: string;
          notes?: string | null;
          seeker_id: string;
          stage_timestamps?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          application_data?: Json | null;
          created_at?: string | null;
          deleted_at?: string | null;
          id?: string;
          last_notified_status?: string | null;
          listing_id?: string;
          notes?: string | null;
          seeker_id?: string;
          stage_timestamps?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "applications_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_seeker_id_fkey";
            columns: ["seeker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_seeker_id_fkey";
            columns: ["seeker_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      availability_history: {
        Row: {
          beds_available_this_week: number | null;
          beds_available_today: number | null;
          change_type: string;
          changes: Json | null;
          created_at: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          provider_id: string;
          waitlist_days: number | null;
        };
        Insert: {
          beds_available_this_week?: number | null;
          beds_available_today?: number | null;
          change_type: string;
          changes?: Json | null;
          created_at?: string | null;
          id?: string;
          listing_id: string;
          notes?: string | null;
          provider_id: string;
          waitlist_days?: number | null;
        };
        Update: {
          beds_available_this_week?: number | null;
          beds_available_today?: number | null;
          change_type?: string;
          changes?: Json | null;
          created_at?: string | null;
          id?: string;
          listing_id?: string;
          notes?: string | null;
          provider_id?: string;
          waitlist_days?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "availability_history_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_history_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_history_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_history_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string | null;
          id: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id?: string;
          created_at?: string | null;
          id?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          application_id: string;
          created_at: string | null;
          file_name: string | null;
          file_path: string | null;
          file_size: number | null;
          file_url: string | null;
          id: string;
          notes: string | null;
          status: string | null;
          type: string;
          updated_at: string | null;
          uploaded_at: string | null;
          uploaded_by: string | null;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          application_id: string;
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          file_url?: string | null;
          id?: string;
          notes?: string | null;
          status?: string | null;
          type: string;
          updated_at?: string | null;
          uploaded_at?: string | null;
          uploaded_by?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          application_id?: string;
          created_at?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          file_url?: string | null;
          id?: string;
          notes?: string | null;
          status?: string | null;
          type?: string;
          updated_at?: string | null;
          uploaded_at?: string | null;
          uploaded_by?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      dv_access_log: {
        Row: {
          access_type: string | null;
          accessed_at: string | null;
          id: string;
          ip_address: unknown;
          listing_id: string | null;
          user_agent: string | null;
          user_id: string | null;
          user_role: string | null;
        };
        Insert: {
          access_type?: string | null;
          accessed_at?: string | null;
          id?: string;
          ip_address?: unknown;
          listing_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          user_role?: string | null;
        };
        Update: {
          access_type?: string | null;
          accessed_at?: string | null;
          id?: string;
          ip_address?: unknown;
          listing_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          user_role?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dv_access_log_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dv_access_log_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dv_access_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dv_access_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      geocoding_cache: {
        Row: {
          address_hash: string | null;
          components: Json | null;
          confidence: number | null;
          created_at: string;
          id: string;
          lat: number;
          lng: number;
          normalized_address: string;
          place_id: string | null;
          provider: string;
          updated_at: string;
        };
        Insert: {
          address_hash?: string | null;
          components?: Json | null;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          lat: number;
          lng: number;
          normalized_address: string;
          place_id?: string | null;
          provider?: string;
          updated_at?: string;
        };
        Update: {
          address_hash?: string | null;
          components?: Json | null;
          confidence?: number | null;
          created_at?: string;
          id?: string;
          lat?: number;
          lng?: number;
          normalized_address?: string;
          place_id?: string | null;
          provider?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          accessibility: Json | null;
          ada_beds: number | null;
          address: string;
          amenities: Json | null;
          availability: Json | null;
          certifications: Json | null;
          city: string;
          cost: Json | null;
          created_at: string | null;
          description: string;
          dv_sensitive: boolean | null;
          eligibility: Json | null;
          gender_rooming: string | null;
          housing_type: string;
          id: string;
          images: string[] | null;
          intake: Json | null;
          is_active: boolean | null;
          last_confirmed: string | null;
          lat: number;
          lng: number;
          location: unknown;
          provider_id: string;
          responsiveness: Json | null;
          rules: Json | null;
          services: Json | null;
          source: string | null;
          state: string;
          title: string;
          unit_beds: Json;
          updated_at: string | null;
          verified: boolean | null;
          zip_code: string;
        };
        Insert: {
          accessibility?: Json | null;
          ada_beds?: number | null;
          address: string;
          amenities?: Json | null;
          availability?: Json | null;
          certifications?: Json | null;
          city?: string;
          cost?: Json | null;
          created_at?: string | null;
          description?: string;
          dv_sensitive?: boolean | null;
          eligibility?: Json | null;
          gender_rooming?: string | null;
          housing_type?: string;
          id?: string;
          images?: string[] | null;
          intake?: Json | null;
          is_active?: boolean | null;
          last_confirmed?: string | null;
          lat?: number;
          lng?: number;
          location?: unknown;
          provider_id: string;
          responsiveness?: Json | null;
          rules?: Json | null;
          services?: Json | null;
          source?: string | null;
          state?: string;
          title: string;
          unit_beds?: Json;
          updated_at?: string | null;
          verified?: boolean | null;
          zip_code?: string;
        };
        Update: {
          accessibility?: Json | null;
          ada_beds?: number | null;
          address?: string;
          amenities?: Json | null;
          availability?: Json | null;
          certifications?: Json | null;
          city?: string;
          cost?: Json | null;
          created_at?: string | null;
          description?: string;
          dv_sensitive?: boolean | null;
          eligibility?: Json | null;
          gender_rooming?: string | null;
          housing_type?: string;
          id?: string;
          images?: string[] | null;
          intake?: Json | null;
          is_active?: boolean | null;
          last_confirmed?: string | null;
          lat?: number;
          lng?: number;
          location?: unknown;
          provider_id?: string;
          responsiveness?: Json | null;
          rules?: Json | null;
          services?: Json | null;
          source?: string | null;
          state?: string;
          title?: string;
          unit_beds?: Json;
          updated_at?: string | null;
          verified?: boolean | null;
          zip_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      message_threads: {
        Row: {
          application_id: string | null;
          created_at: string | null;
          id: string;
          last_message_at: string | null;
          listing_id: string | null;
          participant_ids: string[];
          subject: string | null;
          updated_at: string | null;
        };
        Insert: {
          application_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          listing_id?: string | null;
          participant_ids: string[];
          subject?: string | null;
          updated_at?: string | null;
        };
        Update: {
          application_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          listing_id?: string | null;
          participant_ids?: string[];
          subject?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "message_threads_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_threads_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_threads_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          application_id: string | null;
          attachment_urls: string[] | null;
          body: string;
          content: string;
          created_at: string | null;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          is_read: boolean | null;
          read_by: string[] | null;
          sender_id: string;
          thread_id: string | null;
        };
        Insert: {
          application_id?: string | null;
          attachment_urls?: string[] | null;
          body?: string;
          content: string;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          read_by?: string[] | null;
          sender_id: string;
          thread_id?: string | null;
        };
        Update: {
          application_id?: string | null;
          attachment_urls?: string[] | null;
          body?: string;
          content?: string;
          created_at?: string | null;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          read_by?: string[] | null;
          sender_id?: string;
          thread_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "message_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          banned_at: string | null;
          banned_by: string | null;
          banned_reason: string | null;
          created_at: string | null;
          email: string | null;
          email_notifications_enabled: boolean | null;
          expo_push_token: string | null;
          full_name: string | null;
          id: string;
          is_banned: boolean;
          is_verified: boolean | null;
          notification_time: string | null;
          phone: string | null;
          provider_profile: Json | null;
          push_notifications_enabled: boolean | null;
          push_token: string | null;
          role: string | null;
          seeker_profile: Json | null;
          updated_at: string | null;
          username: string | null;
          verification_documents: Json | null;
          verification_status: string | null;
          verified_provider: boolean | null;
        };
        Insert: {
          avatar_url?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          banned_reason?: string | null;
          created_at?: string | null;
          email?: string | null;
          email_notifications_enabled?: boolean | null;
          expo_push_token?: string | null;
          full_name?: string | null;
          id: string;
          is_banned?: boolean;
          is_verified?: boolean | null;
          notification_time?: string | null;
          phone?: string | null;
          provider_profile?: Json | null;
          push_notifications_enabled?: boolean | null;
          push_token?: string | null;
          role?: string | null;
          seeker_profile?: Json | null;
          updated_at?: string | null;
          username?: string | null;
          verification_documents?: Json | null;
          verification_status?: string | null;
          verified_provider?: boolean | null;
        };
        Update: {
          avatar_url?: string | null;
          banned_at?: string | null;
          banned_by?: string | null;
          banned_reason?: string | null;
          created_at?: string | null;
          email?: string | null;
          email_notifications_enabled?: boolean | null;
          expo_push_token?: string | null;
          full_name?: string | null;
          id?: string;
          is_banned?: boolean;
          is_verified?: boolean | null;
          notification_time?: string | null;
          phone?: string | null;
          provider_profile?: Json | null;
          push_notifications_enabled?: boolean | null;
          push_token?: string | null;
          role?: string | null;
          seeker_profile?: Json | null;
          updated_at?: string | null;
          username?: string | null;
          verification_documents?: Json | null;
          verification_status?: string | null;
          verified_provider?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_banned_by_fkey";
            columns: ["banned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_banned_by_fkey";
            columns: ["banned_by"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          reason: string;
          reported_user_id: string;
          reporter_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          thread_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason: string;
          reported_user_id: string;
          reporter_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          thread_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string;
          reported_user_id?: string;
          reporter_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          thread_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey";
            columns: ["reported_user_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "message_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_listings: {
        Row: {
          created_at: string | null;
          id: string;
          listing_id: string;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          listing_id: string;
          notes?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          listing_id?: string;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_listings_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_search_alerts: {
        Row: {
          created_at: string;
          id: string;
          listing_id: string;
          saved_search_id: string;
          seen: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          listing_id: string;
          saved_search_id: string;
          seen?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          listing_id?: string;
          saved_search_id?: string;
          seen?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_search_alerts_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_search_alerts_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "saved_search_alerts_saved_search_id_fkey";
            columns: ["saved_search_id"];
            isOneToOne: false;
            referencedRelation: "saved_searches";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_searches: {
        Row: {
          created_at: string;
          description: string | null;
          filters: Json;
          id: string;
          last_notified_at: string | null;
          name: string;
          notification_enabled: boolean;
          notification_frequency: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          filters?: Json;
          id?: string;
          last_notified_at?: string | null;
          name: string;
          notification_enabled?: boolean;
          notification_frequency?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          filters?: Json;
          id?: string;
          last_notified_at?: string | null;
          name?: string;
          notification_enabled?: boolean;
          notification_frequency?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      threads: {
        Row: {
          application_id: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          last_message_at: string | null;
          listing_id: string | null;
          participants: string[];
          subject: string | null;
          updated_at: string | null;
        };
        Insert: {
          application_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_message_at?: string | null;
          listing_id?: string | null;
          participants: string[];
          subject?: string | null;
          updated_at?: string | null;
        };
        Update: {
          application_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_message_at?: string | null;
          listing_id?: string | null;
          participants?: string[];
          subject?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "threads_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "listings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "threads_listing_id_fkey";
            columns: ["listing_id"];
            isOneToOne: false;
            referencedRelation: "public_listings";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
      provider_public_profiles: {
        Row: {
          avatar_url: string | null;
          full_name: string | null;
          id: string | null;
          role: string | null;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          full_name?: string | null;
          id?: string | null;
          role?: string | null;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          full_name?: string | null;
          id?: string | null;
          role?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      public_listings: {
        Row: {
          accessibility: Json | null;
          ada_beds: number | null;
          address: string | null;
          amenities: Json | null;
          availability: Json | null;
          certifications: Json | null;
          city: string | null;
          cost: Json | null;
          created_at: string | null;
          description: string | null;
          dv_sensitive: boolean | null;
          eligibility: Json | null;
          gender_rooming: string | null;
          housing_type: string | null;
          id: string | null;
          images: string[] | null;
          intake: Json | null;
          is_active: boolean | null;
          lat: number | null;
          lng: number | null;
          provider_id: string | null;
          responsiveness: Json | null;
          rules: Json | null;
          services: Json | null;
          state: string | null;
          title: string | null;
          unit_beds: Json | null;
          updated_at: string | null;
          verified: boolean | null;
          zip_code: string | null;
        };
        Insert: {
          accessibility?: Json | null;
          ada_beds?: number | null;
          address?: never;
          amenities?: Json | null;
          availability?: Json | null;
          certifications?: Json | null;
          city?: string | null;
          cost?: Json | null;
          created_at?: string | null;
          description?: string | null;
          dv_sensitive?: boolean | null;
          eligibility?: Json | null;
          gender_rooming?: string | null;
          housing_type?: string | null;
          id?: string | null;
          images?: string[] | null;
          intake?: Json | null;
          is_active?: boolean | null;
          lat?: never;
          lng?: never;
          provider_id?: string | null;
          responsiveness?: Json | null;
          rules?: Json | null;
          services?: Json | null;
          state?: string | null;
          title?: string | null;
          unit_beds?: Json | null;
          updated_at?: string | null;
          verified?: boolean | null;
          zip_code?: never;
        };
        Update: {
          accessibility?: Json | null;
          ada_beds?: number | null;
          address?: never;
          amenities?: Json | null;
          availability?: Json | null;
          certifications?: Json | null;
          city?: string | null;
          cost?: Json | null;
          created_at?: string | null;
          description?: string | null;
          dv_sensitive?: boolean | null;
          eligibility?: Json | null;
          gender_rooming?: string | null;
          housing_type?: string | null;
          id?: string | null;
          images?: string[] | null;
          intake?: Json | null;
          is_active?: boolean | null;
          lat?: never;
          lng?: never;
          provider_id?: string | null;
          responsiveness?: Json | null;
          rules?: Json | null;
          services?: Json | null;
          state?: string | null;
          title?: string | null;
          unit_beds?: Json | null;
          updated_at?: string | null;
          verified?: boolean | null;
          zip_code?: never;
        };
        Relationships: [
          {
            foreignKeyName: "listings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "listings_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "provider_public_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      add_user_to_read_by: {
        Args: { p_message_ids: string[]; p_user_id: string };
        Returns: undefined;
      };
      addauth: { Args: { "": string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      calculate_listing_score: {
        Args: {
          filters: Json;
          listing: Database["public"]["Tables"]["listings"]["Row"];
          search_radius_miles: number;
          user_lat: number;
          user_lng: number;
        };
        Returns: {
          availability_score: number;
          cost_score: number;
          distance_miles: number;
          distance_score: number;
          eligibility_score: number;
          quality_score: number;
          score: number;
          services_score: number;
        }[];
      };
      can_view_dv_details: { Args: { user_id: string }; Returns: boolean };
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window: string };
        Returns: boolean;
      };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | {
            Args: { column_name: string; table_name: string };
            Returns: string;
          };
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string };
      enablelongtransactions: { Args: never; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      fn_check_saved_search_alerts: {
        Args: { p_listing_id: string };
        Returns: undefined;
      };
      fn_update_availability: {
        Args: {
          p_beds_today?: number;
          p_beds_week?: number;
          p_confirm_only?: boolean;
          p_listing_id: string;
          p_waitlist_days?: number;
        };
        Returns: Json;
      };
      geometry: { Args: { "": string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { "": string }; Returns: unknown };
      get_active_listings: {
        Args: { radius_miles?: number; user_lat?: number; user_lng?: number };
        Returns: {
          accessibility: Json;
          address: string;
          amenities: Json;
          availability: Json;
          city: string;
          cost: Json;
          created_at: string;
          description: string;
          eligibility: Json;
          gender_rooming: string;
          housing_type: string;
          id: string;
          images: string[];
          intake: Json;
          is_active: boolean;
          lat: number;
          lng: number;
          provider_id: string;
          rules: Json;
          services: Json;
          state: string;
          title: string;
          unit_beds: Json;
          updated_at: string;
          verified: boolean;
          zip_code: string;
        }[];
      };
      get_all_active_listings: {
        Args: never;
        Returns: {
          city: string;
          id: string;
          is_active: boolean;
          provider_id: string;
          state: string;
          title: string;
        }[];
      };
      get_email_from_username: {
        Args: { p_username: string };
        Returns: string;
      };
      get_filter_aggregates: { Args: { base_filters?: Json }; Returns: Json };
      get_listing_safe: {
        Args: { listing_id: string };
        Returns: {
          accessibility: Json;
          ada_beds: number;
          address: string;
          amenities: Json;
          availability: Json;
          certifications: Json;
          city: string;
          contact_info: Json;
          cost: Json;
          created_at: string;
          description: string;
          dv_sensitive: boolean;
          eligibility: Json;
          gender_rooming: string;
          housing_type: string;
          id: string;
          images: string[];
          intake: Json;
          is_active: boolean;
          lat: number;
          lng: number;
          provider_id: string;
          responsiveness: Json;
          rules: Json;
          services: Json;
          state: string;
          title: string;
          unit_beds: Json;
          updated_at: string;
          verified: boolean;
          zip_code: string;
        }[];
      };
      get_nearby_listings: {
        Args: {
          center_lat: number;
          center_lng: number;
          max_results?: number;
          radius_miles?: number;
        };
        Returns: {
          availability: Json;
          cost: Json;
          distance_miles: number;
          housing_type: string;
          id: string;
          lat: number;
          lng: number;
          title: string;
          verified: boolean;
        }[];
      };
      get_thread_id_from_path: {
        Args: { object_path: string };
        Returns: string;
      };
      get_user_id_from_path: { Args: { object_path: string }; Returns: string };
      gettransactionid: { Args: never; Returns: unknown };
      is_admin: { Args: { uid: string }; Returns: boolean };
      is_user_blocked: {
        Args: { blocked: string; blocker: string };
        Returns: boolean;
      };
      log_dv_access: {
        Args: {
          access_type: string;
          ip_address?: unknown;
          listing_id: string;
          user_agent?: string;
        };
        Returns: undefined;
      };
      longtransactionsenabled: { Args: never; Returns: boolean };
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      quick_search_listings: {
        Args: {
          limit_results?: number;
          search_text: string;
          user_city?: string;
        };
        Returns: {
          availability: Json;
          city: string;
          cost: Json;
          description: string;
          housing_type: string;
          id: string;
          title: string;
          verified: boolean;
        }[];
      };
      search_listings: {
        Args: { search_params: Json };
        Returns: {
          accessibility: Json;
          ada_beds: number;
          address: string;
          amenities: Json;
          availability: Json;
          availability_score: number;
          certifications: Json;
          city: string;
          cost: Json;
          cost_score: number;
          created_at: string;
          description: string;
          distance_miles: number;
          distance_score: number;
          dv_sensitive: boolean;
          eligibility: Json;
          eligibility_score: number;
          gender_rooming: string;
          housing_type: string;
          id: string;
          images: string[];
          intake: Json;
          is_active: boolean;
          lat: number;
          lng: number;
          provider_id: string;
          quality_score: number;
          responsiveness: Json;
          rules: Json;
          score_reasons: string[];
          services: Json;
          services_score: number;
          state: string;
          title: string;
          total_score: number;
          unit_beds: Json;
          updated_at: string;
          verified: boolean;
          zip_code: string;
        }[];
      };
      soft_delete_application: {
        Args: { application_id: string };
        Returns: undefined;
      };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { "": string }; Returns: string };
      st_asgeojson:
        | {
            Args: {
              geog: unknown;
              maxdecimaldigits?: number;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              maxdecimaldigits?: number;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_asgml:
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              maxdecimaldigits?: number;
              options?: number;
            };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          };
      st_askml:
        | {
            Args: {
              geog: unknown;
              maxdecimaldigits?: number;
              nprefix?: string;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              maxdecimaldigits?: number;
              nprefix?: string;
            };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: {
        Args: { format?: string; geom: unknown };
        Returns: string;
      };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { "": string }; Returns: string };
      st_astext: { Args: { "": string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { "": string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          };
      st_force3d: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { "": string }; Returns: unknown };
      st_geographyfromtext: { Args: { "": string }; Returns: unknown };
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { "": string }; Returns: unknown };
      st_geomfromewkt: { Args: { "": string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown };
      st_geomfromgml: { Args: { "": string }; Returns: unknown };
      st_geomfromkml: { Args: { "": string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { "": string }; Returns: unknown };
      st_gmltosql: { Args: { "": string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: {
          cell_i: number;
          cell_j: number;
          origin?: unknown;
          size: number;
        };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database["public"]["CompositeTypes"]["valid_detail"];
        SetofOptions: {
          from: "*";
          to: "valid_detail";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { "": string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { "": string }; Returns: unknown };
      st_mpointfromtext: { Args: { "": string }; Returns: unknown };
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown };
      st_multipointfromtext: { Args: { "": string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { "": string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { "": string }; Returns: unknown };
      st_polygonfromtext: { Args: { "": string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: {
          cell_i: number;
          cell_j: number;
          origin?: unknown;
          size: number;
        };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { "": string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      unlockrows: { Args: { "": string }; Returns: number };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

// Convenience re-exports of specific table row/insert/update shapes.
//
// There is no "providers" table on the live schema - a listing's
// provider_id is a provider's own profile/auth id directly - so there is
// no Provider/ProviderInsert/ProviderUpdate export here (the codebase's
// only `Provider` type is the unrelated local interface in types/listing.ts).
//
// ApplicationDocument is mapped to the live "documents" table - the old
// generated types referenced a nonexistent "application_documents" table,
// even though every real caller already queried "documents" directly.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationDocument =
  Database["public"]["Tables"]["documents"]["Row"];
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
export type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
export type ApplicationInsert =
  Database["public"]["Tables"]["applications"]["Insert"];
export type ApplicationDocumentInsert =
  Database["public"]["Tables"]["documents"]["Insert"];
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
export type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];
export type ApplicationUpdate =
  Database["public"]["Tables"]["applications"]["Update"];
export type ApplicationDocumentUpdate =
  Database["public"]["Tables"]["documents"]["Update"];
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
