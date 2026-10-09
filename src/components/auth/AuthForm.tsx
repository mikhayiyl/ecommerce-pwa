"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/actions/auth";

const initial: AuthFormState = {};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  errors?: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        aria-invalid={!!errors}
        aria-describedby={errors ? `${name}-error` : undefined}
        className={inputClass}
      />
      {errors && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-400">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

export default function AuthForm({
  mode,
  callbackUrl,
}: {
  mode: "login" | "register";
  callbackUrl?: string;
}) {
  const [state, action, pending] = useActionState(
    mode === "login" ? loginAction : registerAction,
    initial,
  );
  const isLogin = mode === "login";
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      {!isLogin && (
        <Field label="Full name" name="name" autoComplete="name" errors={fe.name} />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" errors={fe.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        errors={fe.password}
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2 font-semibold text-background transition hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-muted">
        {isLogin ? "New here? " : "Already registered? "}
        <Link
          href={isLogin ? "/register" : "/login"}
          className="text-accent hover:underline"
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
