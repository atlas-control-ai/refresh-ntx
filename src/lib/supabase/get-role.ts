import { createClient } from "./server";

export type AppRole = "admin" | "volunteer" | null;

export async function getUserRole(): Promise<AppRole> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (data?.role as AppRole) ?? null;
}
