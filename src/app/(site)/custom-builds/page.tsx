import type { Metadata } from "next";
import CustomBuildRequest from "@/components/CustomBuildRequest";
import RevealObserver from "@/components/RevealObserver";

export const metadata: Metadata = {
  title: "Custom Builds | generic pcs",
};

export default function CustomBuildsPage() {
  return (
    <main className="relative flex-1">
      <CustomBuildRequest />
      <RevealObserver />
    </main>
  );
}
