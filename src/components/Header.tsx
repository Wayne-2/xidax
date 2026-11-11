"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import HeaderSearch from "@/components/HeaderSearch";
import MobileNav from "@/components/MobileNav";
import NavLinks from "@/components/NavLinks";

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 8h12l1 12H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#dce3ee] bg-[#f0f4fa]/85 text-[#2e3338] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/pcmart.png"
            alt="Pcmart"
            width={497}
            height={141}
            priority
            className="h-8 w-auto"
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
          <Link
            href="/account"
            aria-label="Account"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-[#5c5e66] transition-colors hover:bg-black/5 hover:text-[#2e3338] md:flex"
          >
            <UserIcon />
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-[#5c5e66] transition-colors hover:bg-black/5 hover:text-[#2e3338] md:flex"
          >
            <BagIcon />
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
