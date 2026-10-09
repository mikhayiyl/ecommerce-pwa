import { Suspense } from "react";

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return <Suspense>{children}</Suspense>;
}
