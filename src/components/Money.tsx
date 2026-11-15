"use client";

import { useRegion } from "@/components/RegionProvider";

/** Renders a USD price in the visitor's currency. */
export default function Money({
  usd,
  exact = false,
  className,
}: {
  usd: number;
  exact?: boolean;
  className?: string;
}) {
  const { formatMoney } = useRegion();

  return <span className={className}>{formatMoney(usd, { exact })}</span>;
}
