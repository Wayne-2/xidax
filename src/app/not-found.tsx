import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
        404
      </p>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#2e3338] sm:text-5xl">
        That page moved
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#5c5e66]">
        The link you followed does not exist any more. The catalogue, your
        orders and support are all still where you left them.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
        >
          Back to the store
        </Link>
        <Link
          href="/prebuilds"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
        >
          Shop prebuilds
        </Link>
        <Link
          href="/support"
          className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}
