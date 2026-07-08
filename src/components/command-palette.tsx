import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  CheckSquare,
  Inbox,
  Kanban,
  LayoutDashboard,
  Loader2,
  Plug,
  RadarIcon,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { universalSearch } from "@/lib/search.functions";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/radar", label: "Opportunity Radar", icon: RadarIcon },
  { to: "/app/crm", label: "Contacts", icon: Users },
  { to: "/app/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/integrations", label: "Integrations", icon: Plug },
] as const;

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const debounced = useDebounced(q, 300);
  const navigate = useNavigate();
  const call = useServerFn(universalSearch);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const search = useQuery({
    queryKey: ["universalSearch", debounced],
    queryFn: () => call({ data: { q: debounced, semantic: true } }),
    enabled: open && debounced.trim().length >= 2,
    staleTime: 15_000,
  });

  const go = (to: string) => {
    setOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any });
  };

  const hits = search.data?.hits ?? [];
  const memory = hits.filter((h) => h.type === "memory");
  const items = hits.filter((h) => h.type !== "memory");

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search tasks, notifications, AI memory…"
        value={q}
        onValueChange={setQ}
      />
      <CommandList>
        {debounced.trim().length < 2 ? (
          <>
            <CommandGroup heading="Jump to">
              {NAV.map((n) => (
                <CommandItem key={n.to} value={n.label} onSelect={() => go(n.to)}>
                  <n.icon className="mr-2 h-4 w-4" /> {n.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <div className="px-3 py-2 text-[11px] text-muted-foreground">
              Type at least 2 characters to search everything.
            </div>
          </>
        ) : search.isLoading || search.isFetching ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching…
          </div>
        ) : hits.length === 0 ? (
          <CommandEmpty>No results.</CommandEmpty>
        ) : (
          <>
            {items.length > 0 && (
              <CommandGroup heading="Results">
                {items.map((h) => (
                  <CommandItem
                    key={`${h.type}-${h.id}`}
                    value={`${h.title} ${h.snippet}`}
                    onSelect={() => go(h.link)}
                  >
                    <Search className="mr-2 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{h.title}</div>
                      {h.snippet && (
                        <div className="truncate text-[11px] text-muted-foreground">
                          {h.snippet}
                        </div>
                      )}
                    </div>
                    {h.meta && (
                      <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {h.meta}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {memory.length > 0 && (
              <CommandGroup heading="AI memory">
                {memory.map((h) => (
                  <CommandItem
                    key={`memory-${h.id}`}
                    value={`memory ${h.title} ${h.snippet}`}
                    onSelect={() => go(h.link)}
                  >
                    <Sparkles className="mr-2 h-4 w-4 shrink-0 text-brand" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{h.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{h.snippet}</div>
                    </div>
                    {h.meta && (
                      <span className="ml-2 shrink-0 text-[10px] text-brand">{h.meta}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
