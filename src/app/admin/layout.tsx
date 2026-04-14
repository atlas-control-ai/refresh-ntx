import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/supabase/get-role";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRole();

  return (
    <div className="flex min-h-screen">
      <AdminSidebar userEmail={user.email ?? ""} role={role} />
      <main className="flex-1 overflow-auto bg-zinc-50 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
