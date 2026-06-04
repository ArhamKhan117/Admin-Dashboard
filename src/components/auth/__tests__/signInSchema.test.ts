import { describe, it, expect } from "vitest";
import { z } from "zod";

// Replicate the schema from SignInForm for testing
const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

describe("signInSchema", () => {
  it("accepts valid email and password", () => {
    const result = signInSchema.safeParse({ email: "admin@test.com", password: "anypassword" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = signInSchema.safeParse({ email: "notanemail", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects email without domain", () => {
    const result = signInSchema.safeParse({ email: "user@", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects email without @", () => {
    const result = signInSchema.safeParse({ email: "userexample.com", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = signInSchema.safeParse({ email: "", password: "password" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = signInSchema.safeParse({ email: "admin@test.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts valid email and password >= 8 chars", () => {
    const result = signUpSchema.safeParse({ email: "user@test.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({ email: "user@test.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects password of exactly 7 characters", () => {
    const result = signUpSchema.safeParse({ email: "user@test.com", password: "1234567" });
    expect(result.success).toBe(false);
  });

  it("accepts password of exactly 8 characters", () => {
    const result = signUpSchema.safeParse({ email: "user@test.com", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email in sign-up", () => {
    const result = signUpSchema.safeParse({ email: "bademail", password: "validpass" });
    expect(result.success).toBe(false);
  });
});
