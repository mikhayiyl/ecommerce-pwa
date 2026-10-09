import type { Metadata } from "next";
import { deleteAddressAction, setDefaultAddressAction } from "@/actions/addresses";
import AddressForm from "@/components/account/AddressForm";
import { Badge, ghostButtonClass } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security/guards";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Addresses</h1>
      {addresses.length === 0 && <p className="text-muted">You have no saved addresses yet.</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{a.fullName}</span>
              {a.isDefault && <Badge tone="green">Default</Badge>}
            </div>
            <p className="text-muted">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ""}
              <br />
              {a.city}
              {a.state ? `, ${a.state}` : ""} {a.postalCode}
              <br />
              {a.country}
              {a.phone ? ` · ${a.phone}` : ""}
            </p>
            <div className="flex gap-2">
              {!a.isDefault && (
                <form action={setDefaultAddressAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className={ghostButtonClass}>Make default</button>
                </form>
              )}
              <form action={deleteAddressAction}>
                <input type="hidden" name="id" value={a.id} />
                <button className={ghostButtonClass}>Delete</button>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer text-primary">Edit</summary>
              <div className="mt-3">
                <AddressForm address={a} />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Add a new address</h2>
        <AddressForm />
      </section>
    </div>
  );
}
