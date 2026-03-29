/**
 * Enrollment Repository — D1 CRUD for scenario enrollments
 */
import type { ScenarioEnrollmentRow } from "@slidein/db";
import type { ScenarioEnrollment } from "./types.js";

function rowToEnrollment(row: ScenarioEnrollmentRow): ScenarioEnrollment {
  return {
    id: row.id,
    contactId: row.contact_id,
    scenarioId: row.scenario_id,
    currentStepOrder: row.current_step_order,
    status: row.status,
    nextSendAt: row.next_send_at,
    enrolledAt: row.enrolled_at,
    updatedAt: row.updated_at,
  };
}

export class EnrollmentRepository {
  constructor(private readonly db: D1Database) {}

  async enroll(
    contactId: string,
    scenarioId: string,
    nextSendAt: string,
  ): Promise<ScenarioEnrollment> {
    const row = await this.db
      .prepare(
        `INSERT INTO scenario_enrollments
         (contact_id, scenario_id, current_step_order, status, next_send_at)
         VALUES (?, ?, 1, 'active', ?) RETURNING *`,
      )
      .bind(contactId, scenarioId, nextSendAt)
      .first<ScenarioEnrollmentRow>();
    if (!row) throw new Error("Failed to enroll contact");
    return rowToEnrollment(row);
  }

  async advance(
    id: string,
    nextStepOrder: number,
    nextSendAt: string,
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE scenario_enrollments
         SET current_step_order = ?, next_send_at = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(nextStepOrder, nextSendAt, id)
      .run();
  }

  async complete(id: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE scenario_enrollments
         SET status = 'completed', next_send_at = NULL, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(id)
      .run();
  }

  async cancel(id: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE scenario_enrollments
         SET status = 'cancelled', next_send_at = NULL, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(id)
      .run();
  }

  async getReadyToSend(now: string): Promise<ScenarioEnrollment[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM scenario_enrollments
         WHERE status = 'active' AND next_send_at <= ?
         ORDER BY next_send_at ASC LIMIT 50`,
      )
      .bind(now)
      .all<ScenarioEnrollmentRow>();
    return result.results.map(rowToEnrollment);
  }

  async findByScenarioId(scenarioId: string): Promise<ScenarioEnrollment[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM scenario_enrollments
         WHERE scenario_id = ? ORDER BY enrolled_at DESC`,
      )
      .bind(scenarioId)
      .all<ScenarioEnrollmentRow>();
    return result.results.map(rowToEnrollment);
  }

  async findActiveByContactAndScenario(
    contactId: string,
    scenarioId: string,
  ): Promise<ScenarioEnrollment | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM scenario_enrollments
         WHERE contact_id = ? AND scenario_id = ? AND status = 'active'`,
      )
      .bind(contactId, scenarioId)
      .first<ScenarioEnrollmentRow>();
    return row ? rowToEnrollment(row) : null;
  }
}
