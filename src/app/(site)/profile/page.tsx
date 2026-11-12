import type { Metadata } from "next";
import ProfileView from "@/components/ProfileView";

export const metadata: Metadata = {
  title: "Profile | Pcmart",
  description: "Your Pcmart orders, saved builds and account details.",
};

export default function ProfilePage() {
  return (
    <main className="relative flex-1">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#e6edf7] to-transparent" />
      <ProfileView />
    </main>
  );
}
