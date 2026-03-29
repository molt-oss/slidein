#!/usr/bin/env npx tsx
import * as p from "@clack/prompts";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const WRANGLER_TOML = resolve(ROOT, "apps/worker/wrangler.toml");
const MIGRATIONS_DIR = resolve(ROOT, "packages/db/migrations");
const WORKER_DIR = resolve(ROOT, "apps/worker");

const MIGRATIONS = [
  "0001_initial_schema.sql",
  "0002_pending_messages.sql",
  "0003_scenarios.sql",
  "0004_phase3_batch1.sql",
  "0005_phase3_batch2.sql",
  "0006_phase3_batch3.sql",
];

function run(cmd: string, opts?: { cwd?: string; input?: string }): string {
  try {
    return execSync(cmd, {
      cwd: opts?.cwd ?? ROOT,
      input: opts?.input,
      encoding: "utf-8",
      stdio: opts?.input ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
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
  p.intro("🛠  slidein — interactive setup");

  p.note(
    [
      "Prerequisites:",
      "  • Node.js ≥ 20",
      "  • pnpm installed",
      "  • Cloudflare account (free tier works)",
      "  • Meta Developer App with Instagram permissions",
    ].join("\n"),
    "Before you begin"
  );

  // ── 1. Check wrangler login ──────────────────────────────────────────
  const loginSpinner = p.spinner();
  loginSpinner.start("Checking Wrangler authentication…");

  let loggedIn = false;
  try {
    const whoami = run("npx wrangler whoami");
    loggedIn = !whoami.toLowerCase().includes("not authenticated");
  } catch {
    loggedIn = false;
  }

  if (!loggedIn) {
    loginSpinner.stop("Not logged in to Wrangler");
    p.log.warn("You need to log in to Cloudflare via Wrangler.");
    p.log.info("Opening browser for authentication…");
    try {
      execSync("npx wrangler login", { cwd: ROOT, stdio: "inherit" });
    } catch {
      p.log.error("Wrangler login failed. Please run 'npx wrangler login' manually.");
      process.exit(1);
    }
  } else {
    loginSpinner.stop("Wrangler authenticated ✓");
  }

  // ── 2. D1 Database ──────────────────────────────────────────────────
  const tomlContent = readFileSync(WRANGLER_TOML, "utf-8");
  const existingId = tomlContent.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
  const hasRealId = existingId && existingId !== "YOUR_D1_DATABASE_ID";

  let databaseId: string;

  if (hasRealId) {
    const overwrite = await p.confirm({
      message: `wrangler.toml already has database_id "${existingId}". Overwrite?`,
      initialValue: false,
    });
    if (p.isCancel(overwrite)) cancelled();

    if (!overwrite) {
      databaseId = existingId;
      p.log.info(`Keeping existing database_id: ${databaseId}`);
    } else {
      databaseId = await askForDatabase();
    }
  } else {
    databaseId = await askForDatabase();
  }

  // Update wrangler.toml
  const currentToml = readFileSync(WRANGLER_TOML, "utf-8");
  const updatedToml = currentToml.replace(
    /database_id\s*=\s*"[^"]*"/,
    `database_id = "${databaseId}"`
  );
  if (updatedToml !== currentToml) {
    writeFileSync(WRANGLER_TOML, updatedToml);
    p.log.success("Updated wrangler.toml with database_id");
  }

  // ── 3. Run migrations ───────────────────────────────────────────────
  const runMigrations = await p.confirm({
    message: "Run D1 migrations on remote database?",
    initialValue: true,
  });
  if (p.isCancel(runMigrations)) cancelled();

  if (runMigrations) {
    const migSpinner = p.spinner();
    for (const file of MIGRATIONS) {
      migSpinner.start(`Running migration: ${file}`);
      try {
        run(
          `npx wrangler d1 execute slidein-db --remote --file=${MIGRATIONS_DIR}/${file}`,
          { cwd: WORKER_DIR }
        );
        migSpinner.stop(`✓ ${file}`);
      } catch (e: unknown) {
        migSpinner.stop(`✗ ${file}`);
        const err = e as { message?: string };
        p.log.error(`Migration failed: ${file}`);
        p.log.error(err.message ?? "Unknown error");
        p.log.info("Fix the issue and re-run setup to continue.");
        process.exit(1);
      }
    }
    p.log.success("All migrations applied");
  }

  // ── 4. Secrets ──────────────────────────────────────────────────────
  p.log.step("Configure secrets");

  const metaAppSecret = await p.text({
    message: "META_APP_SECRET (from Meta Developer Console)",
    validate: (v) => (!v ? "Required" : undefined),
  });
  if (p.isCancel(metaAppSecret)) cancelled();

  const metaAccessToken = await p.text({
    message: "META_ACCESS_TOKEN (long-lived page access token)",
    validate: (v) => (!v ? "Required" : undefined),
  });
  if (p.isCancel(metaAccessToken)) cancelled();

  const adminApiKey = await p.text({
    message: "ADMIN_API_KEY (leave empty to auto-generate)",
    defaultValue: "",
  });
  if (p.isCancel(adminApiKey)) cancelled();

  const webhookVerifyToken = await p.text({
    message: "WEBHOOK_VERIFY_TOKEN (leave empty to auto-generate)",
    defaultValue: "",
  });
  if (p.isCancel(webhookVerifyToken)) cancelled();

  const aiApiKey = await p.text({
    message: "AI_API_KEY (leave empty to skip — needed for AI auto-reply)",
    defaultValue: "",
  });
  if (p.isCancel(aiApiKey)) cancelled();

  const resolvedAdminKey = adminApiKey || randomUUID();
  const resolvedWebhookToken = webhookVerifyToken || randomUUID();

  const secrets: [string, string][] = [
    ["META_APP_SECRET", metaAppSecret],
    ["META_ACCESS_TOKEN", metaAccessToken],
    ["ADMIN_API_KEY", resolvedAdminKey],
    ["WEBHOOK_VERIFY_TOKEN", resolvedWebhookToken],
  ];
  if (aiApiKey) {
    secrets.push(["AI_API_KEY", aiApiKey]);
  }

  const secretSpinner = p.spinner();
  for (const [name, value] of secrets) {
    secretSpinner.start(`Setting secret: ${name}`);
    try {
      run(`npx wrangler secret put ${name}`, { cwd: WORKER_DIR, input: value });
      secretSpinner.stop(`✓ ${name}`);
    } catch (e: unknown) {
      secretSpinner.stop(`✗ ${name}`);
      const err = e as { message?: string };
      p.log.error(`Failed to set ${name}: ${err.message ?? "Unknown error"}`);
      p.log.info(`You can set it manually: echo "value" | npx wrangler secret put ${name}`);
    }
  }

  if (!adminApiKey) {
    p.log.info(`Auto-generated ADMIN_API_KEY: ${resolvedAdminKey}`);
    p.log.warn("Save this key — you'll need it to access the admin API.");
  }
  if (!webhookVerifyToken) {
    p.log.info(`Auto-generated WEBHOOK_VERIFY_TOKEN: ${resolvedWebhookToken}`);
    p.log.warn("Save this token — you'll need it for Meta webhook setup.");
  }

  // ── 5. Deploy ───────────────────────────────────────────────────────
  const deploy = await p.confirm({
    message: "Deploy the worker now?",
    initialValue: true,
  });
  if (p.isCancel(deploy)) cancelled();

  let workerUrl = "https://<your-worker>.workers.dev";
  if (deploy) {
    const deploySpinner = p.spinner();
    deploySpinner.start("Deploying worker…");
    try {
      const output = run("npx wrangler deploy", { cwd: WORKER_DIR });
      const urlMatch = output.match(/https:\/\/[^\s]+\.workers\.dev/);
      if (urlMatch) workerUrl = urlMatch[0];
      deploySpinner.stop("Worker deployed ✓");
    } catch (e: unknown) {
      deploySpinner.stop("Deploy failed");
      const err = e as { message?: string };
      p.log.error(err.message ?? "Unknown error");
      p.log.info("You can deploy manually: cd apps/worker && npx wrangler deploy");
    }
  }

  // ── 6. Summary ──────────────────────────────────────────────────────
  p.note(
    [
      `Worker URL:  ${workerUrl}`,
      "",
      "Next steps:",
      `  1. Go to Meta Developer Console → Webhooks`,
      `  2. Set callback URL:  ${workerUrl}/webhook`,
      `  3. Set verify token:  ${resolvedWebhookToken}`,
      `  4. Subscribe to: messages, messaging_postbacks`,
      "",
      "Dashboard (if deploying web app):",
      "  cd apps/web && pnpm dev",
      "",
      "Docs: https://github.com/molt-oss/slidein#readme",
    ].join("\n"),
    "Setup complete!"
  );

  p.outro("Happy automating! 🚀");
}

async function askForDatabase(): Promise<string> {
  const choice = await p.select({
    message: "D1 Database setup",
    options: [
      { value: "new", label: "Create a new D1 database" },
      { value: "existing", label: "Use an existing database ID" },
    ],
  });
  if (p.isCancel(choice)) cancelled();

  if (choice === "new") {
    const createSpinner = p.spinner();
    createSpinner.start("Creating D1 database 'slidein-db'…");
    try {
      const output = run("npx wrangler d1 create slidein-db");
      const idMatch = output.match(/database_id\s*=\s*"([^"]+)"/);
      if (!idMatch) {
        createSpinner.stop("Created but could not parse ID");
        p.log.warn("Output:\n" + output);
        const manualId = await p.text({
          message: "Please paste the database_id from the output above",
          validate: (v) => (!v ? "Required" : undefined),
        });
        if (p.isCancel(manualId)) cancelled();
        return manualId;
      }
      createSpinner.stop(`Database created: ${idMatch[1]}`);
      return idMatch[1];
    } catch (e: unknown) {
      createSpinner.stop("Failed to create database");
      const err = e as { message?: string };
      p.log.error(err.message ?? "Unknown error");
      p.log.info("If the database already exists, choose 'Use existing' and provide the ID.");
      const fallbackId = await p.text({
        message: "Enter database_id manually",
        validate: (v) => (!v ? "Required" : undefined),
      });
      if (p.isCancel(fallbackId)) cancelled();
      return fallbackId;
    }
  }

  const existingId = await p.text({
    message: "Enter your D1 database_id",
    validate: (v) => (!v ? "Required" : undefined),
  });
  if (p.isCancel(existingId)) cancelled();
  return existingId;
}

main().catch((err) => {
  p.log.error(err.message ?? "Unexpected error");
  process.exit(1);
});
