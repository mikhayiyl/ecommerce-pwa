import { googleSignInAction } from "@/actions/auth";

export default function GoogleButton({
  callbackUrl,
}: {
  callbackUrl?: string;
}) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  return (
    <form action={googleSignInAction} className="mt-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <button className="w-full rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent">
        Continue with Google
      </button>
    </form>
  );
}
