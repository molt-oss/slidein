/**
 * Scenario Service — シナリオ配信ビジネスロジック
 */
import { structuredLog } from "@slidein/shared";
import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { ContactRepository } from "../contacts/repository.js";
import { MessageRepository } from "../messaging/repository.js";
import { PendingMessageRepository } from "../messaging/pending-message-repository.js";
import { ScenarioRepository } from "./scenario-repository.js";
import { EnrollmentRepository } from "./enrollment-repository.js";
import type {
  ScenarioWithSteps,
  ScenarioEnrollment,
  CreateScenarioInput,
  UpdateScenarioInput,
} from "./types.js";

/** 24時間（ミリ秒） */
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface ScenarioServiceDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
}

export class ScenarioService {
  private readonly scenarioRepo: ScenarioRepository;
  private readonly enrollmentRepo: EnrollmentRepository;
  private readonly contactRepo: ContactRepository;
  private readonly messageRepo: MessageRepository;
  private readonly pendingRepo: PendingMessageRepository;
  private readonly deps: ScenarioServiceDeps;

  constructor(deps: ScenarioServiceDeps) {
    this.deps = deps;
    this.scenarioRepo = new ScenarioRepository(deps.db);
    this.enrollmentRepo = new EnrollmentRepository(deps.db);
    this.contactRepo = new ContactRepository(deps.db);
    this.messageRepo = new MessageRepository(deps.db);
    this.pendingRepo = new PendingMessageRepository(deps.db);
  }

  async listAll(): Promise<ScenarioWithSteps[]> {
    return this.scenarioRepo.findAll();
  }

  async getById(id: string): Promise<ScenarioWithSteps | null> {
    return this.scenarioRepo.findById(id);
  }

  async create(input: CreateScenarioInput): Promise<ScenarioWithSteps> {
    const scenario = await this.scenarioRepo.create(
      input.name, input.triggerType, input.description, input.triggerValue,
    );
    for (const step of input.steps) {
      await this.scenarioRepo.createStep(
        scenario.id, step.stepOrder, step.messageText,
        step.delaySeconds, step.conditionTag,
      );
    }
    const result = await this.scenarioRepo.findById(scenario.id);
    if (!result) throw new Error("Failed to retrieve created scenario");
    structuredLog("info", "Scenario created", { scenarioId: scenario.id });
    return result;
  }

  async update(id: string, input: UpdateScenarioInput): Promise<ScenarioWithSteps | null> {
    const existing = await this.scenarioRepo.findById(id);
    if (!existing) return null;
    await this.scenarioRepo.update(id, {
      name: input.name, description: input.description,
      triggerType: input.triggerType, triggerValue: input.triggerValue,
      enabled: input.enabled,
    });
    if (input.steps) {
      await this.scenarioRepo.deleteStepsByScenarioId(id);
      for (const step of input.steps) {
        await this.scenarioRepo.createStep(
          id, step.stepOrder, step.messageText, step.delaySeconds, step.conditionTag,
        );
      }
    }
    structuredLog("info", "Scenario updated", { scenarioId: id });
    return this.scenarioRepo.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    // Manual cascade: cancel active enrollments before deletion (D1 has no FK cascade guarantee)
    const enrollments = await this.enrollmentRepo.findByScenarioId(id);
    for (const e of enrollments) {
      if (e.status === "active") {
        await this.enrollmentRepo.cancel(e.id);
      }
    }
    const deleted = await this.scenarioRepo.delete(id);
    if (deleted) structuredLog("info", "Scenario deleted", { scenarioId: id });
    return deleted;
  }

  async enrollContact(
    contactId: string,
    scenarioId: string,
  ): Promise<ScenarioEnrollment> {
    const existing =
      await this.enrollmentRepo.findActiveByContactAndScenario(
        contactId,
        scenarioId,
      );
    if (existing) {
      structuredLog("info", "Contact already enrolled", {
        contactId,
        scenarioId,
      });
      return existing;
    }

    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    if (scenario.steps.length === 0) {
      throw new Error("Scenario has no steps");
    }

    const firstStep = scenario.steps[0];
    const nextSendAt = new Date(
      Date.now() + firstStep.delaySeconds * 1000,
    ).toISOString();

    const enrollment = await this.enrollmentRepo.enroll(
      contactId,
      scenarioId,
      nextSendAt,
    );

    structuredLog("info", "Contact enrolled in scenario", {
      contactId,
      scenarioId,
      nextSendAt,
    });
    return enrollment;
  }

  async listEnrollments(scenarioId: string): Promise<ScenarioEnrollment[]> {
    return this.enrollmentRepo.findByScenarioId(scenarioId);
  }

  // --- Cron: Process ready steps ---

