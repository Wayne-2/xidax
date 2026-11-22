import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "Payments · Admin",
};

export default function AdminPaymentsPage() {
  return <AdminDashboard initialTab="payments" />;
}
