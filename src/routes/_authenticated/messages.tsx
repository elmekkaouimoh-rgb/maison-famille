import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { membersQuery, useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/family/AppShell";
import { fmtDate, fmtTime } from "@/lib/family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messagerie — Family OS" }, { name: "description", content: "Conversations privées de la famille." }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(membersQuery);
  const myId = me?.member?.id;
  const { data: convs = [] } = useQuery({
    queryKey: ["convs"],
    enabled: !!myId,
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("*, conversation_members(member_id,last_read_at)").order("last_message_at", { ascending: false });
      return (data ?? []).filter((c) => c.conversation_members.some((m) => m.member_id === myId));
    },
  });
  const [openId, setOpenId] = useState<string>();
  const conv = convs.find((c) => c.id === openId);
  const { data: msgs = [] } = useQuery({
    queryKey: ["msgs", openId],
    enabled: !!openId,
    queryFn: async () => (await supabase.from("messages").select("*").eq("conversation_id", openId!).order("created_at").limit(300)).data ?? [],
  });
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const { data: people = [] } = useQuery({ queryKey: ["conv-people"], queryFn: async () => (await supabase.rpc("conversation_people")).data ?? [] });
  const who = Object.fromEntries(people.map((p) => [p.id, p]));

  useEffect(() => {
    const ch = supabase
      .channel(`messages-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["msgs"] });
        qc.invalidateQueries({ queryKey: ["convs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
    if (openId && myId) supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", openId).eq("member_id", myId).then(() => qc.invalidateQueries({ queryKey: ["convs"] }));
  }, [msgs.length, openId, myId, qc]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !openId || !myId) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ conversation_id: openId, sender_id: myId, body: body.slice(0, 2000) });
    if (error) { toast.error(error.message); setText(body); }
  }

  const unread = (c: (typeof convs)[number]) => {
    const mine = c.conversation_members.find((m) => m.member_id === myId);
    return !!mine && new Date(c.last_message_at) > new Date(mine.last_read_at) && c.id !== openId;
  };

  return (
    <div className="mx-auto grid h-[calc(100dvh-10rem)] max-w-6xl gap-4 md:h-[calc(100dvh-4rem)] md:grid-cols-[20rem_1fr]">
      <section className={cn("card-modern flex min-h-0 flex-col p-4", openId && "hidden md:flex")}>
        <div className="mb-3 flex items-center gap-2">
          <h1 className="flex-1 text-2xl font-bold">💬 Messages</h1>
          {me?.isManager && <NewConversation members={members} onCreated={(id) => { qc.invalidateQueries({ queryKey: ["convs"] }); setOpenId(id); }} />}
        </div>
        <div className="stagger min-h-0 flex-1 space-y-2 overflow-y-auto">
          {convs.map((c) => (
            <button key={c.id} onClick={() => setOpenId(c.id)} className={cn("tile flex w-full items-center gap-3 p-3 text-left", openId === c.id && "ring-2 ring-primary")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-xl">{c.icon}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-bold">{c.title}</span><span className="text-xs text-muted-foreground">{c.conversation_members.length} membres · {fmtDate(c.last_message_at)}</span></span>
              {unread(c) && <span className="pop size-3 rounded-full bg-accent" aria-label="Non lu" />}
            </button>
          ))}
          {!convs.length && <p className="text-sm text-muted-foreground">Aucune conversation.</p>}
        </div>
      </section>

      <section className={cn("card-modern flex min-h-0 flex-col p-4", !openId && "hidden md:flex")}>
        {!conv ? <div className="m-auto text-center text-muted-foreground"><div className="text-5xl">💬</div>Choisis une conversation</div> : <>
          <div className="mb-3 flex items-center gap-3 border-b pb-3">
            <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setOpenId(undefined)} aria-label="Retour"><ArrowLeft /></Button>
            <span className="text-2xl">{conv.icon}</span>
            <h2 className="flex-1 truncate text-lg font-bold">{conv.title}</h2>
            <div className="flex -space-x-2">{conv.conversation_members.slice(0, 6).map((m) => <Avatar key={m.member_id} m={who[m.member_id] ?? memberById[m.member_id]} size={26} />)}</div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {msgs.map((m, i) => {
              const mine = m.sender_id === myId;
              const s = who[m.sender_id] ?? memberById[m.sender_id];
              const showHead = i === 0 || msgs[i - 1]?.sender_id !== m.sender_id;
              return (
                <div key={m.id} className={cn("rise flex items-end gap-2", mine && "flex-row-reverse")}>
                  <div className="w-7 shrink-0">{showHead && !mine && <Avatar m={s} size={28} />}</div>
                  <div className={cn("max-w-[75%] rounded-3xl px-4 py-2", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted")}>
                    {showHead && !mine && <div className="text-xs font-extrabold opacity-70">{s?.first_name}</div>}
                    <div className="whitespace-pre-wrap break-words text-sm font-semibold">{m.body}</div>
                    <div className="text-right text-[10px] opacity-60">{fmtTime(m.created_at)}</div>
                  </div>
                </div>
              );
            })}
            {!msgs.length && <p className="py-8 text-center text-sm text-muted-foreground">Écris le premier message 👋</p>}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <Input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message…" className="rounded-full" />
            <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label="Envoyer" disabled={!text.trim()}><Send /></Button>
          </form>
        </>}
      </section>
    </div>
  );
}

function NewConversation({ members, onCreated }: { members: { id: string; first_name: string; avatar: string; color: string; user_id: string | null }[]; onCreated: (id: string) => void }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("💬");
  const [ids, setIds] = useState<string[]>([]);
  async function create() {
    const myId = me?.member?.id;
    if (!title.trim() || !ids.length || !myId) { toast.error("Titre et participants requis"); return; }
    const { data, error } = await supabase.from("conversations").insert({ title: title.trim().slice(0, 60), icon }).select("id").single();
    if (error || !data) { toast.error(error?.message ?? "Erreur"); return; }
    const all = [...new Set([myId, ...ids])];
    await supabase.from("conversation_members").insert(all.map((member_id) => ({ conversation_id: data.id, member_id })));
    setOpen(false); setTitle(""); setIds([]);
    onCreated(data.id);
  }
  const others = members.filter((m) => m.id !== me?.member?.id);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="icon" aria-label="Nouvelle conversation"><Plus /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
        <div className="flex gap-2"><Input className="w-16" value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} aria-label="Icône" /><Input placeholder="Ex. Papa & Maya" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="flex flex-wrap gap-2">
          {others.map((m) => {
            const on = ids.includes(m.id);
            return <button key={m.id} type="button" onClick={() => setIds(on ? ids.filter((x) => x !== m.id) : [...ids, m.id])} className={cn("flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm font-semibold", on ? "border-primary bg-secondary" : "opacity-60")}><Avatar m={m} size={22} />{m.first_name}{!m.user_id && <span className="text-[10px] text-muted-foreground">(sans compte)</span>}</button>;
          })}
        </div>
        <Button onClick={create}>Créer</Button>
      </DialogContent>
    </Dialog>
  );
}
