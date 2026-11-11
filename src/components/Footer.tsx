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

const routeMap: Record<string, string> = {
  "Prebuilt PCs": "/prebuilds",
  "Custom Builds": "/custom-builds",
  Accessories: "/accessories",
  "Support Center": "/support",
};

export default function Footer() {
  return (
    <footer className="border-b-2 border-[#5865F2] bg-[#eaf0f8] text-[#2e3338]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_2fr] lg:gap-16">
          <div data-reveal="up">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/pcmart.png"
                alt="Pcmart"
                width={497}
                height={141}
                className="h-10 w-auto"
              />
            </Link>

            <SocialLinks />

            <p className="mt-6 max-w-xs text-sm leading-relaxed text-[#5c5e66]">
              Designed &amp; Supported worldwide. Lifetime service &amp; labor
            </p>

            <a
              href="tel:+234907649842"
              className="mt-3 inline-block text-sm font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
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
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#80848e]">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((label) => (
                    <li key={label}>
                      <Link
                        href={routeMap[label] ?? "#"}
                        className="text-sm text-[#5c5e66] transition-colors hover:text-[#5865F2]"
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
          className="mt-14 flex flex-col gap-4 border-t border-[#dce3ee] pt-6 text-sm text-[#5c5e66] sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            &copy; <CopyrightYear /> Pcmart. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="transition-colors hover:text-[#2e3338]">
              Privacy Policy
            </Link>
            <Link href="#" className="transition-colors hover:text-[#2e3338]">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
