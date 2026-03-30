import { describe, expect, it } from "vitest";
import { ContactRepository } from "../contacts/repository.js";
import { KeywordRuleRepository } from "../triggers/keyword-rule-repository.js";
import { createGenericD1Mock } from "./helpers/d1-mock.js";

describe("multi-account repository isolation", () => {
  it("ContactRepository でアカウントAのデータがアカウントBの findAll() に出ない", async () => {
    const db = createGenericD1Mock();
    const repoA = new ContactRepository(db, "a");
    const repoB = new ContactRepository(db, "b");

    await repoA.create("ig-a", "user-a");

    const contactsA = await repoA.findAll();
    const contactsB = await repoB.findAll();

    expect(contactsA).toHaveLength(1);
    expect(contactsA[0]?.igUserId).toBe("ig-a");
    expect(contactsB).toHaveLength(0);
  });

  it("KeywordRuleRepository でアカウントAのデータがアカウントBの findAll() に出ない", async () => {
    const db = createGenericD1Mock();
    const repoA = new KeywordRuleRepository(db, "a");
    const repoB = new KeywordRuleRepository(db, "b");

    await repoA.create("hello", "exact", "Hi from A");

    const rulesA = await repoA.findAll();
    const rulesB = await repoB.findAll();

    expect(rulesA).toHaveLength(1);
    expect(rulesA[0]?.responseText).toBe("Hi from A");
    expect(rulesB).toHaveLength(0);
  });
});
