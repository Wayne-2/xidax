import Link from "next/link";

/** Shared empty state shown when a catalog has no published products yet. */
export default function CatalogEmptyState({ category }: { category: string }) {
  return (
    <section className="bg-[#f0f4fa]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-[#d2dbe8] bg-[#f8fafe] p-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865F2]/10 text-[#5865F2]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path d="m3 7 9-4 9 4-9 4-9-4Z" />
              <path d="M3 7v10l9 4 9-4V7M12 11v10" />
            </svg>
          </div>

          <h2 className="mt-5 text-lg font-bold text-[#2e3338]">No products yet.</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
            Our {category} catalogue is being prepared. Check back soon — new
            products are on the way.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl border border-[#d2dbe8] bg-white px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
