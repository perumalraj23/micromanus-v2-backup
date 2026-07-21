export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          credits: number;
          has_paid: boolean;
          coupon_used: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      model_configs: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          label: string;
          base_url: string;
          api_key_encrypted: string;
          model: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["model_configs"]["Row"]> & {
          user_id: string;
          provider: string;
          label: string;
          base_url: string;
          api_key_encrypted: string;
          model: string;
        };
        Update: Partial<Database["public"]["Tables"]["model_configs"]["Row"]>;
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["chats"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["chats"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: "user" | "assistant" | "system";
          content: string | null;
          thoughts: Json;
          timeline: Json;
          report: Json | null;
          model: string | null;
          provider: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & {
          chat_id: string;
          role: "user" | "assistant" | "system";
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
      usage_events: {
        Row: {
          id: string;
          user_id: string;
          chat_id: string | null;
          message_id: string | null;
          provider: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          cached_tokens: number;
          cost_usd: number;
          cache_savings_usd: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["usage_events"]["Row"]> & {
          user_id: string;
          provider: string;
          model: string;
        };
        Update: Partial<Database["public"]["Tables"]["usage_events"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          chat_id: string;
          message_id: string | null;
          title: string;
          summary: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reports"]["Row"]> & {
          user_id: string;
          chat_id: string;
          title: string;
          summary: Json;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          stripe_session_id: string | null;
          amount_usd: number | null;
          credits_added: number | null;
          status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
      };
      api_requests: {
        Row: { id: number; user_id: string; created_at: string };
        Insert: { user_id: string };
        Update: never;
      };
    };
  };
}
