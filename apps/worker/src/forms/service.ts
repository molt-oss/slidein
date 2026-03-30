/**
 * Form Service — DM経由のフォーム回答収集
 */
import { structuredLog } from "@slidein/shared";
import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { ContactRepository } from "../contacts/repository.js";
import { FormRepository, FormResponseRepository } from "./repository.js";
import type { Form, FormField, FormResponse, CreateFormInput } from "./types.js";

interface FormServiceDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
  accountId?: string;
}

export class FormService {
  private readonly formRepo: FormRepository;
  private readonly responseRepo: FormResponseRepository;
  private readonly contactRepo: ContactRepository;
  private readonly deps: FormServiceDeps;

  constructor(deps: FormServiceDeps) {
    this.deps = deps;
    const accountId = deps.accountId ?? 'default';
    this.formRepo = new FormRepository(deps.db, accountId);
    this.responseRepo = new FormResponseRepository(deps.db, accountId);
    this.contactRepo = new ContactRepository(deps.db, accountId);
  }

  async listForms(): Promise<Form[]> {
    return this.formRepo.findAll();
  }

  async createForm(input: CreateFormInput): Promise<Form> {
    const form = await this.formRepo.create(
      input.name,
      input.fields,
      input.thankYouMessage ?? "Thank you!",
    );
    structuredLog("info", "Form created", { formId: form.id });
    return form;
  }

  async deleteForm(id: string): Promise<boolean> {
    const deleted = await this.formRepo.delete(id);
    if (deleted) {
      structuredLog("info", "Form deleted", { formId: id });
    }
    return deleted;
  }

  async getResponses(formId: string): Promise<FormResponse[]> {
    return this.responseRepo.findByFormId(formId);
  }

  /** フォーム開始: 最初の質問をDM送信 */
  async startForm(
    formId: string,
    contactId: string,
  ): Promise<void> {
    const form = await this.formRepo.findById(formId);
    if (!form || form.fields.length === 0) {
      structuredLog("warn", "Form not found or empty", { formId });
      return;
    }

    const contact = await this.contactRepo.findById(contactId);
    if (!contact) return;

    // 新規回答レコード作成
    await this.responseRepo.create(formId, contactId);

    // 最初の質問送信
    const firstField = form.fields[0];
    await this.sendQuestion(contact.igUserId, firstField.label);

    structuredLog("info", "Form started", { formId, contactId });
  }

  /** 進行中のフォームがあるか確認 */
  async getActiveFormResponse(
    contactId: string,
  ): Promise<FormResponse | null> {
    return this.responseRepo.findActiveByContactId(contactId);
  }

  /** 回答処理: 保存 + 次の質問送信 or 完了 */
  async processAnswer(
    contactId: string,
    answerText: string,
  ): Promise<boolean> {
    const active = await this.responseRepo.findActiveByContactId(contactId);
    if (!active) return false;

    const form = await this.formRepo.findById(active.formId);
    if (!form) return false;

    const contact = await this.contactRepo.findById(contactId);
    if (!contact) return false;

    const currentField = form.fields[active.currentFieldIndex];
    if (!currentField) return false;

    // 型バリデーション
    const validationError = this.validateAnswer(currentField, answerText);
    if (validationError) {
      await this.sendQuestion(contact.igUserId, validationError);
      return true;
    }

    // 回答を保存
    const responses = { ...active.responses, [currentField.key]: answerText };
    const nextIndex = active.currentFieldIndex + 1;

    if (nextIndex >= form.fields.length) {
      // フォーム完了
      await this.responseRepo.updateResponse(active.id, responses, nextIndex);
      await this.responseRepo.complete(active.id);
      await this.sendQuestion(contact.igUserId, form.thankYouMessage);
      structuredLog("info", "Form completed", {
        formId: form.id,
        contactId,
      });
    } else {
      // 次の質問
      await this.responseRepo.updateResponse(active.id, responses, nextIndex);
      const nextField = form.fields[nextIndex];
      await this.sendQuestion(contact.igUserId, nextField.label);
    }

    return true;
  }

  /** フィールド型に応じた回答バリデーション。エラー時はメッセージ文字列を返す */
  private validateAnswer(field: FormField, answer: string): string | null {
    switch (field.type) {
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)
          ? null
          : "Please enter a valid email address.";
      case "number":
        return !Number.isNaN(Number(answer))
          ? null
          : "Please enter a number.";
      default:
        return null;
    }
  }

  private async sendQuestion(
    recipientIgId: string,
    text: string,
  ): Promise<void> {
    const canSend = await consumeToken(
      { db: this.deps.db },
      `dm:${this.deps.igAccountId}`,
    );
    if (!canSend) {
      structuredLog("warn", "Rate limit exceeded for form question");
      return;
    }

    try {
      await sendTextMessage({
        recipientId: recipientIgId,
        messageText: text,
        accessToken: this.deps.accessToken,
        igAccountId: this.deps.igAccountId,
      });
    } catch (error) {
      structuredLog("error", "Failed to send form question", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
