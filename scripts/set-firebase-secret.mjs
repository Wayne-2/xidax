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
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const config = {
  apiKey: parsed.api_key ?? parsed.apiKey ?? "",
  authDomain: parsed.auth_domain ?? parsed.authDomain ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket:
    parsed.storage_bucket ?? parsed.storageBucket ?? `${projectId}.appspot.com`,
  messagingSenderId:
    parsed.messaging_sender_id ?? parsed.messagingSenderId ?? "",
  appId: parsed.app_id ?? parsed.appId ?? "",
  clientEmail,
  privateKey,
};

console.log("Setting FIREBASE_CONFIG for the generic-pcs-api worker.");
console.log(`  projectId : ${projectId}`);
console.log(`  clientEmail: ${clientEmail}`);
console.log("  privateKey: (not shown)");
console.log("");

const payload = JSON.stringify(config);

try {
  execFileSync("npx", ["wrangler", "secret", "put", "FIREBASE_CONFIG", "--config", "wrangler.toml"], {
    cwd: resolve(__dirname, "..", "worker"),
    input: payload,
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log("FIREBASE_CONFIG set. You can delete the downloaded JSON file.");
} catch {
  console.error("Failed to set the secret. Make sure wrangler is authenticated.");
  process.exit(1);
}
