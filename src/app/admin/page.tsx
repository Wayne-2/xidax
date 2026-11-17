import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin | Generic PCs",
  description: "Administration dashboard for Generic PCs.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
