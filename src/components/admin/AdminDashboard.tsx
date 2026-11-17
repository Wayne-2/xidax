"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchAdminUserStats } from "@/lib/admin-api";
import { adminSignOut, hasAdminSession } from "@/lib/admin-auth";
import AdminAdmins from "@/components/admin/AdminAdmins";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminCatalog from "@/components/admin/AdminCatalog";
import AdminUsers from "@/components/admin/AdminUsers";

type Tab = "orders" | "users" | "admins" | "products" | "laptops" | "consoles";

const TABS: { id: Tab; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "users", label: "Users" },
  { id: "admins", label: "Admins" },
  { id: "products", label: "Prebuilds" },
  { id: "laptops", label: "Laptops" },
  { id: "consoles", label: "Consoles" },
];

export default function AdminDashboard({
  initialTab = "orders",
}: {
  initialTab?: Tab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(true);
  const [denyReason, setDenyReason] = useState("");

  // The admin guard itself is the source of truth. A single lightweight probe
  // verifies that the current Firebase ID token is on the D1 allowlist.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      // The dedicated admin login sets this flag. Without it, go to the
      // admin sign-in page even if a storefront Firebase session exists.
      if (!hasAdminSession()) {
        router.replace("/admin/login");
        return;
      }

      try {
        await fetchAdminUserStats();
        if (!cancelled) {
          setDenied(false);
          setDenyReason("");
        }
      } catch (error) {
        if (cancelled) return;

        const status = (error as { status?: number }).status;

        // Fail closed: any failure denies access. The API is the real gate,
        // so an unreachable/errored verification must never grant access.
        setDenied(true);

        if (status === 401) {
          window.localStorage.removeItem("genericpcs.admin.session");
          router.replace("/admin/login");
          setDenyReason("You need to sign in to access the admin dashboard.");
        } else if (status === 403) {
          setDenyReason(
            "Your account is not on the admin allowlist. Ask an existing admin to add your email."
          );
        } else {
          setDenyReason(
            "We could not verify your admin access. Check your connection and try again."
          );
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4fa]">
        <p className="text-sm text-[#5c5e66]">Loading admin…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4fa] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#dce3ee] bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-bold text-[#2e3338]">Admin access required</h1>
          <p className="mt-2 text-sm text-[#5c5e66]">{denyReason}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/admin/login"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              Go to admin sign in
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d2dbe8] bg-white px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4fa] text-[#2e3338]">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-[#dce3ee] bg-white px-4 py-6 md:flex">
          <Link href="/" className="px-2 text-lg font-extrabold tracking-tight">
            Generic<span className="text-[#5865F2]">PCs</span>
          </Link>
          <p className="mt-1 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
            Admin console
          </p>
          <nav className="mt-8 space-y-1">
            <NavButton active={tab === "orders"} onClick={() => setTab("orders")} label="Orders" icon={<path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round" />} />
            <NavButton active={tab === "users"} onClick={() => setTab("users")} label="Users" icon={<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 6M18 20c0-2 0-3.5-1-4.6" strokeLinecap="round" /></>} />
            <NavButton active={tab === "admins"} onClick={() => setTab("admins")} label="Admins" icon={<><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" strokeLinecap="round" /><path d="m16 4 1.5 1.5L20 3" strokeLinecap="round" strokeLinejoin="round" /></>} />
            <NavButton active={tab === "products"} onClick={() => setTab("products")} label="Prebuilds" icon={<><path d="m3 7 9-4 9 4-9 4-9-4Z" strokeLinejoin="round" /><path d="M3 7v10l9 4 9-4V7M12 11v10" strokeLinejoin="round" /></>} />
            <NavButton active={tab === "laptops"} onClick={() => setTab("laptops")} label="Laptops" icon={<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M2 20h20" strokeLinecap="round" /></>} />
            <NavButton active={tab === "consoles"} onClick={() => setTab("consoles")} label="Consoles" icon={<><rect x="3" y="3" width="18" height="14" rx="2" /><path d="M8 21h8M12 17v4" strokeLinecap="round" /></>} />
          </nav>
          <div className="mt-auto">
            <Link
              href="/"
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[#5c5e66] transition-colors hover:bg-[#f0f4fa]"
            >
              ← Back to store
            </Link>
            <button
              type="button"
              onClick={async () => {
                await adminSignOut();
                router.replace("/admin/login");
              }}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#5c5e66] transition-colors hover:bg-[#f0f4fa]"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-5 sm:p-8">
          {/* Mobile navigation — the sidebar is hidden on small screens. */}
          <div className="mb-6 md:hidden">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-lg font-extrabold tracking-tight">
                Generic<span className="text-[#5865F2]">PCs</span>
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await adminSignOut();
                  router.replace("/admin/login");
                }}
                className="text-sm font-semibold text-[#5c5e66]"
              >
                Sign out
              </button>
            </div>
            <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? "page" : undefined}
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    tab === item.id
                      ? "border-[#5865F2] bg-[#5865F2] text-white"
                      : "border-[#d2dbe8] bg-white text-[#5c5e66]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "orders" && <AdminOrders />}
          {tab === "users" && <AdminUsers />}
          {tab === "admins" && <AdminAdmins />}
          {tab === "products" && <AdminProducts />}
          {tab === "laptops" && <AdminCatalog kind="laptops" />}
          {tab === "consoles" && <AdminCatalog kind="consoles" />}
        </main>
      </div>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#5865F2]/10 text-[#4752C4]"
          : "text-[#5c5e66] hover:bg-[#f0f4fa]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
        {icon}
      </svg>
      {label}
    </button>
  );
}
