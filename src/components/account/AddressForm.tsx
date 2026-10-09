"use client";

import { useActionState } from "react";
import { saveAddressAction, type AddressState } from "@/actions/addresses";
import { buttonClass, inputClass } from "@/components/admin/ui";

export type AddressValues = {
  id?: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

export default function AddressForm({ address }: { address?: AddressValues }) {
  const [state, action, pending] = useActionState<AddressState, FormData>(saveAddressAction, {});
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
      {address?.id && <input type="hidden" name="id" value={address.id} />}
      <label className="text-sm sm:col-span-2">
        Full name
        <input name="fullName" required defaultValue={address?.fullName} className={inputClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        Address line 1
        <input name="line1" required defaultValue={address?.line1} className={inputClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        Address line 2 (optional)
        <input name="line2" defaultValue={address?.line2 ?? ""} className={inputClass} />
      </label>
      <label className="text-sm">
        City
        <input name="city" required defaultValue={address?.city} className={inputClass} />
      </label>
      <label className="text-sm">
        State / region
        <input name="state" defaultValue={address?.state ?? ""} className={inputClass} />
      </label>
      <label className="text-sm">
        Postal code
        <input name="postalCode" required defaultValue={address?.postalCode} className={inputClass} />
      </label>
      <label className="text-sm">
        Country
        <input name="country" required defaultValue={address?.country} className={inputClass} />
      </label>
      <label className="text-sm sm:col-span-2">
        Phone (optional)
        <input name="phone" type="tel" defaultValue={address?.phone ?? ""} className={inputClass} />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} /> Set as default address
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass}>{address?.id ? "Update address" : "Add address"}</button>
        {state.error && <span role="alert" className="text-sm text-red-400">{state.error}</span>}
        {state.success && <span role="status" className="text-sm text-emerald-400">{state.success}</span>}
      </div>
    </form>
  );
}
