/**
 * PendingMessage Repository — レート制限超過時のメッセージキュー
 */

interface PendingMessageRow {
  id: string;
  contact_id: string;
  recipient_ig_id: string;
  content: string;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export interface PendingMessage {
  id: string;
  contactId: string;
  recipientIgId: string;
  content: string;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

function rowToPendingMessage(row: PendingMessageRow): PendingMessage {
  return {
    id: row.id,
    contactId: row.contact_id,
    recipientIgId: row.recipient_ig_id,
    content: row.content,
    scheduledAt: row.scheduled_at,
    status: row.status,
    createdAt: row.created_at,
  };
}

export class PendingMessageRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  /** メッセージをキューに追加 */
  async enqueue(
    contactId: string,
    recipientIgId: string,
    content: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO pending_messages (contact_id, recipient_ig_id, content, scheduled_at, status)
         VALUES (?, ?, ?, ?, 'pending')`,
      )
      .bind(contactId, recipientIgId, content, now)
      .run();
  }

  /** 未送信メッセージを取得（古い順） */
  async findPending(limit: number): Promise<PendingMessage[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM pending_messages
         WHERE status = 'pending'
         ORDER BY scheduled_at ASC
         LIMIT ?`,
      )
      .bind(limit)
      .all<PendingMessageRow>();
    return result.results.map(rowToPendingMessage);
  }

  /** 送信済みにマーク */
  async markSent(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE pending_messages SET status = 'sent' WHERE id = ?")
      .bind(id, this.accountId)
      .run();
  }

  /** 失敗にマーク */
  async markFailed(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE pending_messages SET status = 'failed' WHERE id = ?")
      .bind(id, this.accountId)
      .run();
  }
}
