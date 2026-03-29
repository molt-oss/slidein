/**
 * API Client — Worker API との通信を集約
 */

/**
 * Server-side: proxy via API_URL with API_KEY (Route Handlers use these)
 * Client-side: proxy via /api/proxy (no API key exposed)
 */
const isServer = typeof window === "undefined";
const API_BASE = isServer
  ? (process.env.API_URL ?? "http://localhost:8787")
  : "";
const API_KEY = isServer ? (process.env.API_KEY ?? "") : "";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Server: direct call with auth; Client: proxy route (no auth header needed)
  const url = isServer
    ? `${API_BASE}${path}`
    : `/api/proxy${path.replace(/^\/api/, "")}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers as Record<string, string>,
  };
  if (isServer && API_KEY) {
    headers["Authorization"] = `Bearer ${API_KEY}`;
  }
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || res.statusText);
  }

  return res.json() as Promise<T>;
}

// --- Types (mirrors worker types) ---

export interface KeywordRule {
  id: string;
  keyword: string;
  matchType: "exact" | "contains" | "regex";
  responseText: string;
  enabled: boolean;
  createdAt: string;
}

export interface CommentTrigger {
  id: string;
  mediaIdFilter: string | null;
  keywordFilter: string | null;
  dmResponseText: string;
  enabled: boolean;
  createdAt: string;
}

export interface Contact {
  id: string;
  igScopedId: string;
  username: string | null;
  displayName: string | null;
  tags: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string | null;
  triggerType: "keyword" | "comment" | "api";
  triggerValue: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioStep {
  id: string;
  scenarioId: string;
  stepOrder: number;
  messageText: string;
  delaySeconds: number;
  conditionTag: string | null;
  createdAt: string;
}

export interface ScenarioWithSteps extends Scenario {
  steps: ScenarioStep[];
}

export interface ScenarioEnrollment {
  id: string;
  contactId: string;
  scenarioId: string;
  currentStepOrder: number;
  status: "active" | "completed" | "cancelled";
  nextSendAt: string | null;
  enrolledAt: string;
  updatedAt: string;
}

// --- API functions ---

export async function fetchContacts() {
  return request<{ data: Contact[] }>("/api/contacts");
}

export async function fetchKeywordRules() {
  return request<{ data: KeywordRule[] }>("/api/keyword-rules");
}

export async function createKeywordRule(input: {
  keyword: string;
  matchType: string;
  responseText: string;
}) {
  return request<{ data: KeywordRule }>("/api/keyword-rules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteKeywordRule(id: string) {
  return request<{ success: boolean }>(`/api/keyword-rules/${id}`, {
    method: "DELETE",
  });
}

export async function fetchCommentTriggers() {
  return request<{ data: CommentTrigger[] }>("/api/comment-triggers");
}

export async function createCommentTrigger(input: {
  dmResponseText: string;
  mediaIdFilter?: string | null;
  keywordFilter?: string | null;
}) {
  return request<{ data: CommentTrigger }>("/api/comment-triggers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteCommentTrigger(id: string) {
  return request<{ success: boolean }>(`/api/comment-triggers/${id}`, {
    method: "DELETE",
  });
}

export async function fetchScenarios() {
  return request<{ data: Scenario[] }>("/api/scenarios");
}

export async function fetchScenario(id: string) {
  return request<{ data: ScenarioWithSteps }>(`/api/scenarios/${id}`);
}

export async function createScenario(input: {
  name: string;
  description?: string | null;
  triggerType: string;
  triggerValue?: string | null;
  steps: {
    stepOrder: number;
    messageText: string;
    delaySeconds: number;
    conditionTag?: string | null;
  }[];
}) {
  return request<{ data: ScenarioWithSteps }>("/api/scenarios", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateScenario(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    triggerType?: string;
    triggerValue?: string | null;
    enabled?: boolean;
    steps?: {
      stepOrder: number;
      messageText: string;
      delaySeconds: number;
      conditionTag?: string | null;
    }[];
  },
) {
  return request<{ data: ScenarioWithSteps }>(`/api/scenarios/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteScenario(id: string) {
  return request<{ success: boolean }>(`/api/scenarios/${id}`, {
    method: "DELETE",
  });
}

export async function enrollContact(scenarioId: string, contactId: string) {
  return request<{ data: ScenarioEnrollment }>(
    `/api/scenarios/${scenarioId}/enroll`,
    {
      method: "POST",
      body: JSON.stringify({ contactId }),
    },
  );
}

export async function fetchEnrollments(scenarioId: string) {
  return request<{ data: ScenarioEnrollment[] }>(
    `/api/scenarios/${scenarioId}/enrollments`,
  );
}

// --- Broadcasts ---

export interface Broadcast {
  id: string;
  title: string;
  messageText: string;
  targetType: "all" | "tag";
  targetValue: string | null;
  status: "draft" | "scheduled" | "sending" | "completed" | "failed";
  scheduledAt: string | null;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export async function fetchBroadcasts() {
  return request<{ data: Broadcast[] }>("/api/broadcasts");
}

export async function createBroadcast(input: {
  title: string;
  messageText: string;
  targetType?: string;
  targetValue?: string | null;
  scheduledAt?: string | null;
}) {
  return request<{ data: Broadcast }>("/api/broadcasts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendBroadcast(id: string) {
  return request<{ success: boolean }>(`/api/broadcasts/${id}/send`, {
    method: "POST",
  });
}

export async function deleteBroadcast(id: string) {
  return request<{ success: boolean }>(`/api/broadcasts/${id}`, {
    method: "DELETE",
  });
}

// --- Scoring Rules ---

export interface ScoringRule {
  id: string;
  eventType: string;
  points: number;
  enabled: boolean;
  createdAt: string;
}

export async function fetchScoringRules() {
  return request<{ data: ScoringRule[] }>("/api/scoring-rules");
}

export async function createScoringRule(input: {
  eventType: string;
  points: number;
}) {
  return request<{ data: ScoringRule }>("/api/scoring-rules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteScoringRule(id: string) {
  return request<{ success: boolean }>(`/api/scoring-rules/${id}`, {
    method: "DELETE",
  });
}

// --- Automation Rules ---

export interface AutomationRule {
  id: string;
  name: string;
  eventType: string;
  condition: Record<string, unknown>;
  actions: Array<{ type: string; tag?: string; scenarioId?: string; messageText?: string }>;
  enabled: boolean;
  createdAt: string;
}

export async function fetchAutomations() {
  return request<{ data: AutomationRule[] }>("/api/automations");
}

export async function createAutomation(input: {
  name: string;
  eventType: string;
  condition?: Record<string, unknown>;
  actions: Array<{ type: string; tag?: string; scenarioId?: string; messageText?: string }>;
}) {
  return request<{ data: AutomationRule }>("/api/automations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAutomation(
  id: string,
  input: {
    name?: string;
    eventType?: string;
    condition?: Record<string, unknown>;
    actions?: Array<{ type: string; tag?: string; scenarioId?: string; messageText?: string }>;
    enabled?: boolean;
  },
) {
  return request<{ data: AutomationRule }>(`/api/automations/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteAutomation(id: string) {
  return request<{ success: boolean }>(`/api/automations/${id}`, {
    method: "DELETE",
  });
}

export { ApiError };
