#!/usr/bin/env node
/**
 * Sets the FIREBASE_CONFIG secret directly from a Firebase service account
 * JSON file, without printing the key to the terminal or to a chat.
 *
 * Usage:
 *   node scripts/set-firebase-secret.mjs ~/Downloads/project-firebase-adminsdk-xxxxx.json
 *
 * The secret is piped straight into `wrangler secret put`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

/** Reads a NEXT_PUBLIC_FIREBASE_* value from the local env files. */
function readEnvValue(name) {
  for (const file of [".env.local", ".env.production", ".env"]) {
    const path = join(repoRoot, file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, "utf8").match(
      new RegExp(`^${name}\\s*=\\s*(.*)$`, "m")
    );
    if (match) {
      const value = match[1].trim().replace(/^["']|["']$/g, "");
      if (value) return value;
    }
  }
  return null;
}

const file = process.argv[2];

if (!file) {
  console.error(
    "Usage: node scripts/set-firebase-secret.mjs <path-to-service-account.json>"
  );
  process.exit(1);
}

const path = resolve(file);

if (!existsSync(path)) {
  console.error(`File not found: ${path}`);
  process.exit(1);
}

let parsed;

try {
  parsed = JSON.parse(readFileSync(path, "utf8"));
} catch {
  console.error("That file is not valid JSON.");
  process.exit(1);
}

const projectId = parsed.project_id ?? parsed.projectId;
const clientEmail = parsed.client_email ?? parsed.clientEmail;
const privateKey = parsed.private_key ?? parsed.privateKey;

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "That JSON does not look like a Firebase service account. Expected project_id, client_email and private_key."
  );
  process.exit(1);
}

// Guard against setting a key for the wrong Firebase project. The browser
// signs in against NEXT_PUBLIC_FIREBASE_PROJECT_ID, so the service account
// must belong to the same project or every ID token will be rejected.
const webProjectId = readEnvValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

if (webProjectId && webProjectId !== projectId) {
  console.error("");
  console.error("  PROJECT MISMATCH - refusing to continue.");
  console.error("");
  console.error(`  Service account project : ${projectId}`);
  console.error(`  Web config project      : ${webProjectId}`);
  console.error("");
  console.error("  These must be the same Firebase project, otherwise the");
  console.error("  Worker will reject every ID token from the browser");
  console.error("  (CREDENTIAL_MISMATCH).");
  console.error("");
  console.error("  Download the key from the console while");
  console.error(`  '${webProjectId}' is the selected project.`);
  console.error("");
  process.exit(1);
}

const config = {
  apiKey: parsed.api_key ?? parsed.apiKey ?? readEnvValue("NEXT_PUBLIC_FIREBASE_API_KEY") ?? "",
  authDomain:
    parsed.auth_domain ??
    parsed.authDomain ??
    readEnvValue("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") ??
    `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    parsed.storage_bucket ??
    parsed.storageBucket ??
    readEnvValue("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") ??
    `${projectId}.appspot.com`,
  messagingSenderId:
    parsed.messaging_sender_id ??
    parsed.messagingSenderId ??
    readEnvValue("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") ??
    "",
  appId:
    parsed.app_id ??
    parsed.appId ??
    readEnvValue("NEXT_PUBLIC_FIREBASE_APP_ID") ??
    "",
  clientEmail,
  privateKey,
};

console.log("Setting FIREBASE_CONFIG for the generic-pcs-api worker.");
console.log(`  projectId : ${projectId}`);
console.log(`  clientEmail: ${clientEmail}`);
console.log("  privateKey: (not shown)");
console.log("");

const payload = JSON.stringify(config);

// Use the worker's own wrangler binary so the version and the config file
// are always the ones that live next to the Worker.
const workerDir = join(repoRoot, "worker");
const wranglerBin = join(workerDir, "node_modules", ".bin", "wrangler");

if (!existsSync(wranglerBin)) {
  console.error(`Wrangler not found at ${wranglerBin}`);
  console.error("Run `npm install` inside the worker directory first.");
  process.exit(1);
}

try {
  execFileSync(
    wranglerBin,
    ["secret", "put", "FIREBASE_CONFIG", "--config", "wrangler.toml"],
    {
      cwd: workerDir,
      input: payload,
      stdio: ["pipe", "inherit", "inherit"],
      timeout: 120000,
    }
  );
  console.log("FIREBASE_CONFIG set. You can delete the downloaded JSON file.");
} catch (error) {
  const detail = error?.stderr?.toString?.() ?? error?.message ?? "";
  console.error("Failed to set the secret.");
  if (detail) console.error(detail);
  process.exit(1);
}
