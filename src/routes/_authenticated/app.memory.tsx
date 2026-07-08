import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Brain, Loader2, RefreshCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteAllEmbeddings,
  deleteEmbedding,
  listEmbeddings,
  reembedRow,
} from "@/lib/memory.functions";

export const Route = createFileRoute("/_authenticated/app/memory")({
  head: () => ({
    meta: [
      { title: "AI Memory — ByteBack" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const qc = useQueryClient();

  const callList = useServerFn(listEmbeddings);
  const callDelete = useServerFn(deleteEmbedding);
  const callDeleteAll = useServerFn(deleteAllEmbeddings);
  const callReembed = useServerFn(reembedRow);

  const listQ = useQuery({
    queryKey: ["embeddings", submitted],
    queryFn: () => callList({ data: { q: submitted, limit: 50 } }),
    staleTime: 30_000,
  });

  const delMut = useMutation({
    mutationFn: (id: string) => callDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Embedding removed");
      qc.invalidateQueries({ queryKey: ["embeddings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const clearMut = useMutation({
    mutationFn: () => callDeleteAll({ data: undefined }),
    onSuccess: (r) => {
      toast.success(`Cleared ${r.deleted} embeddings`);
      qc.invalidateQueries({ queryKey: ["embeddings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const reMut = useMutation({
    mutationFn: (id: string) => callReembed({ data: { id } }),
    onSuccess: () => toast.success("Re-embedded"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rows = listQ.data?.rows ?? [];
  const total = listQ.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Brain className="h-5 w-5 text-brand" /> AI Memory
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} embedded emails · used for semantic search &amp; the Opportunity Radar.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-rose-500"
          onClick={() => {
            if (confirm("Delete ALL embeddings for this workspace? This cannot be undone.")) {
              clearMut.mutate();
            }
          }}
          disabled={clearMut.isPending || total === 0}
        >
          {clearMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}{" "}
          Clear all
        </Button>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by subject, contact, company, or content…"
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      {listQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No embeddings yet. Emails are embedded automatically as they flow in.
        </div>
      ) : (
        <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {r.subject ?? "(no subject)"}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.contact_name ?? "Unknown"}
                  {r.contact_email ? ` <${r.contact_email}>` : ""}
                  {r.company ? ` · ${r.company}` : ""}
                  {r.category ? ` · ${r.category}` : ""}
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                  {r.content}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => reMut.mutate(r.id)}
                  disabled={reMut.isPending && reMut.variables === r.id}
                  title="Re-embed"
                >
                  {reMut.isPending && reMut.variables === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-rose-500 hover:text-rose-600"
                  onClick={() => delMut.mutate(r.id)}
                  disabled={delMut.isPending && delMut.variables === r.id}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
