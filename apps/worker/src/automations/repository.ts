/**
 * Automation Rule Repository — D1 CRUD
 */
import type { AutomationRuleRow } from "@slidein/db";
import type { AutomationRule, AutomationCondition, AutomationAction } from "./types.js";

function rowToAutomationRule(row: AutomationRuleRow): AutomationRule {
  return {
    id: row.id,
    name: row.name,
    eventType: row.event_type,
    condition: JSON.parse(row.condition_json) as AutomationCondition,
    actions: JSON.parse(row.actions_json) as AutomationAction[],
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
    return result.results.map(rowToAutomationRule);
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
    return result.results.map(rowToAutomationRule);
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
    return rowToAutomationRule(row);
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
