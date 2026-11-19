import { describe, expect, it } from "vitest";
import { answerQuestion, greetingMessage } from "../src/chat";
import type { Env } from "../src/types";

const noAiEnv = {} as Env;

describe("chat assistant", () => {
  it("greets the user", () => {
    expect(greetingMessage()).toContain("Generic PCs");
  });

  it("answers shipping questions (fallback, no AI)", async () => {
    const result = await answerQuestion(noAiEnv, "How long does shipping take?");
    expect(result.answer).toContain("free shipping");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("answers order tracking questions (fallback)", async () => {
    const result = await answerQuestion(noAiEnv, "where is my order");
    expect(result.answer.toLowerCase()).toContain("profile");
  });

  it("answers warranty questions (fallback)", async () => {
    const result = await answerQuestion(noAiEnv, "what is the warranty?");
    expect(result.answer).toContain("3-year");
  });

  it("answers payment questions (fallback)", async () => {
    const result = await answerQuestion(noAiEnv, "what payment methods do you accept?");
    expect(result.answer.toLowerCase()).toContain("crypto");
  });

  it("answers human escalation (fallback)", async () => {
    const result = await answerQuestion(noAiEnv, "I want to talk to a human");
    expect(result.answer).toContain("@");
  });

  it("gives a helpful fallback with suggestions", async () => {
    const result = await answerQuestion(noAiEnv, "asdfqwer");
    expect(result.answer.length).toBeGreaterThan(10);
    expect(result.suggestions).toContain("Talk to a human");
  });

  it("uses Workers AI when available", async () => {
    const aiEnv = {
      AI: {
        run: async (_model: string, _input: unknown) => ({
          response: "AI-powered answer about shipping.",
        }),
      },
    } as unknown as Env;

    const result = await answerQuestion(aiEnv, "How long does shipping take?");
    expect(result.answer).toBe("AI-powered answer about shipping.");
  });

  it("falls back when AI throws", async () => {
    const aiEnv = {
      AI: {
        run: async () => {
          throw new Error("AI unavailable");
        },
      },
    } as unknown as Env;

    const result = await answerQuestion(aiEnv, "what is the warranty?");
    expect(result.answer).toContain("3-year");
  });
});