import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Member = Tables<"members">;

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: member }, { data: roles }] = await Promise.all([
      supabase.from("members").select("*").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    const r = (roles ?? []).map((x) => x.role);
    return { userId: u.user.id, member, isAdmin: r.includes("admin"), isManager: r.includes("admin") || r.includes("adulte") };
  },
});
export function useMe() {
  return useQuery(meQuery);
}
export const membersQuery = queryOptions({
  queryKey: ["members"],
  queryFn: async () => {
    const { data, error } = await supabase.from("members").select("*").order("sort");
    if (error) throw error;
    return data;
  },
});
