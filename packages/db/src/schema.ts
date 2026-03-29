/**
 * D1 テーブルの行型定義
 */

export interface ContactRow {
  id: string;
  ig_user_id: string;
  username: string | null;
  display_name: string | null;
  tags: string; // JSON array
  first_seen_at: string;
  last_message_at: string;
}

export interface KeywordRuleRow {
  id: string;
  keyword: string;
  match_type: "exact" | "contains" | "regex";
  response_text: string;
  enabled: number; // 0 or 1
  created_at: string;
}

export interface CommentTriggerRow {
  id: string;
  media_id_filter: string | null;
  keyword_filter: string | null;
  dm_response_text: string;
  enabled: number; // 0 or 1
  created_at: string;
}

export interface MessageRow {
  id: string;
  contact_id: string;
  direction: "in" | "out";
  content: string;
  ig_message_id: string | null;
  created_at: string;
}

export interface RateLimitTokenRow {
  id: string;
  bucket_key: string;
  tokens: number;
  last_refill_at: string;
}

export interface PendingMessageRow {
  id: string;
  contact_id: string;
  recipient_ig_id: string;
  content: string;
  scheduled_at: string;
  status: "pending" | "sent" | "failed";
  created_at: string;
}

export interface ScenarioRow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: "keyword" | "comment" | "api";
  trigger_value: string | null;
  enabled: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface ScenarioStepRow {
  id: string;
  scenario_id: string;
  step_order: number;
  message_text: string;
  delay_seconds: number;
  condition_tag: string | null;
  created_at: string;
}

export interface ScenarioEnrollmentRow {
  id: string;
  contact_id: string;
  scenario_id: string;
  current_step_order: number;
  status: "active" | "completed" | "cancelled";
  next_send_at: string | null;
  enrolled_at: string;
  updated_at: string;
}
