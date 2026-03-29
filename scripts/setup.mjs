#!/usr/bin/env node
/**
 * slidein — ワンコマンドセットアップ
 * 
 * Usage: pnpm run setup
 * 
 * やること:
 * 1. Cloudflareログイン確認
 * 2. Meta の認証情報を対話形式で聞く
 * 3. D1データベース作成
 * 4. wrangler.toml に database_id を自動書き込み
 * 5. マイグレーション全実行
 * 6. シークレット設定
 * 7. デプロイ
 * 8. Webhook URL表示
 */

import { execSync, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const WORKER_DIR = join(ROOT, 'apps/worker');
const TOML_PATH = join(WORKER_DIR, 'wrangler.toml');
const MIGRATIONS_DIR = join(ROOT, 'packages/db/migrations');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: opts.silent ? 'pipe' : 'inherit', ...opts }).trim();
  } catch (e) {
    if (!opts.ignoreError) {
      console.error(`\n❌ コマンド失敗: ${cmd}`);
      process.exit(1);
    }
    return '';
  }
}

function header(text) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🛝  ${text}`);
  console.log(`${'─'.repeat(50)}\n`);
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║  🛝  slidein — ワンコマンドセットアップ   ║
  ║     全部無料。クレカ不要。15分で完了。     ║
  ╚══════════════════════════════════════════╝
  `);

  // ────────────────────────────────────────
  // Step 1: Cloudflare ログイン確認
  // ────────────────────────────────────────
  header('Step 1/5: Cloudflare ログイン');
  console.log('Cloudflareにログインしてるか確認するよ...\n');

  const whoami = run('npx wrangler whoami 2>&1', { silent: true, ignoreError: true });
  if (whoami.includes('Not logged in') || whoami.includes('error')) {
    console.log('まだログインしてないね！ブラウザが開くからCloudflareにログインしてね 🌐\n');
    run('npx wrangler login');
    console.log('\n✅ ログイン完了！');
  } else {
    console.log('✅ すでにログイン済み！');
  }

  // ────────────────────────────────────────
  // Step 2: Meta 認証情報の入力
  // ────────────────────────────────────────
  header('Step 2/5: Instagram / Meta の設定');
  console.log('Meta Developer Console から以下の情報を貼り付けてね。');
  console.log('まだ作ってない場合 → https://developers.facebook.com/\n');

  const metaAppSecret = await ask('📋 Meta App Secret: ');
  const metaAccessToken = await ask('📋 Meta Access Token: ');
  const igAccountId = await ask('📋 Instagram アカウントID: ');

  // Verify Token と ADMIN_API_KEY は自動生成（ユーザーに聞かない）
  const metaVerifyToken = randomBytes(16).toString('hex');
  const adminApiKey = randomBytes(24).toString('base64url');

  console.log(`\n🔑 以下は自動生成されたよ（メモしておいてね！）:`);
  console.log(`   Webhook検証トークン: ${metaVerifyToken}`);
  console.log(`   管理画面パスワード:  ${adminApiKey}`);
  console.log('   ↑ Webhook検証トークンはMeta Consoleに貼る時に使うよ\n');

  // ────────────────────────────────────────
  // Step 3: D1 データベース作成
  // ────────────────────────────────────────
  header('Step 3/5: データベース作成');
  console.log('Cloudflare D1 にデータベースを作成するよ...\n');

  // まず作成を試みる（既に存在してもOK）
  run('npx wrangler d1 create slidein-db 2>&1', { silent: true, ignoreError: true });

  // d1 list --json で確実にIDを取得（作成直後でも既存でも動く）
  let databaseId = '';
  try {
    const listOutput = run('npx wrangler d1 list --json 2>&1', { silent: true });
    const dbs = JSON.parse(listOutput);
    const db = dbs.find(d => d.name === 'slidein-db');
    if (db) databaseId = db.uuid || db.id;
  } catch {}

  if (!databaseId) {
    console.error('❌ データベースIDの自動取得に失敗。');
    console.error('   以下のコマンドで手動確認してね:');
    console.error('   npx wrangler d1 list');
    process.exit(1);
  }

  console.log(`✅ データベースID: ${databaseId}（自動取得）`);

  // wrangler.toml に書き込み
  let toml = readFileSync(TOML_PATH, 'utf8');
  toml = toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`);
  writeFileSync(TOML_PATH, toml);
  console.log('✅ wrangler.toml に自動書き込み完了！');

  // マイグレーション実行
  console.log('\nテーブルを作成するよ...\n');
  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrations) {
    const filePath = join(MIGRATIONS_DIR, file);
    console.log(`  📦 ${file} ...`);
    run(`npx wrangler d1 execute slidein-db --remote --file=${filePath}`, { silent: true });
  }
  console.log(`\n✅ ${migrations.length}個のマイグレーション完了！`);

  // ────────────────────────────────────────
  // Step 4: シークレット設定 + デプロイ
  // ────────────────────────────────────────
  header('Step 4/5: デプロイ');
  console.log('シークレットを設定してデプロイするよ...\n');

  const secrets = {
    META_APP_SECRET: metaAppSecret,
    META_ACCESS_TOKEN: metaAccessToken,
    META_VERIFY_TOKEN: metaVerifyToken,
    IG_ACCOUNT_ID: igAccountId,
    ADMIN_API_KEY: adminApiKey,
  };

  for (const [key, value] of Object.entries(secrets)) {
    console.log(`  🔐 ${key} ...`);
    // Windows/Mac/Linux 全対応: echo でパイプする方式
    const isWindows = process.platform === 'win32';
    const cmd = isWindows
      ? `echo ${value}| npx wrangler secret put ${key}`
      : `echo '${value}' | npx wrangler secret put ${key}`;
    const result = run(cmd, { silent: true, ignoreError: true, cwd: WORKER_DIR });
    if (!result && result !== '') {
      // フォールバック: spawnSync
      const proc = spawnSync('npx', ['wrangler', 'secret', 'put', key], {
        input: value + '\n',
        cwd: WORKER_DIR,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (proc.status !== 0) {
        console.error(`  ⚠️  ${key} の設定に失敗。手動で設定してね:`);
        console.error(`      cd apps/worker && npx wrangler secret put ${key}`);
      }
    }
  }
  console.log('\n✅ シークレット設定完了！');

  console.log('\nWorker をデプロイするよ...\n');
  const deployOutput = run(`cd ${WORKER_DIR} && npx wrangler deploy 2>&1`, { silent: true });

  // URLを抽出
  const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/);
  const workerUrl = urlMatch ? urlMatch[0] : 'https://slidein-worker.YOUR_SUBDOMAIN.workers.dev';

  console.log(`\n✅ デプロイ完了！`);
  console.log(`🌍 あなたの slidein: ${workerUrl}`);

  // ────────────────────────────────────────
  // Step 5: 次のステップ
  // ────────────────────────────────────────
  header('Step 5/5: あと少し！');

  console.log(`Meta Developer Console でWebhookを設定してね：

  1. https://developers.facebook.com/ → あなたのアプリ → Webhook
  2. 「コールバックURL」に以下を貼り付け:

     ${workerUrl}/webhook

  3. 「トークンを確認」に以下を入力:

     ${metaVerifyToken}

  4. 「確認して保存」をクリック
  5. 以下のイベントにチェック:
     ✅ messages
     ✅ messaging_postbacks  
     ✅ comments
`);

  console.log(`${'═'.repeat(50)}`);
  console.log(`
  🎉 セットアップ完了！

  ╔══════════════════════════════════════════════════╗
  ║ 🌍 Worker URL:         ${workerUrl.padEnd(27)}║
  ║ 🔐 Webhook検証トークン: ${metaVerifyToken.padEnd(27)}║
  ║ 🔑 管理画面パスワード:  ${adminApiKey.padEnd(27)}║
  ╚══════════════════════════════════════════════════╝

  ↑ この3つはメモしておいてね！

  管理画面をローカルで起動するには:
    cd apps/web
    cp .env.local.example .env.local
    # .env.local の API_URL と API_KEY を設定
    pnpm dev

  動作テスト:
    自分のIGにDMで「hello」と送ってみてね！
    （先にダッシュボードでキーワードルールを作成してね）
`);
  console.log(`${'═'.repeat(50)}\n`);

  rl.close();
}

main().catch((err) => {
  console.error('\n❌ エラーが発生:', err.message);
  rl.close();
  process.exit(1);
});
