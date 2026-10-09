"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/actions/account";
import { buttonClass, inputClass } from "@/components/admin/ui";

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="max-w-md space-y-4 rounded-xl border border-border bg-surface p-5">
      <label className="block text-sm">
        Full name
        <input name="name" required defaultValue={name} className={inputClass} />
      </label>
      <label className="block text-sm">
        Email
        <input value={email} disabled readOnly className={`${inputClass} opacity-60`} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={buttonClass}>Save changes</button>
        {state.error && <span role="alert" className="text-sm text-red-400">{state.error}</span>}
        {state.success && <span role="status" className="text-sm text-emerald-400">{state.success}</span>}
      </div>
    </form>
  );
}
