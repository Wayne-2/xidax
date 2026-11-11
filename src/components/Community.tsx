import CountUp from "@/components/CountUp";

const reviews = [
  {
    initials: "MT",
    name: "Marcus T.",
    comment:
      "The X-6 runs everything I throw at it at max settings. Cable management is immaculate and it arrived sooner than promised.",
  },
  {
    initials: "PS",
    name: "Priya S.",
    comment:
      "Swapped from a big-box prebuilt and the difference is night and day. Support actually picked up the phone and knew what they were talking about.",
  },
  {
    initials: "DR",
    name: "Diego R.",
    comment:
      "Second rig from Pcmart. Both still running flawlessly years later. The lifetime labor coverage is why I won't buy anywhere else.",
  },
];

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 text-[#5865F2]"
      aria-hidden="true"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z" />
    </svg>
  );
}

export default function Community() {
  return (
    <section className="border-t border-[#dce3ee] text-[#2e3338]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div data-reveal="left" className="flex items-center gap-3">
              <span
                className="h-px w-[50px] bg-gradient-to-r from-[#5865F2] to-transparent"
                aria-hidden="true"
              />
              <span className="text-base font-medium uppercase tracking-[0.2em] text-[#5c5e66]">
                From the Community
              </span>
            </div>

            <h2
              data-reveal="up"
              style={{ animationDelay: "80ms" }}
              className="mt-6 text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
            >
              Real customers. Real builds
            </h2>
          </div>

          <div
            data-reveal="up"
            style={{ animationDelay: "160ms" }}
            className="flex shrink-0 flex-col gap-2"
          >
            <span className="text-5xl font-bold tracking-tight text-[#2e3338]">
              <CountUp value={4.9} decimals={1} />
            </span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon key={star} />
              ))}
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-[#5c5e66]">
              <CountUp value={250} suffix=" Verified Reviews" />
            </span>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {reviews.map((review, index) => (
            <article
              key={review.name}
              data-reveal="up"
              style={{ animationDelay: `${index * 120}ms` }}
              className="flex flex-col rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-6"
            >
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} />
                ))}
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5c5e66]">
                &quot;{review.comment}&quot;
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-[#dce3ee] pt-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2]/10 text-sm font-semibold text-[#5865F2]">
                  {review.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#2e3338]">
                    {review.name}
                  </p>
                  <p className="text-xs text-[#5c5e66]">Verified Purchase</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
