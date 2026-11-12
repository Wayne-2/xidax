"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CartIcon } from "@/components/AccessoryIcons";
import { UserIcon } from "@/components/SupportIcons";
import { navItems } from "@/data/navigation";

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function MenuIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname() ?? "";
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    const media = window.matchMedia("(min-width: 768px)");

    function handleBreakpoint(event: MediaQueryListEvent) {
      if (event.matches) {
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    media.addEventListener("change", handleBreakpoint);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      media.removeEventListener("change", handleBreakpoint);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={containerRef} className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[#5c5e66] transition-colors hover:bg-black/5 hover:text-[#2e3338]"
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="animate-menu-in absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-[#dce3ee] bg-[#f8fafe] shadow-[0_28px_48px_-28px_rgba(46,51,56,0.45)]">
          <nav
            aria-label="Mobile navigation"
            className="mx-auto max-w-7xl px-4 py-2 sm:px-6"
          >
            <ul className="divide-y divide-[#dce3ee]">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => onOpenChange(false)}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center py-3.5 pl-4 text-[15px] font-semibold transition-colors ${
                        active
                          ? "text-[#5865F2]"
                          : "text-[#2e3338] hover:text-[#5865F2]"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-[#5865F2]"
                        />
                      )}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <ul className="divide-y divide-[#dce3ee] border-t border-[#d2dbe8]">
              <li>
                <Link
                  href="/account"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 py-3.5 pl-4 text-[15px] font-semibold text-[#2e3338] transition-colors hover:text-[#5865F2]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf0f8] text-[#5c5e66]">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  Account
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 py-3.5 pl-4 text-[15px] font-semibold text-[#2e3338] transition-colors hover:text-[#5865F2]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf0f8] text-[#5c5e66]">
                    <CartIcon className="h-4 w-4" />
                  </span>
                  Cart
                </Link>
              </li>
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-[#d2dbe8] py-4 pl-4">
              <a
                href="tel:+234907649842"
                className="text-sm font-semibold text-[#5c5e66] transition-colors hover:text-[#5865F2]"
              >
                +234-907649842
              </a>
              <Link
                href="/support"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
              >
                Get support
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
