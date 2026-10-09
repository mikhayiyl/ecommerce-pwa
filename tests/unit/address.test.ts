import { describe, expect, it } from "vitest";
import { parseAddressForm } from "@/lib/validations/address";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const valid = { fullName: "Amina Yusuf", line1: "1 Main St", city: "Lagos", postalCode: "100001", country: "Nigeria" };

describe("address validation", () => {
  it("accepts a valid address and drops empty optionals", () => {
    const r = parseAddressForm(form({ ...valid, line2: "", phone: "" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.line2).toBeUndefined();
      expect(r.data.isDefault).toBe(false);
    }
  });

  it("requires core fields", () => {
    expect(parseAddressForm(form({ ...valid, city: "" })).success).toBe(false);
  });

  it("rejects invalid phone numbers", () => {
    expect(parseAddressForm(form({ ...valid, phone: "abc" })).success).toBe(false);
  });

  it("reads the default checkbox", () => {
    const r = parseAddressForm(form({ ...valid, isDefault: "on" }));
    expect(r.success && r.data.isDefault).toBe(true);
  });
});
