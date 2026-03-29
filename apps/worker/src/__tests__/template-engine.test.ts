/**
 * テンプレートエンジン テスト
 */
import { describe, it, expect } from "vitest";
import { resolveTemplate, hasTemplateVars } from "../messaging/template-engine.js";

describe("resolveTemplate", () => {
  it("{{name}} をdisplayNameで置換する", () => {
    const result = resolveTemplate("Hello {{name}}!", {
      displayName: "John",
      username: "john123",
      tags: [],
    });
    expect(result).toBe("Hello John!");
  });

  it("displayNameがnullの場合はusernameにフォールバックする", () => {
    const result = resolveTemplate("Hello {{name}}!", {
      displayName: null,
      username: "john123",
      tags: [],
    });
    expect(result).toBe("Hello john123!");
  });

  it("両方nullの場合は'there'にフォールバックする", () => {
    const result = resolveTemplate("Hello {{name}}!", {
      displayName: null,
      username: null,
      tags: [],
    });
    expect(result).toBe("Hello there!");
  });

  it("{{username}} を置換する", () => {
    const result = resolveTemplate("@{{username}}", {
      displayName: null,
      username: "john123",
      tags: [],
    });
    expect(result).toBe("@john123");
  });

  it("{{score}} を置換する", () => {
    const result = resolveTemplate("Your score: {{score}}", {
      displayName: null,
      username: null,
      tags: [],
      score: 42,
    });
    expect(result).toBe("Your score: 42");
  });

  it("{{tags}} を置換する", () => {
    const result = resolveTemplate("Tags: {{tags}}", {
      displayName: null,
      username: null,
      tags: ["vip", "active"],
    });
    expect(result).toBe("Tags: vip, active");
  });

  it("未知の変数はそのまま残す", () => {
    const result = resolveTemplate("{{unknown}}", {
      displayName: null,
      username: null,
      tags: [],
    });
    expect(result).toBe("{{unknown}}");
  });

  it("複数の変数を同時に置換する", () => {
    const result = resolveTemplate(
      "Hi {{name}}! Score: {{score}}, Tags: {{tags}}",
      {
        displayName: "Alice",
        username: "alice",
        tags: ["vip"],
        score: 100,
      },
    );
    expect(result).toBe("Hi Alice! Score: 100, Tags: vip");
  });
});

describe("hasTemplateVars", () => {
  it("テンプレート変数を含む場合にtrueを返す", () => {
    expect(hasTemplateVars("Hello {{name}}!")).toBe(true);
  });

  it("テンプレート変数を含まない場合にfalseを返す", () => {
    expect(hasTemplateVars("Hello world!")).toBe(false);
  });
});
