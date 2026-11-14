import type { Metadata } from "next";
import AuthPanel from "@/components/AuthPanel";

export const metadata: Metadata = {
  title: "Sign in | Genericpcs",
  description:
    "Sign in to track orders, saved builds and lifetime support on your Genericpcs machines.",
};

export default function LoginPage() {
  return <AuthPanel mode="signin" />;
}
