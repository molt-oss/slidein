/**
 * Form Repository — D1 CRUD
 */
import type { FormRow, FormResponseRow } from "@slidein/db";
import type { Form, FormResponse, FormField } from "./types.js";

function rowToForm(row: FormRow): Form {
  return {
    id: row.id,
    name: row.name,
    fields: JSON.parse(row.fields) as FormField[],
    thankYouMessage: row.thank_you_message,
    createdAt: row.created_at,
  };
}

function rowToFormResponse(row: FormResponseRow): FormResponse {
  return {
    id: row.id,
    formId: row.form_id,
    contactId: row.contact_id,
    responses: JSON.parse(row.responses) as Record<string, string>,
    currentFieldIndex: row.current_field_index,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export class FormRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async findAll(): Promise<Form[]> {
    const result = await this.db
      .prepare("SELECT * FROM forms WHERE account_id = ? ORDER BY created_at DESC")
      .bind(this.accountId)
      .all<FormRow>();
    return result.results.map(rowToForm);
  }

  async findById(id: string): Promise<Form | null> {
    const row = await this.db
      .prepare("SELECT * FROM forms WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .first<FormRow>();
    return row ? rowToForm(row) : null;
  }

  async create(
    name: string,
    fields: FormField[],
    thankYouMessage: string,
  ): Promise<Form> {
    const row = await this.db
      .prepare(
        `INSERT INTO forms (account_id, name, fields, thank_you_message)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .bind(this.accountId, name, JSON.stringify(fields), thankYouMessage)
      .first<FormRow>();
    if (!row) throw new Error("Failed to create form");
    return rowToForm(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM forms WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
    return result.meta.changes > 0;
  }
}

export class FormResponseRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async findByFormId(formId: string): Promise<FormResponse[]> {
    const result = await this.db
      .prepare(
        "SELECT fr.* FROM form_responses fr JOIN forms f ON f.id = fr.form_id WHERE fr.form_id = ? AND f.account_id = ? ORDER BY fr.created_at DESC",
      )
      .bind(formId, this.accountId)
      .all<FormResponseRow>();
    return result.results.map(rowToFormResponse);
  }

  /** 進行中のフォーム回答を取得（completed_at IS NULL） */
  async findActiveByContactId(
    contactId: string,
  ): Promise<FormResponse | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM form_responses
         WHERE contact_id = ?
           AND completed_at IS NULL
           AND form_id IN (SELECT id FROM forms WHERE account_id = ?)
         ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(contactId, this.accountId)
      .first<FormResponseRow>();
    return row ? rowToFormResponse(row) : null;
  }

  async create(formId: string, contactId: string): Promise<FormResponse> {
    const row = await this.db
      .prepare(
        `INSERT INTO form_responses (form_id, contact_id)
         SELECT ?, ?
         WHERE EXISTS (SELECT 1 FROM forms WHERE id = ? AND account_id = ?)
         RETURNING *`,
      )
      .bind(formId, contactId, formId, this.accountId)
      .first<FormResponseRow>();
    if (!row) throw new Error("Failed to create form response");
    return rowToFormResponse(row);
  }

  async updateResponse(
    id: string,
    responses: Record<string, string>,
    nextFieldIndex: number,
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE form_responses
         SET responses = ?, current_field_index = ?
         WHERE id = ?
           AND form_id IN (SELECT id FROM forms WHERE account_id = ?)`,
      )
      .bind(JSON.stringify(responses), nextFieldIndex, id, this.accountId)
      .run();
  }

  async complete(id: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE form_responses
         SET completed_at = datetime('now')
         WHERE id = ?
           AND form_id IN (SELECT id FROM forms WHERE account_id = ?)`,
      )
      .bind(id, this.accountId)
      .run();
  }
}
