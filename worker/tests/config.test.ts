import { describe, expect, it } from "vitest";
import { parseFirebaseConfig } from "../src/auth";

describe("parseFirebaseConfig", () => {
  it("parses a standard JSON config", () => {
    const config = parseFirebaseConfig(
      JSON.stringify({
        apiKey: "key",
        authDomain: "project.firebaseapp.com",
        projectId: "project",
        storageBucket: "project.appspot.com",
        messagingSenderId: "123",
        appId: "1:123:web:abc",
        clientEmail: "sa@project.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      })
    );

    expect(config.projectId).toBe("project");
    expect(config.clientEmail).toBe("sa@project.iam.gserviceaccount.com");
    expect(config.privateKey).toContain("BEGIN PRIVATE KEY");
  });

  it("restores escaped newlines in the private key", () => {
    const config = parseFirebaseConfig(
      '{"projectId":"p","clientEmail":"e","privateKey":"-----BEGIN-----\\nline1\\nline2\\n-----END-----"}'
    );

    expect(config.privateKey).toBe(
      "-----BEGIN-----\nline1\nline2\n-----END-----"
    );
  });

  it("accepts snake_case service account fields", () => {
    const config = parseFirebaseConfig(
      JSON.stringify({
        project_id: "project",
        client_email: "sa@project.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      })
    );

    expect(config.projectId).toBe("project");
    expect(config.clientEmail).toBe("sa@project.iam.gserviceaccount.com");
    expect(config.privateKey).toContain("BEGIN PRIVATE KEY");
  });

  it("throws on empty input", () => {
    expect(() => parseFirebaseConfig("   ")).toThrow(/empty/i);
  });

  it("throws on invalid JSON that is not base64 either", () => {
    expect(() => parseFirebaseConfig("not json at all !!")).toThrow(/not valid JSON/i);
  });

  it("accepts a base64 encoded payload", () => {
    const raw = JSON.stringify({
      projectId: "project",
      clientEmail: "sa@project.iam.gserviceaccount.com",
      privateKey: "key",
    });

    const encoded = Buffer.from(raw, "utf8").toString("base64");
    const config = parseFirebaseConfig(encoded);

    expect(config.projectId).toBe("project");
  });
});
