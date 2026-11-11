import type { AccessoryCategoryId } from "@/data/accessories";

type AccessoryArtworkProps = {
  category: AccessoryCategoryId;
  accent: string;
  label: string;
};

export default function AccessoryArtwork({
  category,
  accent,
  label,
}: AccessoryArtworkProps) {
  const body = "#2e3338";
  const light = "#f8fafe";

  return (
    <svg
      viewBox="0 0 240 180"
      role="img"
      aria-label={label}
      className="h-full w-full"
    >
      <circle cx="120" cy="88" r="74" fill={accent} opacity="0.08" />
      <circle cx="120" cy="88" r="52" fill={accent} opacity="0.05" />
      <ellipse cx="120" cy="150" rx="70" ry="7" fill={body} opacity="0.07" />

      {category === "monitors" && (
        <g>
          <rect x="42" y="36" width="156" height="94" rx="10" fill={body} />
          <rect
            x="49"
            y="43"
            width="142"
            height="80"
            rx="6"
            fill={accent}
            opacity="0.2"
          />
          <path
            d="M78 58h54M78 70h38M78 82h62"
            stroke={accent}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.75"
          />
          <circle cx="172" cy="56" r="6" fill={accent} opacity="0.9" />
          <path d="M104 130h32l6 18h-44l6-18Z" fill={body} />
          <rect x="86" y="146" width="68" height="8" rx="4" fill={body} />
        </g>
      )}

      {category === "mice" && (
        <g>
          <rect x="93" y="34" width="54" height="108" rx="27" fill={body} />
          <path
            d="M120 36v42"
            stroke={light}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M94 72h52"
            stroke={light}
            strokeWidth="2"
            opacity="0.18"
          />
          <circle cx="120" cy="58" r="5" fill={accent} />
          <rect
            x="88"
            y="66"
            width="5"
            height="16"
            rx="2.5"
            fill={accent}
            opacity="0.65"
          />
          <path
            d="M104 98h32"
            stroke={accent}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.65"
          />
        </g>
      )}

      {category === "keyboards" && (
        <g>
          <rect x="24" y="56" width="192" height="78" rx="12" fill={body} />
          <rect
            x="32"
            y="64"
            width="176"
            height="62"
            rx="7"
            fill={light}
            opacity="0.07"
          />
          {Array.from({ length: 36 }).map((_, index) => {
            const row = Math.floor(index / 12);
            const column = index % 12;

            return (
              <rect
                key={index}
                x={38 + column * 14}
                y={72 + row * 11}
                width="10"
                height="8"
                rx="2"
                fill={light}
                opacity={row === 0 ? 0.24 : 0.15}
              />
            );
          })}
          <rect
            x="80"
            y="108"
            width="80"
            height="8"
            rx="2"
            fill={accent}
            opacity="0.55"
          />
        </g>
      )}

      {category === "headsets" && (
        <g>
          <path
            d="M64 98V82a56 56 0 0 1 112 0v16"
            stroke={body}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="50" y="90" width="30" height="48" rx="14" fill={body} />
          <rect x="160" y="90" width="30" height="48" rx="14" fill={body} />
          <rect
            x="57"
            y="99"
            width="16"
            height="30"
            rx="8"
            fill={accent}
            opacity="0.45"
          />
          <rect
            x="167"
            y="99"
            width="16"
            height="30"
            rx="8"
            fill={accent}
            opacity="0.45"
          />
          <path
            d="M160 136c-8 12-22 16-36 12"
            stroke={body}
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="124" cy="148" r="5" fill={accent} />
        </g>
      )}

      {category === "desk-mats" && (
        <g>
          <path d="M28 56h184l-14 78H42L28 56Z" fill={body} />
          <path
            d="M38 64h164l-10 62H48L38 64Z"
            fill={accent}
            opacity="0.18"
          />
          <path
            d="M54 82h72M54 96h48"
            stroke={accent}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.55"
          />
          <rect
            x="148"
            y="78"
            width="28"
            height="22"
            rx="4"
            fill={light}
            opacity="0.2"
          />
        </g>
      )}

      {category === "power-adaptors" && (
        <g>
          <rect x="58" y="52" width="124" height="80" rx="10" fill={body} />
          <circle cx="96" cy="92" r="25" fill={accent} opacity="0.2" />
          <circle cx="96" cy="92" r="5" fill={accent} />
          <path
            d="M96 67v10M96 107v10M71 92h10M111 92h10"
            stroke={accent}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <rect
            x="136"
            y="68"
            width="32"
            height="12"
            rx="3"
            fill={light}
            opacity="0.2"
          />
          <rect
            x="136"
            y="88"
            width="32"
            height="12"
            rx="3"
            fill={light}
            opacity="0.2"
          />
          <rect
            x="136"
            y="108"
            width="32"
            height="12"
            rx="3"
            fill={light}
            opacity="0.2"
          />
        </g>
      )}

      {category === "other" && (
        <g>
          <path
            d="M72 76h96c12 0 22 10 22 22v8c0 12-10 22-22 22h-16l-8 10h-32l-8-10H72c-12 0-22-10-22-22v-8c0-12 10-22 22-22Z"
            fill={body}
          />
          <circle cx="84" cy="102" r="7" fill={accent} opacity="0.85" />
          <path
            d="M84 95v14M77 102h14"
            stroke={light}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="156" cy="96" r="4" fill={accent} />
          <circle cx="170" cy="106" r="4" fill={accent} />
          <circle cx="156" cy="116" r="4" fill={accent} />
          <circle cx="142" cy="106" r="4" fill={accent} />
        </g>
      )}
    </svg>
  );
}
