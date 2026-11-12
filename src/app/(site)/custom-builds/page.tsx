import type { Metadata } from "next";
import CustomBuilder from "@/components/CustomBuilder";
import RevealObserver from "@/components/RevealObserver";

export const metadata: Metadata = {
  title: "Custom Builds | Pcmart",
};

export default function CustomBuildsPage() {
  return (
    <main className="relative flex-1">
      <CustomBuilder />
      <RevealObserver />
    </main>
  );
}
