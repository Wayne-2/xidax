"use client";

import type { ReactNode } from "react";
import { addCollection, Icon } from "@iconify/react";
import { icons as mdiIcons } from "@iconify-json/mdi";
import { SPEC_TAG_ICONS } from "@/data/spec-tags";

addCollection(mdiIcons);

/**
 * Renders the exact icon registered for a spec tag label. Labels without a
 * registered icon fall back to `fallback` (the default check mark).
 */
export default function SpecTagIcon({
  label,
  className = "h-4 w-4",
  fallback = null,
}: {
  label: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const icon = SPEC_TAG_ICONS[label];

  if (!icon) return <>{fallback}</>;

  return <Icon icon={icon} className={className} ssr aria-hidden="true" />;
}
