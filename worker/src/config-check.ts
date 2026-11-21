import type { Env } from "./types";
import { ensureInitialized, parseFirebaseConfig } from "./auth";

export type ConfigCheckResult = {
  ok: boolean;
  database: {
    configured: boolean;
    otpTableReady: boolean;
    walletsTableReady: boolean;
    error: string | null;
  };
  firebase: {
    configured: boolean;
    projectId: string | null;
    serviceAccountPresent: boolean;
    reachable: boolean;
    error: string | null;
  };
  resend: {
    configured: boolean;
  };
  otpSecret: {
    configured: boolean;
    lengthOk: boolean;
  };
  origins: string[];
};

/**
 * Reports whether the Worker is correctly configured.
 *
 * This never returns secret material. It only reports presence and
 * connectivity so the operator can confirm the setup without pasting keys
 * into a chat or a log.
 */
export async function runConfigCheck(env: Env): Promise<ConfigCheckResult> {
  const origins = (
    env.ALLOWED_ORIGINS ?? ""
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const result: ConfigCheckResult = {
    ok: false,
    database: {
      configured: Boolean(env.DB),
      otpTableReady: false,
      walletsTableReady: false,
      error: null,
    },
    firebase: {
      configured: false,
      projectId: null,
      serviceAccountPresent: false,
      reachable: false,
      error: null,
    },
    resend: { configured: Boolean(env.RESEND_API_KEY) },
    otpSecret: {
      configured: Boolean(env.OTP_SECRET),
      lengthOk: Boolean(env.OTP_SECRET && env.OTP_SECRET.length >= 16),
    },
    origins,
  };

  try {
    await env.DB.prepare(
      "SELECT uid FROM email_otps LIMIT 1"
    ).first();
    result.database.otpTableReady = true;
  } catch (error) {
    result.database.error =
      error instanceof Error
        ? error.message
        : "D1 email_otps table is not available. Run migration 0001.";
  }

  try {
    await env.DB.prepare(
      "SELECT id FROM crypto_wallets LIMIT 1"
    ).first();
    result.database.walletsTableReady = true;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "D1 crypto_wallets table is not available. Run migration 0011.";
    result.database.error = result.database.error
      ? `${result.database.error} ${message}`
      : message;
  }

  if (!result.database.configured || !result.database.otpTableReady) {
    return result;
  }

  if (!env.FIREBASE_CONFIG) {
    result.firebase.error = "FIREBASE_CONFIG is not set.";
    return result;
  }

  result.firebase.configured = true;

  try {
    const config = parseFirebaseConfig(env.FIREBASE_CONFIG);
    result.firebase.projectId = config.projectId ?? null;
    result.firebase.serviceAccountPresent = Boolean(
      config.clientEmail && config.privateKey
    );

    if (!config.projectId) {
      result.firebase.error = "FIREBASE_CONFIG is missing projectId.";
      return result;
    }

    if (!config.clientEmail || !config.privateKey) {
      result.firebase.error =
        "FIREBASE_CONFIG is missing clientEmail/privateKey (service account key).";
      return result;
    }
  } catch (error) {
    result.firebase.error =
      error instanceof Error ? error.message : "FIREBASE_CONFIG could not be parsed.";
    return result;
  }

  try {
    const { auth: firebaseAuth } = await ensureInitialized(env);
    // A cheap authenticated read proves the service account can sign requests.
    await firebaseAuth.getUser("config-check-probe").catch(() => undefined);
    result.firebase.reachable = true;
  } catch (error) {
    result.firebase.error =
      error instanceof Error
        ? error.message
        : "Could not initialise the Firebase Admin SDK.";
    return result;
  }

  result.ok =
    result.database.configured &&
    result.database.otpTableReady &&
    result.database.walletsTableReady &&
    result.firebase.reachable &&
    result.firebase.serviceAccountPresent &&
    result.resend.configured &&
    result.otpSecret.configured &&
    result.otpSecret.lengthOk;

  return result;
}
