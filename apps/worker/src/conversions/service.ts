/**
 * Conversion Service — CV計測ビジネスロジック
 */
import { structuredLog } from "@slidein/shared";
import { ContactRepository } from "../contacts/repository.js";
import { ConversionGoalRepository, ConversionRepository } from "./repository.js";
import type {
  ConversionGoal,
  CreateConversionGoalInput,
  ConversionReport,
} from "./types.js";

export class ConversionService {
  private readonly goalRepo: ConversionGoalRepository;
  private readonly conversionRepo: ConversionRepository;
  private readonly contactRepo: ContactRepository;

  constructor(db: D1Database) {
    this.goalRepo = new ConversionGoalRepository(db);
    this.conversionRepo = new ConversionRepository(db);
    this.contactRepo = new ContactRepository(db);
  }

  async listGoals(): Promise<ConversionGoal[]> {
    return this.goalRepo.findAll();
  }

  async createGoal(input: CreateConversionGoalInput): Promise<ConversionGoal> {
    const goal = await this.goalRepo.create(
      input.name,
      input.eventType,
      input.targetValue,
    );
    structuredLog("info", "Conversion goal created", { goalId: goal.id });
    return goal;
  }

  async deleteGoal(id: string): Promise<boolean> {
    const deleted = await this.goalRepo.delete(id);
    if (deleted) {
      structuredLog("info", "Conversion goal deleted", { goalId: id });
    }
    return deleted;
  }

  /** CV記録 */
  async recordConversion(goalId: string, contactId: string): Promise<void> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) {
      structuredLog("warn", "Conversion goal not found", { goalId });
      return;
    }

    await this.conversionRepo.record(goalId, contactId);
    structuredLog("info", "Conversion recorded", { goalId, contactId });
  }

  /** レポート生成: goal別のCV数・CVR計算 */
  async getReport(goalId: string): Promise<ConversionReport | null> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) return null;

    const totalConversions = await this.conversionRepo.countByGoal(goalId);
    const uniqueContacts =
      await this.conversionRepo.countUniqueContactsByGoal(goalId);
    const allContacts = await this.contactRepo.findAll();
    const totalContacts = allContacts.length;
    const cvr = totalContacts > 0 ? uniqueContacts / totalContacts : 0;

    return {
      goalId: goal.id,
      goalName: goal.name,
      totalConversions,
      uniqueContacts,
      totalContacts,
      cvr: Math.round(cvr * 10000) / 100, // percentage with 2 decimals
    };
  }
}
