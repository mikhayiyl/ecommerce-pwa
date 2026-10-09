import { z } from "zod";

const optional = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v ? v : undefined));

export const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(80),
  line1: z.string().trim().min(1, "Address line is required").max(120),
  line2: optional,
  city: z.string().trim().min(1, "City is required").max(80),
  state: optional,
  postalCode: z.string().trim().min(2, "Postal code is required").max(20),
  country: z.string().trim().min(2, "Country is required").max(60),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+()\-\s]*$/, "Invalid phone number")
    .optional()
    .transform((v) => (v ? v : undefined)),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

export function parseAddressForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : undefined;
  };
  return addressSchema.safeParse({
    fullName: get("fullName"),
    line1: get("line1"),
    line2: get("line2"),
    city: get("city"),
    state: get("state"),
    postalCode: get("postalCode"),
    country: get("country"),
    phone: get("phone"),
    isDefault: formData.get("isDefault") === "on",
  });
}
