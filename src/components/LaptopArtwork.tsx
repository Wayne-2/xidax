import type { LaptopCategoryId } from "@/data/laptops";

type LaptopArtworkProps = {
  category: LaptopCategoryId;
  accent: string;
  label: string;
};

export default function LaptopArtwork({
  category,
  accent,
  label,
}: LaptopArtworkProps) {
  const body = "#2e3338";
  const light = "#f8fafe";

  return (
    <svg
      viewBox="0 0 400 260"
      role="img"
      aria-label={label}
      className="h-full w-full"
    >
      <circle cx="200" cy="118" r="104" fill={accent} opacity="0.08" />
      <ellipse cx="200" cy="190" rx="128" ry="9" fill={body} opacity="0.08" />

      <rect x="110" y="28" width="180" height="118" rx="9" fill={body} />
      <rect
        x="116"
        y="34"
        width="168"
        height="104"
        rx="4"
        fill={category === "gaming" ? "#171c28" : "#f2f5fb"}
      />

      {category === "gaming" && (
        <g>
          <path
            d="M116 138 196 34h34l-80 104Z"
            fill={accent}
            opacity="0.35"
          />
          <path
            d="M232 34h52v104h-52l26-52Z"
            fill={accent}
            opacity="0.18"
          />
          <circle cx="246" cy="60" r="16" fill={accent} opacity="0.55" />
          <path
            d="M128 52h44M128 62h28"
            stroke={light}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M196 96h18M205 87v18"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
        </g>
      )}

      {category === "creator" && (
        <g>
          <rect x="128" y="46" width="40" height="28" rx="4" fill={accent} opacity="0.85" />
          <rect x="174" y="46" width="40" height="28" rx="4" fill={accent} opacity="0.55" />
          <rect x="220" y="46" width="40" height="28" rx="4" fill={accent} opacity="0.3" />
          <rect x="128" y="82" width="132" height="8" rx="4" fill={body} opacity="0.18" />
          <rect x="128" y="98" width="104" height="8" rx="4" fill={body} opacity="0.12" />
          <rect x="128" y="114" width="72" height="8" rx="4" fill={body} opacity="0.08" />
        </g>
      )}

      {category === "business" && (
        <g>
          <rect x="128" y="46" width="8" height="76" rx="3" fill={accent} opacity="0.8" />
          <rect x="146" y="46" width="112" height="8" rx="4" fill={body} opacity="0.2" />
          <rect x="146" y="62" width="86" height="7" rx="3.5" fill={body} opacity="0.12" />
          <rect x="146" y="76" width="98" height="7" rx="3.5" fill={body} opacity="0.1" />
          <rect x="146" y="90" width="70" height="7" rx="3.5" fill={body} opacity="0.08" />
          <rect x="146" y="106" width="44" height="12" rx="4" fill={accent} opacity="0.35" />
        </g>
      )}

      <path d="M92 146h216l22 26H70l22-26Z" fill={body} />
      <path d="M92 146h216l-4 6H96l-4-6Z" fill={light} opacity="0.08" />
      <rect x="176" y="154" width="48" height="14" rx="4" fill={light} opacity="0.12" />

      {category === "gaming" && (
        <g>
          {Array.from({ length: 14 }).map((_, index) => (
            <rect
              key={index}
              x={106 + index * 14}
              y={152}
              width="9"
              height="3"
              rx="1.5"
              fill={accent}
              opacity={0.35 + (index % 3) * 0.2}
            />
          ))}
        </g>
      )}

      <rect x="188" y="38" width="24" height="3" rx="1.5" fill={light} opacity="0.18" />
    </svg>
  );
}
