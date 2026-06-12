import { describe, it, expect } from "vitest";
import { botCreateSchema, botUpdateSchema } from "./bot";

describe("botCreateSchema", () => {
  const validInput = {
    name: "My Bot",
    qq: "123456789",
    appId: "1001234",
    clientSecret: "abcdef123456",
  };

  it("accepts valid input", () => {
    const result = botCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = botCreateSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    const result = botCreateSchema.safeParse({ ...validInput, name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects qq with non-digit characters", () => {
    const result = botCreateSchema.safeParse({ ...validInput, qq: "12345abc" });
    expect(result.success).toBe(false);
  });

  it("rejects qq shorter than 5 digits", () => {
    const result = botCreateSchema.safeParse({ ...validInput, qq: "1234" });
    expect(result.success).toBe(false);
  });

  it("rejects qq longer than 20 digits", () => {
    const result = botCreateSchema.safeParse({ ...validInput, qq: "1".repeat(21) });
    expect(result.success).toBe(false);
  });

  it("rejects empty appId", () => {
    const result = botCreateSchema.safeParse({ ...validInput, appId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects appId with non-digits", () => {
    const result = botCreateSchema.safeParse({ ...validInput, appId: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects empty clientSecret", () => {
    const result = botCreateSchema.safeParse({ ...validInput, clientSecret: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(botCreateSchema.safeParse({}).success).toBe(false);
    expect(botCreateSchema.safeParse({ name: "Bot" }).success).toBe(false);
  });
});

describe("botUpdateSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = botUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with name only", () => {
    const result = botUpdateSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with qq only", () => {
    const result = botUpdateSchema.safeParse({ qq: "987654321" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with clientSecret only", () => {
    const result = botUpdateSchema.safeParse({ clientSecret: "new-secret" });
    expect(result.success).toBe(true);
  });

  it("validates qq format when provided", () => {
    const result = botUpdateSchema.safeParse({ qq: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name when provided", () => {
    const result = botUpdateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});
