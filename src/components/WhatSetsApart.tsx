const reasons = [
  {
    number: "01",
    title: "Lifetime Service & Labor",
    description:
      "Every Pcmart desktop ships with a lifetime service and labor warranty. Not 1 year, not 3 — for as long as you own the machine",
  },
  {
    number: "02",
    title: "Designed & Supported worldwide",
    description:
      "Configured and stress-tested in our facility by techs who game on the rigs they ship. Every cable routed, every screw torqued, every part tested.",
  },
  {
    number: "03",
    title: "Real Humans",
    description:
      "Call us at our business line. You get a PC tech world wide — not a script, not a queue across the planet. We're gamers; you're gamers",
  },
  {
    number: "04",
    title: "Supporting Gamers Since 2011",
    description:
      "We've been doing this since 2011. NASA, Dreamworks, pro gamers, indie devs, kids in their first rigs — we've shipped rigs to all of them",
  },
];

export default function WhatSetsApart() {
  return (
    <section className="text-[#2e3338]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div data-reveal="left" className="flex items-center gap-3">
          <span
            className="h-px w-[50px] bg-gradient-to-r from-[#5865F2] to-transparent"
            aria-hidden="true"
          />
          <span className="text-base font-medium uppercase tracking-[0.2em] text-[#5c5e66]">
            What Sets Apart
          </span>
        </div>

        <h2
          data-reveal="up"
          style={{ animationDelay: "80ms" }}
          className="mt-6 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
        >
          Different by design. Serviced for life.
        </h2>

        <p
          data-reveal="up"
          style={{ animationDelay: "160ms" }}
          className="mt-4 max-w-2xl text-base leading-relaxed text-[#5c5e66]"
        >
          Four reasons every Pcmart desktop punches above its price tag.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#dce3ee] sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason, index) => (
            <div
              key={reason.number}
              data-reveal="scale"
              style={{ animationDelay: `${index * 100}ms` }}
              className="group bg-[#f8fafe] p-8 transition-colors duration-300 hover:bg-[#5865F2]/5"
            >
              <span className="text-4xl font-bold tracking-tight text-[#5865F2]">
                {reason.number}
              </span>
              <h3 className="mt-6 text-lg font-semibold text-[#2e3338]">
                {reason.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
