import { describe, expect, it } from "vitest";
import { answerQuestion, greetingMessage } from "../src/chat";

describe("chat assistant", () => {
  it("greets the user", () => {
    expect(greetingMessage()).toContain("Generic PCs");
  });

  it("answers shipping questions", () => {
    const result = answerQuestion("How long does shipping take?");
    expect(result.answer).toContain("free shipping");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("answers order tracking questions", () => {
    const result = answerQuestion("where is my order");
    expect(result.answer.toLowerCase()).toContain("profile");
  });

  it("answers warranty questions", () => {
    const result = answerQuestion("what is the warranty?");
    expect(result.answer).toContain("3-year");
  });

  it("answers payment questions", () => {
    const result = answerQuestion("what payment methods do you accept?");
    expect(result.answer.toLowerCase()).toContain("crypto");
  });

  it("answers human escalation", () => {
    const result = answerQuestion("I want to talk to a human");
    expect(result.answer).toContain("@");
  });

  it("gives a helpful fallback with suggestions", () => {
    const result = answerQuestion("asdfqwer");
    expect(result.answer.length).toBeGreaterThan(10);
    expect(result.suggestions).toContain("Talk to a human");
  });
});
