#!/usr/bin/env node
/**
 * Grants or revokes admin access for a Firebase user by setting the
 * `admin: true` custom claim.
 *
 * Usage:
 *   node scripts/set-admin.mjs grant someone@example.com ~/Downloads/genericpcs-firebase-adminsdk-xxxx.json
 *   node scripts/set-admin.mjs revoke someone@example.com ~/Downloads/genericpcs-firebase-adminsdk-xxxx.json
 *
 * The service account JSON path is passed explicitly so the private key
 * never has to be pasted into a terminal or a chat.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [, , action, email, keyFileArg] = process.argv;

if (
  (action !== "grant" && action !== "revoke") ||
  !email ||
  !keyFileArg
) {
  console.error(
    "Usage: node scripts/set-admin.mjs <grant|revoke> <email> <path-to-service-account.json>"
  );
  process.exit(1);
}

const keyFile = resolve(keyFileArg);

if (!existsSync(keyFile)) {
  console.error(`File not found: ${keyFile}`);
  process.exit(1);
}

let config;

try {
  config = JSON.parse(readFileSync(keyFile, "utf8"));
} catch {
  console.error("That file is not valid JSON.");
  process.exit(1);
}

const projectId = config.project_id ?? config.projectId;
const clientEmail = config.client_email ?? config.clientEmail;
const privateKey = (config.private_key ?? config.privateKey)?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "That JSON does not look like a Firebase service account. Expected project_id, client_email and private_key."
  );
  process.exit(1);
}

try {
  const { initializeApp, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  const adminAuth = getAuth(app);

  const user = await adminAuth.getUserByEmail(email);
  const claims = { ...(user.customClaims ?? {}) };

  if (action === "grant") {
    claims.admin = true;
  } else {
    delete claims.admin;
  }

  await adminAuth.setCustomUserClaims(user.uid, claims);

  console.log(
    `${action === "grant" ? "Granted" : "Revoked"} admin access for ${email} (uid ${user.uid})`
  );
  console.log(
    "The user must sign out and back in for the new claim to appear in their ID token."
  );
} catch (error) {
  const code = error?.code ?? "";

  if (code === "auth/user-not-found") {
    console.error(`No Firebase user found with email ${email}.`);
  } else {
    console.error("Failed to update admin claim:", error?.message ?? error);
  }

  process.exit(1);
}
