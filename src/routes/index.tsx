import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "EL MEKKAOUI — l'organisation de la famille" },
      { name: "description", content: "Calendrier, tâches, routines et récompenses de toute la famille en un seul endroit." },
      { property: "og:title", content: "EL MEKKAOUI — l'organisation de la famille" },
      { property: "og:description", content: "Calendrier, tâches, routines et récompenses de toute la famille." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/auth" });
  },
});
