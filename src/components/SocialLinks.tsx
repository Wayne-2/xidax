"use client";

import { addCollection, Icon } from "@iconify/react";
import collections from "./brandIcons.json";

const iconCollections = collections as unknown as Parameters<
  typeof addCollection
>[0][];
iconCollections.forEach((collection) => addCollection(collection));

const socials = [
  { name: "Instagram", icon: "simple-icons:instagram", href: "#" },
  { name: "X", icon: "simple-icons:x", href: "#" },
  { name: "TikTok", icon: "simple-icons:tiktok", href: "#" },
  { name: "WhatsApp", icon: "simple-icons:whatsapp", href: "#" },
];

export default function SocialLinks() {
  return (
    <div className="mt-6 flex items-center gap-3">
      {socials.map((social) => (
        <a
          key={social.name}
          href={social.href}
          aria-label={social.name}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d2dbe8] text-[#5c5e66] transition-colors hover:border-[#5865F2] hover:text-[#5865F2]"
        >
          <Icon icon={social.icon} height={18} ssr />
        </a>
      ))}
    </div>
  );
}
