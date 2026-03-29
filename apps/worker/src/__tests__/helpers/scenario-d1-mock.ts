/**
 * Scenario D1 Mock Factory — テスト用の共通D1モック
 *
 * scenario-service.test.ts と message-service.test.ts で共用する
 */

interface ContactRow {
  id: string;
  ig_user_id: string;
  username: string | null;
  display_name: string | null;
  tags: string;
  first_seen_at: string;
  last_message_at: string;
}

interface ScenarioRow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_value: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

interface StepRow {
  id: string;
  scenario_id: string;
  step_order: number;
  message_text: string;
  delay_seconds: number;
  condition_tag: string | null;
  created_at: string;
}

interface EnrollmentRow {
  id: string;
  contact_id: string;
  scenario_id: string;
  current_step_order: number;
  status: string;
  next_send_at: string | null;
  enrolled_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  contact_id: string;
  direction: string;
  content: string;
  ig_message_id: string | null;
  created_at: string;
}

export interface ScenarioD1MockState {
  _scenarios: Map<string, ScenarioRow>;
  _steps: StepRow[];
  _enrollments: Map<string, EnrollmentRow>;
  _messages: MessageRow[];
  _contacts: Map<string, ContactRow>;
}

export function createScenarioD1Mock(opts?: {
  contacts?: Map<string, ContactRow>;
}): D1Database & ScenarioD1MockState {
  const scenarios = new Map<string, ScenarioRow>();
  const steps: StepRow[] = [];
  const enrollments = new Map<string, EnrollmentRow>();
  const messages: MessageRow[] = [];
  const contacts = opts?.contacts ?? new Map();

  let idCounter = 0;
  const nextId = () => `mock-${++idCounter}`;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];

    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // Scenarios
        if (sql.includes("FROM scenarios WHERE id")) {
          const id = boundArgs[0] as string;
          const s = scenarios.get(id);
          return s ? (s as unknown as T) : null;
        }
        if (sql.includes("INTO scenarios") && sql.includes("RETURNING")) {
          const id = nextId();
          const row: ScenarioRow = {
            id,
            name: boundArgs[0] as string,
            description: boundArgs[1] as string | null,
            trigger_type: boundArgs[2] as string,
            trigger_value: boundArgs[3] as string | null,
            enabled: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          scenarios.set(id, row);
          return row as unknown as T;
        }
        if (sql.includes("UPDATE scenarios") && sql.includes("RETURNING")) {
          const id = boundArgs[boundArgs.length - 1] as string;
          const s = scenarios.get(id);
          return s ? (s as unknown as T) : null;
        }
        // Steps
        if (sql.includes("INTO scenario_steps") && sql.includes("RETURNING")) {
          const id = nextId();
          const row: StepRow = {
            id,
            scenario_id: boundArgs[0] as string,
            step_order: boundArgs[1] as number,
            message_text: boundArgs[2] as string,
            delay_seconds: boundArgs[3] as number,
            condition_tag: boundArgs[4] as string | null,
            created_at: new Date().toISOString(),
          };
          steps.push(row);
          return row as unknown as T;
        }
        // Enrollments
        if (sql.includes("INTO scenario_enrollments") && sql.includes("RETURNING")) {
          const id = nextId();
          const now = new Date().toISOString();
          const row: EnrollmentRow = {
            id,
            contact_id: boundArgs[0] as string,
            scenario_id: boundArgs[1] as string,
            current_step_order: 1,
            status: "active",
            next_send_at: boundArgs[2] as string,
            enrolled_at: now,
            updated_at: now,
          };
          enrollments.set(id, row);
          return row as unknown as T;
        }
        if (
          sql.includes("FROM scenario_enrollments") &&
          sql.includes("contact_id") &&
          sql.includes("status = 'active'")
        ) {
          const contactId = boundArgs[0] as string;
          const scenarioId = boundArgs[1] as string;
          for (const e of enrollments.values()) {
            if (
              e.contact_id === contactId &&
              e.scenario_id === scenarioId &&
              e.status === "active"
            ) {
              return e as unknown as T;
            }
          }
          return null;
        }
        // Contacts by id
        if (sql.includes("FROM contacts WHERE id")) {
          const id = boundArgs[0] as string;
          for (const c of contacts.values()) {
            if (c.id === id) return c as unknown as T;
          }
          return null;
        }
        // Messages
        if (sql.includes("INTO messages") && sql.includes("RETURNING")) {
          const id = nextId();
          const row: MessageRow = {
            id,
            contact_id: boundArgs[0] as string,
            direction: boundArgs[1] as string,
            content: boundArgs[2] as string,
            ig_message_id: boundArgs[3] as string | null,
            created_at: new Date().toISOString(),
          };
          messages.push(row);
          return row as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        // Steps by scenario_id
        if (sql.includes("FROM scenario_steps WHERE scenario_id")) {
          const scenarioId = boundArgs[0] as string;
          const filtered = steps
            .filter((s) => s.scenario_id === scenarioId)
            .sort((a, b) => a.step_order - b.step_order);
          return { results: filtered as unknown as T[] };
        }
        // JOIN query for findAll
        if (sql.includes("FROM scenarios s") && sql.includes("LEFT JOIN scenario_steps")) {
          const rows: unknown[] = [];
          const sortedScenarios = [...scenarios.values()].sort(
            (a, b) => b.created_at.localeCompare(a.created_at),
          );
          for (const s of sortedScenarios) {
            const scenarioSteps = steps
              .filter((st) => st.scenario_id === s.id)
              .sort((a, b) => a.step_order - b.step_order);
            if (scenarioSteps.length === 0) {
              rows.push({
                ...s,
                step_id: null,
                step_order: null,
                message_text: null,
                delay_seconds: null,
                condition_tag: null,
                step_created_at: null,
              });
            } else {
              for (const st of scenarioSteps) {
                rows.push({
                  ...s,
                  step_id: st.id,
                  step_order: st.step_order,
                  message_text: st.message_text,
                  delay_seconds: st.delay_seconds,
                  condition_tag: st.condition_tag,
                  step_created_at: st.created_at,
                });
              }
            }
          }
          return { results: rows as T[] };
        }
        // Ready enrollments
        if (sql.includes("FROM scenario_enrollments") && sql.includes("next_send_at <=")) {
          const now = boundArgs[0] as string;
          const ready = [...enrollments.values()].filter(
            (e) =>
              e.status === "active" &&
              e.next_send_at !== null &&
              e.next_send_at <= now,
          );
          return { results: ready as unknown as T[] };
        }
        // All scenarios
        if (sql.includes("FROM scenarios ORDER BY")) {
          return {
            results: [...scenarios.values()] as unknown as T[],
          };
        }
        // Enrollments by scenario
        if (sql.includes("FROM scenario_enrollments WHERE scenario_id")) {
          const scenarioId = boundArgs[0] as string;
          const filtered = [...enrollments.values()].filter(
            (e) => e.scenario_id === scenarioId,
          );
          return { results: filtered as unknown as T[] };
        }
        return { results: [] as T[] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // Update enrollments
        if (sql.includes("UPDATE scenario_enrollments") && sql.includes("current_step_order")) {
          const nextStep = boundArgs[0] as number;
          const nextSendAt = boundArgs[1] as string;
          const id = boundArgs[2] as string;
          const e = enrollments.get(id);
          if (e) {
            e.current_step_order = nextStep;
            e.next_send_at = nextSendAt;
            e.updated_at = new Date().toISOString();
          }
          return { meta: { changes: 1 } };
        }
        if (sql.includes("UPDATE scenario_enrollments") && sql.includes("completed")) {
          const id = boundArgs[0] as string;
          const e = enrollments.get(id);
          if (e) {
            e.status = "completed";
            e.next_send_at = null;
          }
          return { meta: { changes: 1 } };
        }
        if (sql.includes("UPDATE scenario_enrollments") && sql.includes("cancelled")) {
          const id = boundArgs[0] as string;
          const e = enrollments.get(id);
          if (e) {
            e.status = "cancelled";
            e.next_send_at = null;
          }
          return { meta: { changes: 1 } };
        }
        // Delete steps
        if (sql.includes("DELETE FROM scenario_steps")) {
          return { meta: { changes: 1 } };
        }
        // Delete scenario
        if (sql.includes("DELETE FROM scenarios")) {
          const id = boundArgs[0] as string;
          const deleted = scenarios.delete(id);
          return { meta: { changes: deleted ? 1 : 0 } };
        }
        // Rate limit
        if (sql.includes("rate_limit_tokens")) {
          return { meta: { changes: 1 } };
        }
        // Pending messages
        if (sql.includes("pending_messages")) {
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 1 } };
      },
    };
  }

  const db = {
    prepare: (sql: string) => createStatement(sql),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
    _scenarios: scenarios,
    _steps: steps,
    _enrollments: enrollments,
    _messages: messages,
    _contacts: contacts,
  } as unknown as D1Database & ScenarioD1MockState;

  return db;
}
