import type { Metadata } from "next";
import AuthPanel from "@/components/AuthPanel";

export const metadata: Metadata = {
  title: "Create an account | Pcmart",
  description:
    "Create a Pcmart account to track orders, save builds and get priority support.",
};

export default function SignupPage() {
  return <AuthPanel mode="signup" />;
}
