"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/data/navigation";

export default function NavLinks() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="hidden items-center gap-6 md:flex">
      {navItems.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex items-center py-2 text-sm font-medium transition-colors ${
              active
                ? "text-[#2e3338]"
                : "text-[#5c5e66] hover:text-[#2e3338]"
            }`}
          >
            {link.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#5865F2] shadow-[0_0_8px_rgba(88,101,242,0.45)] transition-all duration-300 ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
