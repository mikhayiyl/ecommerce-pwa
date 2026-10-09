import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import GoogleButton from "@/components/auth/GoogleButton";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <Suspense>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps<"/register">) {
  const { callbackUrl } = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-center text-lg font-semibold">Create your account</h1>
      <AuthForm
        mode="register"
        callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
      />
      <GoogleButton />
    </>
  );
}
