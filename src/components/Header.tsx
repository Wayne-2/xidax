"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "@/components/AccountProvider";
import { useCart } from "@/components/CartProvider";
import { CartIcon } from "@/components/ConsoleIcons";
import HeaderSearch from "@/components/HeaderSearch";
import RegionMenu from "@/components/RegionMenu";
import MobileNav from "@/components/MobileNav";
import NavLinks from "@/components/NavLinks";

function truncateEmail(email: string, max = 18) {
  if (email.length <= max) return email;
  const [local, domain] = email.split("@");
  if (!domain) return `${email.slice(0, max - 1)}…`;
  const keepLocal = Math.min(local.length, 6);
  return `${local.slice(0, keepLocal)}…@${domain}`;
}

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const authPaths = ["/login", "/signup", "/verify-otp"];
  const authReturn = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
    ? ""
    : pathname;
  const { user } = useAccount();
  const { count: cartCount, ready: cartReady } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#dce3ee] bg-[#f0f4fa]/85 text-[#2e3338] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/Genericpcs.png"
            alt="generic pcs"
            width={1329}
            height={292}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <div
          className={`transition-opacity duration-300 ${
            searchOpen
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
        >
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <HeaderSearch
            open={searchOpen}
            onOpenChange={(next) => {
              setSearchOpen(next);

              if (next) {
                setMenuOpen(false);
              }
            }}
          />
          <RegionMenu className="hidden sm:block" />

          {user ? (
            <Link
              href="/profile"
              title={user.email}
              className="hidden max-w-[160px] items-center gap-2 rounded-full border border-[#d2dbe8] bg-white px-3 py-1.5 text-xs font-semibold text-[#2e3338] transition-colors hover:border-[#5865F2]/50 hover:text-[#5865F2] sm:flex"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/10 text-[10px] font-bold text-[#5865F2]">
                {user.email.slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate">{truncateEmail(user.email)}</span>
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={authReturn ? `/login?next=${encodeURIComponent(authReturn)}` : "/login"}
                className="inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold text-[#5c5e66] transition-colors hover:bg-black/5 hover:text-[#2e3338]"
              >
                Log in
              </Link>
              <Link
                href={authReturn ? `/signup?next=${encodeURIComponent(authReturn)}` : "/signup"}
                className="inline-flex h-9 items-center rounded-full bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
              >
                Sign up
              </Link>
            </div>
          )}

          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
            className="relative hidden h-9 w-9 items-center justify-center rounded-full text-[#5c5e66] transition-colors hover:bg-black/5 hover:text-[#2e3338] md:flex"
          >
            <CartIcon className="h-5 w-5" />
            {cartReady && cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5865F2] px-1 text-[10px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <MobileNav
            open={menuOpen}
            onOpenChange={(next) => {
              setMenuOpen(next);

              if (next) {
                setSearchOpen(false);
              }
            }}
          />
        </div>
      </div>
    </header>
  );
}
