import { Avatar } from "@/components/family/AppShell";
import { cn } from "@/lib/utils";

export function MemberTabs({ members, current, onSelect }: { members: { id: string; first_name: string; avatar: string; color: string }[]; current: string | undefined; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {members.map((k) => (
        <button key={k.id} onClick={() => onSelect(k.id)} className={cn("card-modern flex shrink-0 items-center gap-2 px-4 py-2 font-bold transition", current === k.id ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100")}>
          <Avatar m={k} size={30} /> {k.first_name}
        </button>
      ))}
    </div>
  );
}
