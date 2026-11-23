import { CheckIcon } from "@/components/BuildIcons";
import SpecTagIcon from "@/components/SpecTagIcon";

/**
 * Renders a product's specs/features as a vertical list with the exact icon
 * for each spec tag (falling back to a check mark). Used consistently across
 * all product cards.
 */
export default function SpecList({
  items,
  columns = false,
  className = "",
}: {
  items: string[];
  columns?: boolean;
  className?: string;
}) {
  const clean = items.map((item) => item.trim()).filter(Boolean);

  if (clean.length === 0) return null;

  return (
    <ul
      className={`space-y-1.5 ${columns ? "sm:grid sm:grid-cols-2 sm:gap-x-4 sm:space-y-0" : ""} ${className}`}
    >
      {clean.map((item, index) => {
        const separator = item.indexOf(":");
        const label = separator > 0 ? item.slice(0, separator).trim() : "";

        return (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-2 text-xs leading-relaxed text-[#5c5e66]"
          >
            <SpecTagIcon
              label={label}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5865F2]"
              fallback={
                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5865F2]" />
              }
            />
            <span className="min-w-0">{item}</span>
          </li>
        );
      })}
    </ul>
  );
}
