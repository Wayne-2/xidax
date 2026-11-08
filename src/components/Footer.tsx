import Image from "next/image";
import Link from "next/link";
import SocialLinks from "@/components/SocialLinks";

async function CopyrightYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}

const columns = [
  {
    title: "Shop",
    links: ["Prebuilt PCs", "Custom Builds", "Accessories", "Sales"],
  },
  {
    title: "Support",
    links: ["Support Center", "Warranty", "Shipping & Returns", "Contact Us"],
  },
  {
    title: "Company",
    links: ["About Us", "Blog", "Careers", "Reviews"],
  },
];

export default function Footer() {
  return (
    <footer className="border-b-2 border-[#35CE00] bg-[#030603] text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_2fr] lg:gap-16">
          <div data-reveal="up">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/header_logo.png"
                alt="XIDAX"
                width={240}
                height={120}
                className="h-10 w-auto"
              />
            </Link>

            <SocialLinks />

            <p className="mt-6 max-w-xs text-sm leading-relaxed text-white/60">
              Designed &amp; Supported worldwide. Lifetime service &amp; labor
            </p>

            <a
              href="tel:+234907649842"
              className="mt-3 inline-block text-sm font-semibold text-[#35CE00] transition-colors hover:text-[#43e00d]"
            >
              +234-907649842
            </a>
          </div>

          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column, index) => (
              <div
                key={column.title}
                data-reveal="up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((label) => (
                    <li key={label}>
                      <Link
                        href="#"
                        className="text-sm text-white/70 transition-colors hover:text-[#35CE00]"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div
          data-reveal="fade"
          style={{ animationDelay: "150ms" }}
          className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            &copy; <CopyrightYear /> XIDAX. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="#" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
