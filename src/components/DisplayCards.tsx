import Image from "next/image";
import Link from "next/link";

const cards = [
  {
    title: "CONFIGURED. TESTED. SHIPPED",
    subtitle:
      "Preconfigured battle-stations. 24hrs burn-in tested, packed and shipped, in 1-3 business days",
    cta: "Shop prebuilds",
    href: "/prebuilds",
    image: "/display_section.png",
    badge: "In stock",
    withArrow: true,
  },
  {
    title: "YOUR SPEC. YOUR BUILD",
    subtitle:
      "Configure every part. Designed and supported world wide, and backed by lifetime service and labor",
    cta: "Start building",
    href: "/custom-builds",
    image: "/display_section2.png",
    badge: "Lifetime service & labor",
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
          className="group relative flex aspect-[900/590] min-h-[15rem] overflow-hidden border border-transparent transition-[border-color,box-shadow] duration-300 hover:border-[#35CE00] hover:shadow-[0_0_40px_rgba(53,206,0,0.35)] focus-within:border-[#35CE00] focus-within:shadow-[0_0_40px_rgba(53,206,0,0.35)]"
        >
          <Image
            src={card.image}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            quality={90}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110 group-focus-within:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
          <span className="absolute left-8 top-6 z-10 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#35CE00]/90 backdrop-blur sm:left-10">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#35CE00] shadow-[0_0_8px_rgba(53,206,0,0.7)]" />
            {card.badge}
          </span>
          <div className="relative z-10 mt-auto flex w-full flex-col items-start gap-3 p-8 sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {card.title}
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              {card.subtitle}
            </p>
            <Link
              href={card.href}
              className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#35CE00] px-6 text-sm font-semibold text-neutral-950 transition-colors hover:bg-[#43e00d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
