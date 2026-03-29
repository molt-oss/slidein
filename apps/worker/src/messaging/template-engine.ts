/**
 * Template Engine — テンプレート変数の解決
 *
 * {{name}}, {{username}}, {{score}}, {{tags}} をコンタクト情報で置換
 */

interface TemplateContact {
  displayName: string | null;
  username: string | null;
  tags: string[];
  score?: number;
}

/** テンプレート変数を解決して文字列を返す */
export function resolveTemplate(
  text: string,
  contact: TemplateContact,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    switch (key) {
      case "name":
        return contact.displayName ?? contact.username ?? "there";
      case "username":
        return contact.username ?? "unknown";
      case "score":
        return String(contact.score ?? 0);
      case "tags":
        return contact.tags.length > 0 ? contact.tags.join(", ") : "";
      default:
        return `{{${key}}}`;
    }
  });
}

/** テンプレート変数が含まれているかチェック */
export function hasTemplateVars(text: string): boolean {
  return /\{\{\w+\}\}/.test(text);
}
