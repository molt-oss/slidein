/**
 * Scenario Repository — D1 CRUD for scenarios + steps
 */
import type { ScenarioRow, ScenarioStepRow } from "@slidein/db";
import type { Scenario, ScenarioStep, ScenarioWithSteps } from "./types.js";

function rowToScenario(row: ScenarioRow): Scenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    triggerType: row.trigger_type,
    triggerValue: row.trigger_value,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToStep(row: ScenarioStepRow): ScenarioStep {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    stepOrder: row.step_order,
    messageText: row.message_text,
    delaySeconds: row.delay_seconds,
    conditionTag: row.condition_tag,
    createdAt: row.created_at,
  };
}

export class ScenarioRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<ScenarioWithSteps[]> {
    const scenarios = await this.db
      .prepare("SELECT * FROM scenarios ORDER BY created_at DESC")
      .all<ScenarioRow>();
    const result: ScenarioWithSteps[] = [];
    for (const row of scenarios.results) {
      const steps = await this.findStepsByScenarioId(row.id);
      result.push({ ...rowToScenario(row), steps });
    }
    return result;
  }

  async findById(id: string): Promise<ScenarioWithSteps | null> {
    const row = await this.db
      .prepare("SELECT * FROM scenarios WHERE id = ?")
      .bind(id)
      .first<ScenarioRow>();
    if (!row) return null;
    const steps = await this.findStepsByScenarioId(row.id);
    return { ...rowToScenario(row), steps };
  }

  async findByTrigger(
    triggerType: string,
    triggerValue: string,
  ): Promise<ScenarioWithSteps[]> {
    const rows = await this.db
      .prepare(
        `SELECT * FROM scenarios
         WHERE trigger_type = ? AND trigger_value = ? AND enabled = 1`,
      )
      .bind(triggerType, triggerValue)
      .all<ScenarioRow>();
    const result: ScenarioWithSteps[] = [];
    for (const row of rows.results) {
      const steps = await this.findStepsByScenarioId(row.id);
      result.push({ ...rowToScenario(row), steps });
    }
    return result;
  }

  async create(
    name: string,
    triggerType: string,
    description?: string | null,
    triggerValue?: string | null,
  ): Promise<Scenario> {
    const row = await this.db
      .prepare(
        `INSERT INTO scenarios (name, description, trigger_type, trigger_value)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .bind(name, description ?? null, triggerType, triggerValue ?? null)
      .first<ScenarioRow>();
    if (!row) throw new Error("Failed to create scenario");
    return rowToScenario(row);
  }

  async update(
    id: string,
    fields: {
      name?: string;
      description?: string | null;
      triggerType?: string;
      triggerValue?: string | null;
      enabled?: boolean;
    },
  ): Promise<Scenario | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (fields.name !== undefined) {
      sets.push("name = ?");
      values.push(fields.name);
    }
    if (fields.description !== undefined) {
      sets.push("description = ?");
      values.push(fields.description);
    }
    if (fields.triggerType !== undefined) {
      sets.push("trigger_type = ?");
      values.push(fields.triggerType);
    }
    if (fields.triggerValue !== undefined) {
      sets.push("trigger_value = ?");
      values.push(fields.triggerValue);
    }
    if (fields.enabled !== undefined) {
      sets.push("enabled = ?");
      values.push(fields.enabled ? 1 : 0);
    }
    if (sets.length === 0) return this.findById(id);
    sets.push("updated_at = datetime('now')");
    values.push(id);
    const row = await this.db
      .prepare(
        `UPDATE scenarios SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
      )
      .bind(...values)
      .first<ScenarioRow>();
    return row ? rowToScenario(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM scenarios WHERE id = ?")
      .bind(id)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async createStep(
    scenarioId: string,
    stepOrder: number,
    messageText: string,
    delaySeconds: number,
    conditionTag?: string | null,
  ): Promise<ScenarioStep> {
    const row = await this.db
      .prepare(
        `INSERT INTO scenario_steps
         (scenario_id, step_order, message_text, delay_seconds, condition_tag)
         VALUES (?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(scenarioId, stepOrder, messageText, delaySeconds, conditionTag ?? null)
      .first<ScenarioStepRow>();
    if (!row) throw new Error("Failed to create scenario step");
    return rowToStep(row);
  }

  async deleteStepsByScenarioId(scenarioId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM scenario_steps WHERE scenario_id = ?")
      .bind(scenarioId)
      .run();
  }

  async findStepsByScenarioId(scenarioId: string): Promise<ScenarioStep[]> {
    const result = await this.db
      .prepare(
        "SELECT * FROM scenario_steps WHERE scenario_id = ? ORDER BY step_order ASC",
      )
      .bind(scenarioId)
      .all<ScenarioStepRow>();
    return result.results.map(rowToStep);
  }
}
