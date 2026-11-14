import type { Metadata } from "next";
import AuthPanel from "@/components/AuthPanel";

export const metadata: Metadata = {
  title: "Create an account | generic pcs",
  description:
    "Create a generic pcs account to track orders, save builds and get priority support.",
};

export default function SignupPage() {
  return <AuthPanel mode="signup" />;
}
