#!/usr/bin/env npx tsx
import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const WRANGLER_TOML = resolve(ROOT, "apps/worker/wrangler.toml");
const MIGRATIONS_DIR = resolve(ROOT, "packages/db/migrations");
const WORKER_DIR = resolve(ROOT, "apps/worker");

function run(cmd: string, opts?: { cwd?: string; input?: string }): string {
  try {
    return execSync(cmd, {
      cwd: opts?.cwd ?? ROOT,
      input: opts?.input,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (e: unknown) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    throw new Error(err.stderr || err.stdout || err.message || "Command failed");
  }
}

function cancelled(): never {
  p.cancel("セットアップをキャンセルしたよ。");
  return process.exit(1) as never;
}

async function main() {
  p.intro("🛝 slidein — セットアップ");

  p.note(
    [
      "必要なもの:",
      "  • Node.js ≥ 20 & pnpm",
      "  • Cloudflare アカウント（無料プランでOK）",
      "  • Meta Developer App（Instagram API追加済み）",
      "",
      "聞かれるのは3つだけ！あとは全部自動だよ ✨",
    ].join("\n"),
    "はじめる前に"
  );

  // ── 1. Wrangler ログイン確認 ─────────────────────────────────────
  const loginSpinner = p.spinner();
  loginSpinner.start("Cloudflare のログイン状態を確認中…");

  let loggedIn = false;
  try {
    const whoami = run("npx wrangler whoami");
    loggedIn = !whoami.toLowerCase().includes("not authenticated");
  } catch {
    loggedIn = false;
  }

  if (!loggedIn) {
    loginSpinner.stop("Cloudflare 未ログイン");
    p.log.warn("ブラウザが開くから、Cloudflare にログインしてね 🌐");
    try {
      execSync("npx wrangler login", { cwd: ROOT, stdio: "inherit" });
    } catch {
      p.log.error("ログイン失敗。手動で npx wrangler login を実行してね。");
      process.exit(1);
    }
  } else {
    loginSpinner.stop("Cloudflare ログイン済み ✓");
  }

  // ── 2. Meta 認証情報（聞くのは3つだけ！） ───────────────────────
  p.log.step("Meta の認証情報を入力してね");

  const metaAppSecret = await p.text({
    message: "Meta App Secret（Meta Console → アプリ設定 → ベーシック）",
    validate: (v) => (!v ? "必須だよ！" : undefined),
  });
  if (p.isCancel(metaAppSecret)) cancelled();

  const metaAccessToken = await p.text({
    message: "Meta Access Token（Instagram → APIセットアップ → トークンを生成）",
    validate: (v) => (!v ? "必須だよ！" : undefined),
  });
  if (p.isCancel(metaAccessToken)) cancelled();

  const igAccountId = await p.text({
    message: "Instagram アカウントID（Instagram → APIセットアップに表示されてるよ）",
    validate: (v) => (!v ? "必須だよ！" : undefined),
  });
  if (p.isCancel(igAccountId)) cancelled();

  // 自動生成（ユーザーには聞かない）
  const adminApiKey = randomUUID();
  const webhookVerifyToken = randomUUID();

  p.log.info(`🔑 管理画面パスワード（自動生成）: ${adminApiKey}`);
  p.log.info(`🔐 Webhook検証トークン（自動生成）: ${webhookVerifyToken}`);
  p.log.warn("↑ この2つはメモしておいてね！");

  // ── 3. D1 データベース（全自動） ────────────────────────────────
  const tomlContent = readFileSync(WRANGLER_TOML, "utf-8");
  const existingId = tomlContent.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
  const hasRealId = existingId && existingId !== "YOUR_D1_DATABASE_ID";

  let databaseId: string;

  if (hasRealId) {
    databaseId = existingId;
    p.log.info(`既存のデータベースを使うよ: ${databaseId}`);
  } else {
    const dbSpinner = p.spinner();
    dbSpinner.start("D1 データベースを作成中…");
    try {
      const output = run("npx wrangler d1 create slidein-db");
      const idMatch = output.match(/database_id\s*=\s*"([^"]+)"/);
      if (idMatch) {
        databaseId = idMatch[1];
      } else {
        // パース失敗 → d1 list で取得
        const listOutput = run("npx wrangler d1 list --json");
        const dbs = JSON.parse(listOutput);
        const db = dbs.find((d: { name: string }) => d.name === "slidein-db");
        databaseId = db?.uuid || db?.id || "";
      }
      if (!databaseId) throw new Error("IDの取得に失敗");
      dbSpinner.stop(`データベース作成完了: ${databaseId}`);
    } catch (e: unknown) {
      dbSpinner.stop("作成失敗");
      // 既に存在する場合は list で取得
      try {
        const listOutput = run("npx wrangler d1 list --json");
        const dbs = JSON.parse(listOutput);
        const db = dbs.find((d: { name: string }) => d.name === "slidein-db");
        databaseId = db?.uuid || db?.id || "";
        if (databaseId) {
          p.log.info(`既存のデータベースを見つけたよ: ${databaseId}`);
        } else {
          throw new Error("not found");
        }
      } catch {
        p.log.error("データベースIDを自動取得できなかった。npx wrangler d1 list で確認してね。");
        process.exit(1);
      }
    }
  }

  // wrangler.toml 更新（database_id + IG_ACCOUNT_ID）
  let updatedToml = readFileSync(WRANGLER_TOML, "utf-8");
  updatedToml = updatedToml.replace(
    /database_id\s*=\s*"[^"]*"/,
    `database_id = "${databaseId}"`
  );
  // IG_ACCOUNT_ID を vars に書く
  if (updatedToml.includes("# IG_ACCOUNT_ID")) {
    updatedToml = updatedToml.replace(/# IG_ACCOUNT_ID = ""/, `IG_ACCOUNT_ID = "${igAccountId}"`);
  } else if (!updatedToml.includes(`IG_ACCOUNT_ID = "${igAccountId}"`)) {
    updatedToml = updatedToml.replace(/\[vars\]/, `[vars]\nIG_ACCOUNT_ID = "${igAccountId}"`);
  }
  writeFileSync(WRANGLER_TOML, updatedToml);
  p.log.success("wrangler.toml 更新完了");

  // ── 4. マイグレーション（確認なし・自動実行） ──────────────────
  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const migSpinner = p.spinner();
  for (const file of migrations) {
    migSpinner.start(`マイグレーション: ${file}`);
    try {
      run(
        `npx wrangler d1 execute slidein-db --remote --file=${MIGRATIONS_DIR}/${file}`,
        { cwd: WORKER_DIR }
      );
      migSpinner.stop(`✓ ${file}`);
    } catch {
      migSpinner.stop(`✓ ${file}（適用済み）`);
    }
  }
  p.log.success(`${migrations.length}個のマイグレーション完了`);

  // ── 5. シークレット設定 ─────────────────────────────────────────
  const secrets: [string, string][] = [
    ["META_APP_SECRET", metaAppSecret],
    ["META_ACCESS_TOKEN", metaAccessToken],
    ["ADMIN_API_KEY", adminApiKey],
    ["WEBHOOK_VERIFY_TOKEN", webhookVerifyToken],
  ];

  const secretSpinner = p.spinner();
  for (const [name, value] of secrets) {
    secretSpinner.start(`シークレット設定: ${name}`);
    try {
      // echo パイプ方式（Windows/Mac両対応）
      const isWindows = process.platform === "win32";
      const cmd = isWindows
        ? `echo ${value}| npx wrangler secret put ${name}`
        : `echo '${value}' | npx wrangler secret put ${name}`;
      run(cmd, { cwd: WORKER_DIR });
      secretSpinner.stop(`✓ ${name}`);
    } catch {
      // フォールバック: stdin パイプ
      try {
        run(`npx wrangler secret put ${name}`, { cwd: WORKER_DIR, input: value });
        secretSpinner.stop(`✓ ${name}`);
      } catch {
        secretSpinner.stop(`✗ ${name}`);
        p.log.error(`${name} の設定に失敗。手動で設定してね:`);
        p.log.info(`  cd apps/worker && npx wrangler secret put ${name}`);
      }
    }
  }

  // ── 6. デプロイ ─────────────────────────────────────────────────
  const deploySpinner = p.spinner();
  deploySpinner.start("Worker をデプロイ中…");

  let workerUrl = "https://<your-worker>.workers.dev";
  try {
    const output = run("npx wrangler deploy", { cwd: WORKER_DIR });
    const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
    if (urlMatch) workerUrl = urlMatch[0];
    deploySpinner.stop("Worker デプロイ完了 ✓");
  } catch (e: unknown) {
    deploySpinner.stop("デプロイ失敗");
    const err = e as { message?: string };
    p.log.error(err.message ?? "Unknown error");
    p.log.info("手動でデプロイ: cd apps/worker && npx wrangler deploy");
  }

  // ── 7. 完了 ─────────────────────────────────────────────────────
  p.note(
    [
      `Worker URL:         ${workerUrl}`,
      `管理画面パスワード: ${adminApiKey}`,
      `Webhook検証トークン: ${webhookVerifyToken}`,
      "",
      "次にやること:",
      `  1. Meta Developer Console → Webhook設定`,
      `  2. コールバックURL: ${workerUrl}/webhook`,
      `  3. 検証トークン:    ${webhookVerifyToken}`,
      `  4. サブスクライブ:  messages, messaging_postbacks, comments`,
      "",
      "管理画面を起動:",
      "  cd apps/web && pnpm dev",
    ].join("\n"),
    "🎉 セットアップ完了！"
  );

  p.outro("Happy automating! 🛝");
}

main().catch((err) => {
  p.log.error(err.message ?? "Unexpected error");
  process.exit(1);
});
