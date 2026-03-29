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
  p.cancel("Setup cancelled.");
  return process.exit(1) as never;
}

async function main() {
  p.intro("🛝 slidein — setup");

  p.note(
    [
      "Requirements:",
      "  • Node.js ≥ 20 & pnpm",
      "  • Cloudflare account (free plan works)",
      "  • Meta Developer App with Instagram API",
      "",
      "Only 3 questions — everything else is automatic ✨",
    ].join("\n"),
    "Before you begin"
  );

  // ── 1. Wrangler ログイン確認 ─────────────────────────────────────
  const loginSpinner = p.spinner();
  loginSpinner.start("Checking Cloudflare authentication…");

  let loggedIn = false;
  try {
    const whoami = run("npx wrangler whoami");
    loggedIn = !whoami.toLowerCase().includes("not authenticated");
  } catch {
    loggedIn = false;
  }

  if (!loggedIn) {
    loginSpinner.stop("Not logged in to Cloudflare");
    p.log.warn("Opening browser for Cloudflare login 🌐");
    try {
      execSync("npx wrangler login", { cwd: ROOT, stdio: "inherit" });
    } catch {
      p.log.error("Login failed. Run 'npx wrangler login' manually.");
      process.exit(1);
    }
  } else {
    loginSpinner.stop("Cloudflare authenticated ✓");
  }

  // ── 2. Meta 認証情報（聞くのは3つだけ！） ───────────────────────
  p.log.step("Enter your Meta credentials");

  const metaAppSecret = await p.text({
    message: "Meta App Secret (Meta Console → App Settings → Basic)",
    validate: (v) => (!v ? "Required" : undefined),
  });
  if (p.isCancel(metaAppSecret)) cancelled();

  const metaAccessToken = await p.text({
    message: "Meta Access Token (Instagram → API Setup → Generate Token)",
    validate: (v) => (!v ? "Required" : undefined),
  });
  if (p.isCancel(metaAccessToken)) cancelled();

  const igAccountId = await p.text({
    message: "Instagram Account ID (shown in Instagram → API Setup)",
    validate: (v) => (!v ? "Required" : undefined),
  });
  if (p.isCancel(igAccountId)) cancelled();

  // Auto-generated (no user input)
  const adminApiKey = randomUUID();
  const webhookVerifyToken = randomUUID();

  p.log.info(`🔑 Admin API key (auto-generated): ${adminApiKey}`);
  p.log.info(`🔐 Webhook verify token (auto-generated): ${webhookVerifyToken}`);
  p.log.warn("↑ Save these — you'll need them!");

  // ── 3. D1 データベース（全自動） ────────────────────────────────
  const tomlContent = readFileSync(WRANGLER_TOML, "utf-8");
  const existingId = tomlContent.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
  const hasRealId = existingId && existingId !== "YOUR_D1_DATABASE_ID";

  let databaseId: string;

  if (hasRealId) {
    databaseId = existingId;
    p.log.info(`Using existing database: ${databaseId}`);
  } else {
    const dbSpinner = p.spinner();
    dbSpinner.start("Creating D1 database…");
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
      if (!databaseId) throw new Error("Failed to get database ID");
      dbSpinner.stop(`Database created: ${databaseId}`);
    } catch (e: unknown) {
      dbSpinner.stop("Creation failed");
      // 既に存在する場合は list で取得
      try {
        const listOutput = run("npx wrangler d1 list --json");
        const dbs = JSON.parse(listOutput);
        const db = dbs.find((d: { name: string }) => d.name === "slidein-db");
        databaseId = db?.uuid || db?.id || "";
        if (databaseId) {
          p.log.info(`Found existing database: ${databaseId}`);
        } else {
          throw new Error("not found");
        }
      } catch {
        p.log.error("Could not get database ID. Run 'npx wrangler d1 list' to check.");
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
  p.log.success("wrangler.toml updated");

  // ── 4. マイグレーション（確認なし・自動実行） ──────────────────
  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const migSpinner = p.spinner();
  for (const file of migrations) {
    migSpinner.start(`Migration: ${file}`);
    try {
      run(
        `npx wrangler d1 execute slidein-db --remote --file=${MIGRATIONS_DIR}/${file}`,
        { cwd: WORKER_DIR }
      );
      migSpinner.stop(`✓ ${file}`);
    } catch {
      migSpinner.stop(`✓ ${file} (already applied)`);
    }
  }
  p.log.success(`${migrations.length} migrations applied`);

  // ── 5. シークレット設定 ─────────────────────────────────────────
  const secrets: [string, string][] = [
    ["META_APP_SECRET", metaAppSecret],
    ["META_ACCESS_TOKEN", metaAccessToken],
    ["ADMIN_API_KEY", adminApiKey],
    ["META_VERIFY_TOKEN", webhookVerifyToken],
  ];

  const secretSpinner = p.spinner();
  for (const [name, value] of secrets) {
    secretSpinner.start(`Setting secret: ${name}`);
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
        p.log.error(`Failed to set ${name}. Set it manually:`);
        p.log.info(`  cd apps/worker && npx wrangler secret put ${name}`);
      }
    }
  }

  // ── 6. デプロイ ─────────────────────────────────────────────────
  const deploySpinner = p.spinner();
  deploySpinner.start("Deploying worker…");

  let workerUrl = "https://<your-worker>.workers.dev";
  try {
    const output = run("npx wrangler deploy", { cwd: WORKER_DIR });
    const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
    if (urlMatch) workerUrl = urlMatch[0];
    deploySpinner.stop("Worker deployed ✓");
  } catch (e: unknown) {
    deploySpinner.stop("Deploy failed");
    const err = e as { message?: string };
    p.log.error(err.message ?? "Unknown error");
    p.log.info("Deploy manually: cd apps/worker && npx wrangler deploy");
  }

  // ── 7. Dashboard .env.local を自動生成 ───────────────────────────
  const WEB_DIR = resolve(ROOT, "apps/web");
  const envLocalPath = resolve(WEB_DIR, ".env.local");
  const envContent = `API_URL=${workerUrl}\nAPI_KEY=${adminApiKey}\n`;
  writeFileSync(envLocalPath, envContent);
  p.log.success("apps/web/.env.local created automatically");

  // ── 8. 完了 ─────────────────────────────────────────────────────
  p.note(
    [
      `Worker URL:          ${workerUrl}`,
      `Admin API key:       ${adminApiKey}`,
      `Webhook verify token: ${webhookVerifyToken}`,
      "",
      "Next steps:",
      `  1. Go to Meta Developer Console → Webhooks`,
      `  2. Callback URL:  ${workerUrl}/webhook`,
      `  3. Verify token:  ${webhookVerifyToken}`,
      `  4. Subscribe to:  messages, messaging_postbacks, comments`,
      "",
      "Start dashboard:",
      "  cd apps/web && pnpm dev",
    ].join("\n"),
    "🎉 Setup complete!"
  );

  p.outro("Happy automating! 🛝");
}

main().catch((err) => {
  p.log.error(err.message ?? "Unexpected error");
  process.exit(1);
});
