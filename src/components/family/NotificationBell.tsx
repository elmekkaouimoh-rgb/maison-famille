import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { fmtDate, fmtTime } from "@/lib/family";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const myId = me?.member?.id;
  const { data: list = [] } = useQuery({
    queryKey: ["notifs", myId],
    enabled: !!myId,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("member_id", myId!).order("created_at", { ascending: false }).limit(30)).data ?? [],
  });
  useEffect(() => {
    if (!myId) return;
    const ch = supabase
      .channel(`notifs-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `member_id=eq.${myId}` }, (p) => {
        const n = p.new as { title: string; body: string | null };
        toast(n.title, { description: n.body ?? undefined });
        qc.invalidateQueries({ queryKey: ["notifs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [myId, qc]);
  const unread = list.filter((n) => !n.read).length;
  async function markAll() {
    if (!myId) return;
    await supabase.from("notifications").update({ read: true }).eq("member_id", myId).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifs"] });
  }
  return (
    <Popover onOpenChange={(o) => { if (!o && unread) markAll(); }}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
          <Bell className={cn("size-5", unread > 0 && "animate-[wiggle_1s_ease-in-out_infinite]")} />
          {unread > 0 && <span className="pop absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-3xl p-2">
        <div className="flex items-center justify-between px-2 py-1"><span className="font-bold">Notifications</span>{unread > 0 && <button onClick={markAll} className="text-xs font-bold text-primary">Tout marquer lu</button>}</div>
        <div className="max-h-96 space-y-1 overflow-y-auto">
          {!list.length && <p className="p-4 text-center text-sm text-muted-foreground">Rien de neuf 🌤️</p>}
          {list.map((n) => (
            <Link key={n.id} to={(n.link ?? "/dashboard") as "/dashboard"} className={cn("block rounded-2xl p-3 transition hover:bg-muted", !n.read && "bg-secondary")}>
              <div className="text-sm font-bold">{n.title}</div>
              {n.body && <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
              <div className="mt-0.5 text-[10px] text-muted-foreground">{fmtDate(n.created_at)} · {fmtTime(n.created_at)}</div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
