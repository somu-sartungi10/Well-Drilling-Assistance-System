import { useState } from "react"
import { Check, FileText, Pencil, ScanText, X } from "lucide-react"
import { cn } from "cn"
import { DOCUMENTS_BY_WELL } from "@/data/documents"
import { ScreenHeader } from "@/components/shared/Ui"
import { Badge } from "@/components/ui/badge"

function confColor(c: number) {
  return c >= 0.95 ? "#22c55e" : c >= 0.88 ? "#eab308" : "#f97316"
}

/** per-field review state, keyed by `${docId}:${label}` */
type FieldState = "pending" | "accepted" | "rejected"

function ExtractedFieldRow({
  label,
  value,
  confidence,
}: {
  docId: string
  label: string
  value: string
  confidence: number
}) {
  const [state, setState] = useState<FieldState>("pending")
  const [edited, setEdited] = useState(value)
  const [editing, setEditing] = useState(false)
  const accepted = state === "accepted"
  const rejected = state === "rejected"

  return (
    <div
      className={cn(
        "rounded-lg bg-secondary/60 px-3 py-2 transition-opacity",
        rejected && "opacity-40",
        accepted && "border border-emerald-500/40 bg-emerald-500/8",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="flex items-center gap-2">
          {accepted && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">pushed to knowledge graph</span>
          )}
          {rejected && <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">rejected</span>}
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{ color: accepted ? "#22c55e" : confColor(confidence) }}
          >
            {Math.round(confidence * 100)}%
          </span>
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        {editing ? (
          <input
            value={edited}
            autoFocus
            onChange={(e) => setEdited(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditing(false)
                setState("accepted")
              }
              if (e.key === "Escape") {
                setEdited(value)
                setEditing(false)
              }
            }}
            className="w-full rounded border border-cyan-500/50 bg-background px-1.5 py-0.5 text-xs outline-none"
          />
        ) : (
          <span className={cn("text-xs font-semibold", edited !== value && "text-cyan-500 dark:text-cyan-300")}>{edited}</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {!editing && (
            <>
              <button
                onClick={() => setState(accepted ? "pending" : "accepted")}
                title={accepted ? "Undo accept" : "Accept — push to knowledge graph"}
                className={cn(
                  "grid size-5 place-items-center rounded transition-colors",
                  accepted ? "bg-emerald-500/25 text-emerald-400" : "text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-400",
                )}
              >
                <Check className="size-3" />
              </button>
              <button
                onClick={() => setEditing(true)}
                title="Edit value"
                className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-cyan-500/15 hover:text-cyan-400"
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={() => setState(rejected ? "pending" : "rejected")}
                title={rejected ? "Undo reject" : "Reject — remove from corpus"}
                className={cn(
                  "grid size-5 place-items-center rounded transition-colors",
                  rejected ? "bg-destructive/25 text-destructive" : "text-muted-foreground hover:bg-destructive/15 hover:text-destructive",
                )}
              >
                <X className="size-3" />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${confidence * 100}%`, background: accepted ? "#22c55e" : confColor(confidence) }}
        />
      </div>
    </div>
  )
}

export function WellDocumentViewer({ wellId }: { wellId: string }) {
  const docs = DOCUMENTS_BY_WELL[wellId] ?? []
  const [activeId, setActiveId] = useState(docs[0]?.id ?? null)
  const doc = docs.find((d) => d.id === activeId) ?? docs[0]

  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
        <FileText className="mx-auto mb-2 size-6 opacity-30" />
        No documents indexed for this well yet. The ingestion pipeline processes WCRs, DDRs, mud logs, and cement reports.
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* doc list */}
      <div className="space-y-2">
        {docs.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveId(d.id)}
            className={cn(
              "w-full rounded-lg border p-3 text-left transition-colors",
              doc?.id === d.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-secondary",
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-[11px] font-semibold">{d.ref}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{d.kind}</span>·<span>{d.pages} pages</span>·<span>{d.date}</span>
            </div>
          </button>
        ))}
      </div>

      {/* viewer */}
      {doc && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* "scanned" page */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <FileText className="size-3.5 text-muted-foreground" /> Source page · {doc.kind}
              </span>
              <Badge variant="secondary" className="text-[9px]">{doc.pipelineStatus}</Badge>
            </div>
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap p-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
              {doc.excerpt}
            </pre>
          </div>

          {/* extracted fields */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <ScanText className="size-3.5 text-primary" /> AI-extracted fields
              </span>
              <span className="text-[10px] text-muted-foreground">OCR + NLP pipeline</span>
            </div>
            <div className="space-y-2.5 p-4">
              {doc.extracted.map((f) => (
                <ExtractedFieldRow key={f.label} docId={doc.id} label={f.label} value={f.value} confidence={f.confidence} />
              ))}
              <div className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                ✓ accept pushes the field into the NWIS knowledge graph · ✎ edit corrects an OCR misread · ✕ reject removes it from the corpus.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function DocumentsTab() {
  return (
    <div className="space-y-4 p-5">
      <ScreenHeader
        title="Document Intelligence"
        subtitle="Historical WCRs, DDRs, mud logs, and cement reports — structured by the AI ingestion pipeline"
      />
      <div className="rounded-xl border border-border bg-card p-4">
        <WellDocumentViewer wellId="dikom-3" />
      </div>
    </div>
  )
}
