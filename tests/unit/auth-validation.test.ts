import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("registerSchema", () => {
  it("normalizes email and accepts a strong password", () => {
    const r = registerSchema.parse({
      name: " Ada Lovelace ",
      email: " ADA@Example.com ",
      password: "Passw0rdTest",
    });
    expect(r.email).toBe("ada@example.com");
    expect(r.name).toBe("Ada Lovelace");
  });

  it.each(["short1", "allletters", "12345678"])("rejects weak password %s", (password) => {
    const r = registerSchema.safeParse({ name: "Ada", email: "a@b.co", password });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      registerSchema.safeParse({ name: "Ada", email: "nope", password: "Passw0rdTest" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});