  async processReadySteps(): Promise<void> {
    const now = new Date().toISOString();
    const readyEnrollments = await this.enrollmentRepo.getReadyToSend(now);

    structuredLog("info", "Processing scenario steps", {
      count: readyEnrollments.length,
    });

    for (const enrollment of readyEnrollments) {
      await this.processOneEnrollment(enrollment);
    }
  }

  private async processOneEnrollment(
    enrollment: ScenarioEnrollment,
  ): Promise<void> {
    const scenario = await this.scenarioRepo.findById(enrollment.scenarioId);
    if (!scenario || !scenario.enabled) {
      await this.enrollmentRepo.cancel(enrollment.id);
      return;
    }

    const currentStep = scenario.steps.find(
      (s) => s.stepOrder === enrollment.currentStepOrder,
    );
    if (!currentStep) {
      await this.enrollmentRepo.complete(enrollment.id);
      return;
    }

    // 条件分岐: タグチェック
    if (currentStep.conditionTag) {
      const hasTag = await this.checkContactTag(
        enrollment.contactId,
        currentStep.conditionTag,
      );
      if (!hasTag) {
        structuredLog("info", "Condition tag not met, skipping step", {
          enrollmentId: enrollment.id,
          tag: currentStep.conditionTag,
        });
        await this.advanceToNextStep(enrollment, scenario);
        return;
      }
    }

    // 24時間ルールチェック
    const contact = await this.contactRepo.findById(enrollment.contactId);
    if (!contact) {
      await this.enrollmentRepo.cancel(enrollment.id);
      return;
    }

    const elapsed = Date.now() - new Date(contact.lastMessageAt).getTime();
    if (elapsed > TWENTY_FOUR_HOURS_MS) {
      // Increment retry count and fail after 3 attempts to prevent infinite retry
      const retryCount = (enrollment as ScenarioEnrollment & { retryCount?: number }).retryCount ?? 0;
      if (retryCount >= 3) {
        structuredLog("warn", "24h window expired, max retries reached — cancelling", {
          enrollmentId: enrollment.id,
          contactId: enrollment.contactId,
          retryCount,
        });
        await this.enrollmentRepo.cancel(enrollment.id);
        return;
      }
      structuredLog("warn", "24h window expired for scenario step", {
        enrollmentId: enrollment.id,
        contactId: enrollment.contactId,
        retryCount: retryCount + 1,
      });
      // Delay next check by 1 hour to reduce churn
      const nextRetry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await this.enrollmentRepo.advance(
        enrollment.id,
        enrollment.currentStepOrder,
        nextRetry,
      );
      return;
    }

    // レート制限
    const canSend = await consumeToken(
      { db: this.deps.db },
      `dm:${this.deps.igAccountId}`,
    );
    if (!canSend) {
      structuredLog("warn", "Rate limit exceeded for scenario step", {
        enrollmentId: enrollment.id,
      });
      await this.pendingRepo.enqueue(
        enrollment.contactId,
        contact.igUserId,
        currentStep.messageText,
      );
      await this.advanceToNextStep(enrollment, scenario);
      return;
    }

    // 送信
    try {
      const result = await sendTextMessage({
        recipientId: contact.igUserId,
        messageText: currentStep.messageText,
        accessToken: this.deps.accessToken,
        igAccountId: this.deps.igAccountId,
      });
      await this.messageRepo.create(
        enrollment.contactId,
        "out",
        currentStep.messageText,
        result.messageId,
      );
      structuredLog("info", "Scenario step sent", {
        enrollmentId: enrollment.id,
        stepOrder: currentStep.stepOrder,
        messageId: result.messageId,
      });
    } catch (error) {
      structuredLog("error", "Failed to send scenario step", {
        enrollmentId: enrollment.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    await this.advanceToNextStep(enrollment, scenario);
  }

  private async advanceToNextStep(
    enrollment: ScenarioEnrollment,
    scenario: ScenarioWithSteps,
  ): Promise<void> {
    const nextStep = scenario.steps.find(
      (s) => s.stepOrder === enrollment.currentStepOrder + 1,
    );
    if (!nextStep) {
      await this.enrollmentRepo.complete(enrollment.id);
      structuredLog("info", "Scenario completed", {
        enrollmentId: enrollment.id,
        scenarioId: scenario.id,
      });
      return;
    }
    const nextSendAt = new Date(
      Date.now() + nextStep.delaySeconds * 1000,
    ).toISOString();
    await this.enrollmentRepo.advance(
      enrollment.id,
      nextStep.stepOrder,
      nextSendAt,
    );
  }

  private async checkContactTag(
    contactId: string,
    tag: string,
  ): Promise<boolean> {
    const contact = await this.contactRepo.findById(contactId);
    if (!contact) return false;
    return contact.tags.includes(tag);
  }
}
