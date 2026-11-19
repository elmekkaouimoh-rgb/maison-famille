import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Member = Tables<"members"> & { photo_url?: string | undefined };

async function withPhotos<T extends Tables<"members">>(rows: T[]): Promise<(T & { photo_url?: string | undefined })[]> {
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
  if (!paths.length) return rows;
  const { data } = await supabase.storage.from("avatars").createSignedUrls(paths, 60 * 60 * 12);
  const urls: Record<string, string> = {};
  data?.forEach((s) => { if (s.path && s.signedUrl) urls[s.path] = s.signedUrl; });
  return rows.map((r) => ({ ...r, photo_url: r.photo_path ? urls[r.photo_path] : undefined }));
}

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
    const m = member ? (await withPhotos([member]))[0]! : null;
    return { userId: u.user.id, member: m as Member | null, isAdmin: r.includes("admin"), isManager: r.includes("admin") || r.includes("adulte") };
  },
});
export function useMe() {
  return useQuery(meQuery);
}
export const membersQuery = queryOptions({
  queryKey: ["members"],
  queryFn: async (): Promise<Member[]> => {
    const { data, error } = await supabase.from("members").select("*").order("sort");
    if (error) throw error;
    return withPhotos(data);
  },
});
