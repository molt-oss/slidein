/**
 * Template Engine — テンプレート変数の解決
 *
 * {{name}}, {{username}}, {{score}}, {{tags}} をコンタクト情報で置換
 *
 * ## セキュリティ制約
 * - **出力形式はプレーンテキスト前提**（Instagram DM）。HTML出力には使わないこと。
 *   HTML表示が必要な場合は別途エスケープ処理を追加すること。
 * - 未知の変数（{{unknown}}）はそのまま残す（空文字に置換しない）。
 *   これにより、テンプレートの誤記を発見しやすくする。
 * - 変数値に `{{` を含むユーザー入力があっても、置換は1パスのみで
 *   再帰的な展開は行われないため、テンプレートインジェクションは発生しない。
 * - displayName/username 等のユーザー由来値をそのまま埋め込むが、
 *   DM送信はプレーンテキストのためHTMLエスケープは不要。
 */

interface TemplateContact {
  displayName: string | null;
  username: string | null;
  tags: string[];
  score?: number;
}

/**
 * テンプレート変数を解決して文字列を返す。
 *
 * ⚠️ 出力はプレーンテキスト前提（Instagram DM）。HTML表示には別途エスケープが必要。
 * 未知の変数はそのまま残す（例: {{unknown}} → "{{unknown}}"）。
 */
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
        // 未知の変数はそのまま残す（テンプレート誤記の検出を容易にするため）
        return `{{${key}}}`;
    }
  });
}

/** テンプレート変数が含まれているかチェック */
export function hasTemplateVars(text: string): boolean {
  return /\{\{\w+\}\}/.test(text);
}
