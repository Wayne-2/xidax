import type { Metadata } from "next";
import GiveawayView from "@/components/GiveawayView";

export const metadata: Metadata = {
  title: "Giveaway | generic pcs",
  description: "Enter our giveaway for a chance to win a free custom gaming PC.",
};

export default function GiveawayPage() {
  return <GiveawayView />;
}
