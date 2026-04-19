// Auto-generated style Database type. Update when migrations change.
// Kept hand-written so the project compiles before `supabase gen types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: "free" | "pro" | "creator";
          role: "user" | "staff" | "admin";
          suspended: boolean;
          onboarded: boolean;
          trading_level: string | null;
          markets: string[];
          broker: string | null;
          mt5_platform: string | null;
          trading_styles: string[];
          goal: string | null;
          account_size: string | null;
          referral_source: string | null;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          plan?: "free" | "pro" | "creator";
          role?: "user" | "staff" | "admin";
          suspended?: boolean;
          onboarded?: boolean;
          trading_level?: string | null;
          markets?: string[];
          broker?: string | null;
          mt5_platform?: string | null;
          trading_styles?: string[];
          goal?: string | null;
          account_size?: string | null;
          referral_source?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      block_registry_overrides: {
        Row: {
          block_id: string;
          force_status: string | null;
          force_plan: string | null;
          force_hidden: boolean;
          notes: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          block_id: string;
          force_status?: string | null;
          force_plan?: string | null;
          force_hidden?: boolean;
          notes?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["block_registry_overrides"]["Insert"]>;
      };
      block_usage_events: {
        Row: {
          id: string;
          block_id: string;
          user_id: string | null;
          strategy_id: string | null;
          event: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["block_usage_events"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["block_usage_events"]["Insert"]>;
      };
      feature_flags: {
        Row: {
          slug: string;
          enabled: boolean;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          slug: string;
          enabled?: boolean;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feature_flags"]["Insert"]>;
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: { key: string; value: Json; updated_by?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["system_settings"]["Insert"]>;
      };
      system_errors: {
        Row: {
          id: string;
          user_id: string | null;
          level: string;
          source: string | null;
          message: string;
          meta: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["system_errors"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_errors"]["Insert"]>;
      };
      listing_flags: {
        Row: {
          id: string;
          listing_id: string;
          reporter_id: string | null;
          reason: string;
          resolved: boolean;
          resolved_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["listing_flags"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["listing_flags"]["Insert"]>;
      };
      admin_actions: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          before: Json | null;
          after: Json | null;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["admin_actions"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_actions"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "free" | "pro" | "creator";
          status: "active" | "trialing" | "canceled" | "incomplete" | "past_due";
          current_period_end: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["subscriptions"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          platform: "mt5";
          graph: Json;
          status: "draft" | "validated" | "exported" | "published";
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          platform?: "mt5";
          graph: Json;
          status?: "draft" | "validated" | "exported" | "published";
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["strategies"]["Insert"]>;
      };
      strategy_versions: {
        Row: {
          id: string;
          strategy_id: string;
          version: number;
          graph: Json;
          generated_code: string | null;
          summary: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["strategy_versions"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["strategy_versions"]["Insert"]>;
      };
      exports: {
        Row: {
          id: string;
          strategy_id: string;
          user_id: string;
          version_id: string | null;
          license_id: string | null;
          filename: string;
          source: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exports"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exports"]["Insert"]>;
      };
      marketplace_listings: {
        Row: {
          id: string;
          strategy_id: string;
          author_id: string;
          title: string;
          description: string;
          thumbnail_url: string | null;
          price_cents: number;
          currency: string;
          tags: string[];
          status: "draft" | "published" | "archived";
          downloads: number;
          rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["marketplace_listings"]["Row"],
          "id" | "created_at" | "updated_at" | "downloads" | "rating"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          downloads?: number;
          rating?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["marketplace_listings"]["Insert"]>;
      };
      marketplace_tags: {
        Row: { slug: string; label: string; created_at: string };
        Insert: { slug: string; label: string; created_at?: string };
        Update: Partial<{ slug: string; label: string; created_at: string }>;
      };
      purchases: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          price_cents: number;
          currency: string;
          status: "pending" | "paid" | "refunded" | "failed";
          stripe_payment_intent: string | null;
          license_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["purchases"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["purchases"]["Insert"]>;
      };
      licenses: {
        Row: {
          id: string;
          user_id: string;
          strategy_id: string | null;
          listing_id: string | null;
          purchase_id: string | null;
          buyer_id: string | null;
          buyer_email: string | null;
          key_hash: string;
          key_prefix: string;
          bound_account: number | null;
          bound_broker: string | null;
          bound_server: string | null;
          expires_at: string | null;
          max_activations: number | null;
          revoked: boolean;
          revoked_at: string | null;
          revoke_reason: string | null;
          label: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["licenses"]["Row"],
          "id" | "created_at" | "updated_at" | "revoked" | "metadata"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          revoked?: boolean;
          metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["licenses"]["Insert"]>;
      };
      license_activations: {
        Row: {
          id: string;
          license_id: string | null;
          key_hash: string;
          account_login: number | null;
          broker: string | null;
          server: string | null;
          terminal_company: string | null;
          client_ip: string | null;
          country: string | null;
          user_agent: string | null;
          result:
            | "valid"
            | "invalid_key"
            | "expired"
            | "revoked"
            | "wrong_account"
            | "wrong_broker"
            | "max_activations"
            | "grace"
            | "rate_limited"
            | "malformed";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["license_activations"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["license_activations"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          listing_id: string;
          author_id: string;
          rating: number;
          body: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reviews"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      favorites: {
        Row: { user_id: string; listing_id: string; created_at: string };
        Insert: { user_id: string; listing_id: string; created_at?: string };
        Update: never;
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
