import { googleSignInAction } from "@/actions/auth";

export default function GoogleButton() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  return (
    <form action={googleSignInAction} className="mt-4">
      <button className="w-full rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent">
        Continue with Google
      </button>
    </form>
  );
}
