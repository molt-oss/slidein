/**
 * D1 テーブルの行型定義
 */

export interface ContactRow {
  id: string;
  ig_user_id: string;
  username: string | null;
  display_name: string | null;
  tags: string; // JSON array
  score: number;
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

export interface BroadcastRow {
  id: string;
  title: string;
  message_text: string;
  target_type: "all" | "tag";
  target_value: string | null;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  scheduled_at: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export interface ScoringRuleRow {
  id: string;
  event_type: "message_received" | "keyword_matched" | "link_clicked" | "scenario_completed";
  points: number;
  enabled: number; // 0 or 1
  created_at: string;
}

export interface AutomationRuleRow {
  id: string;
  name: string;
  event_type: string;
  condition_json: string;
  actions_json: string;
  enabled: number; // 0 or 1
  created_at: string;
}

export interface TrackedLinkRow {
  id: string;
  original_url: string;
  short_code: string;
  contact_tag: string | null;
  scenario_id: string | null;
  click_count: number;
  created_at: string;
}

export interface LinkClickRow {
  id: string;
  tracked_link_id: string;
  contact_id: string;
  clicked_at: string;
}

export interface DeliverySettingsRow {
  id: string;
  start_hour: number;
  end_hour: number;
  timezone: string;
}

export interface WebhookEndpointRow {
  id: string;
  url: string;
  events: string; // JSON array
  secret: string;
  enabled: number; // 0 or 1
  created_at: string;
}

export interface ConversionGoalRow {
  id: string;
  name: string;
  event_type: string;
  target_value: string | null;
  created_at: string;
}

export interface ConversionRow {
  id: string;
  goal_id: string;
  contact_id: string;
  converted_at: string;
}

export interface FormRow {
  id: string;
  name: string;
  fields: string; // JSON array
  thank_you_message: string;
  created_at: string;
}

export interface FormResponseRow {
  id: string;
  form_id: string;
  contact_id: string;
  responses: string; // JSON object
  current_field_index: number;
  completed_at: string | null;
  created_at: string;
}

/**
 * ⚠️ SECURITY: api_key_encrypted カラムは歴史的な命名で、実際には平文保存。
 * 本番では環境変数 AI_API_KEY を使用すること。
 * DBにAPIキーを保存する場合は Cloudflare Workers の Secrets 機能を検討すること。
 */
export interface AIConfigRow {
  id: string;
  enabled: number; // 0 or 1
  provider: "anthropic" | "openai";
  api_key_encrypted: string | null; // DB column name kept for migration compat; actually plaintext
  model: string;
  system_prompt: string | null;
  knowledge_base: string | null;
  max_tokens: number;
  created_at: string;
}
