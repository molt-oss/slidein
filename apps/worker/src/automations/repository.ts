/**
 * Automation Rule Repository — D1 CRUD
 */
import { structuredLog } from "@slidein/shared";
import type { AutomationRuleRow } from "@slidein/db";
import type { AutomationRule, AutomationCondition, AutomationAction } from "./types.js";
import { AutomationActionSchema, AutomationConditionSchema, AutomationEventType } from "./types.js";

function rowToAutomationRule(row: AutomationRuleRow): AutomationRule | null {
  const eventTypeResult = AutomationEventType.safeParse(row.event_type);
  if (!eventTypeResult.success) {
    structuredLog("error", "Invalid event_type in automation rule", {
      ruleId: row.id,
      eventType: row.event_type,
    });
    return null;
  }

  const conditionResult = AutomationConditionSchema.safeParse(
    JSON.parse(row.condition_json),
  );
  if (!conditionResult.success) {
    structuredLog("error", "Invalid condition_json in automation rule", {
      ruleId: row.id,
      error: conditionResult.error.message,
    });
    return null;
  }

  const actionsResult = AutomationActionSchema.array().safeParse(
    JSON.parse(row.actions_json),
  );
  if (!actionsResult.success) {
    structuredLog("error", "Invalid actions_json in automation rule", {
      ruleId: row.id,
      error: actionsResult.error.message,
    });
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    eventType: eventTypeResult.data,
    condition: conditionResult.data,
    actions: actionsResult.data,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

export class AutomationRuleRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<AutomationRule[]> {
    const result = await this.db
      .prepare("SELECT * FROM automation_rules ORDER BY created_at DESC")
      .all<AutomationRuleRow>();
    return result.results
      .map(rowToAutomationRule)
      .filter((r): r is AutomationRule => r !== null);
  }

  async findById(id: string): Promise<AutomationRule | null> {
    const row = await this.db
      .prepare("SELECT * FROM automation_rules WHERE id = ?")
      .bind(id)
      .first<AutomationRuleRow>();
    return row ? rowToAutomationRule(row) : null;
  }

  async findEnabledByEventType(eventType: string): Promise<AutomationRule[]> {
    const result = await this.db
      .prepare(
        "SELECT * FROM automation_rules WHERE event_type = ? AND enabled = 1",
      )
      .bind(eventType)
      .all<AutomationRuleRow>();
    return result.results
      .map(rowToAutomationRule)
      .filter((r): r is AutomationRule => r !== null);
  }

  async create(
    name: string,
    eventType: string,
    condition: AutomationCondition,
    actions: AutomationAction[],
  ): Promise<AutomationRule> {
    const row = await this.db
      .prepare(
        `INSERT INTO automation_rules (name, event_type, condition_json, actions_json)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .bind(name, eventType, JSON.stringify(condition), JSON.stringify(actions))
      .first<AutomationRuleRow>();
    if (!row) throw new Error("Failed to create automation rule");
    const rule = rowToAutomationRule(row);
    if (!rule) throw new Error("Failed to parse created automation rule");
    return rule;
  }

  async update(
    id: string,
    fields: {
      name?: string;
      eventType?: string;
      condition?: AutomationCondition;
      actions?: AutomationAction[];
      enabled?: boolean;
    },
  ): Promise<AutomationRule | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const name = fields.name ?? existing.name;
    const eventType = fields.eventType ?? existing.eventType;
    const condition = fields.condition ?? existing.condition;
    const actions = fields.actions ?? existing.actions;
    const enabled = fields.enabled ?? existing.enabled;

    await this.db
      .prepare(
        `UPDATE automation_rules
         SET name = ?, event_type = ?, condition_json = ?, actions_json = ?, enabled = ?
         WHERE id = ?`,
      )
      .bind(
        name,
        eventType,
        JSON.stringify(condition),
        JSON.stringify(actions),
        enabled ? 1 : 0,
        id,
      )
      .run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM automation_rules WHERE id = ?")
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }
}
