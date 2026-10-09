import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import GoogleButton from "@/components/auth/GoogleButton";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-center text-lg font-semibold">Welcome back</h1>
      <AuthForm
        mode="login"
        callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
      />
      <GoogleButton />
    </>
  );
}
