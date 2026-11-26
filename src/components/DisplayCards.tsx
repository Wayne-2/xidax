import Link from "next/link";

const cards = [
  {
    title: "BUILT FOR POWER. READY FOR ANYTHING.",
    subtitle:
      "Preconfigured battle-stations. 24hrs burn-in tested, packed and shipped, in 1-3 business days",
    cta: "Shop prebuilds",
    href: "/prebuilds",
    video: "/display_vid1.mp4",
    badge: "Available stocks",
    withArrow: true,
  },
  {
    title: "MADE PERSONAL. BUILT POWERFUL.",
    subtitle:
      "Configure every part. Designed and supported world wide, and backed by lifetime service and labor",
    cta: "Start building",
    href: "/custom-builds",
    video: "/display_vid2.mp4",
    badge: "Customer lifetime service",
    withArrow: true,
  },
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function DisplayCards() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2">
      {cards.map((card, index) => (
        <div
          key={card.href}
          data-reveal="scale"
          style={{ animationDelay: `${index * 140}ms` }}
          className="group relative flex aspect-[900/590] min-h-[26rem] w-full min-w-0 overflow-hidden border border-transparent transition-[border-color,box-shadow] duration-300 hover:border-[#5865F2] hover:shadow-[0_0_40px_rgba(88,101,242,0.35)] focus-within:border-[#5865F2] focus-within:shadow-[0_0_40px_rgba(88,101,242,0.35)] md:min-h-[15rem]"
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-focus-within:scale-110"
          >
            <source src={card.video} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
          <span className="absolute left-8 top-6 z-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:left-10">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
            {card.badge}
          </span>
          <div className="relative z-10 mt-auto flex w-full flex-col items-start gap-4 p-8 sm:gap-3 sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {card.title}
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              {card.subtitle}
            </p>
            <Link
              href={card.href}
              className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:mt-2"
            >
              {card.cta}
              {card.withArrow && <ArrowIcon />}
            </Link>
          </div>
        </div>
      ))}
    </section>
  );
}
