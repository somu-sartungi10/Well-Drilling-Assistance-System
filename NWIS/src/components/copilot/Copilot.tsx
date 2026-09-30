import { useEffect, useRef, useState } from "react"
import { Bot, BookMarked, Send, Sparkles, X } from "lucide-react"
import { cn } from "cn"
import { useAppStore } from "@/store/useAppStore"
import { composeAnswer } from "@/lib/answerComposer"

const STARTERS = [
  "What risks are expected ahead?",
  "What happened in Barail on offsets?",
  "Which wells had stuck pipe?",
  "Show lessons for mud losses",
  "Tell me about KTL-1",
  "What's at 3,200 m?",
]

/** Renders simple **bold** and bullet lines from the composer output. */
function RichText({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split("\n")
  const boldify = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <b key={j} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </b>
      ) : (
        <span key={j}>{p}</span>
      ),
    )
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const last = i === lines.length - 1 && streaming
        if (line.trim() === "") return null
        if (line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-primary">•</span>
              <span className={cn("flex-1", last && "stream-cursor")}>{boldify(line.slice(2))}</span>
            </div>
          )
        }
        if (line.startsWith("Sources:")) {
          return (
            <p key={i} className="rounded-md border border-cyan-500/25 bg-cyan-500/8 px-2 py-1.5 text-[10px] leading-relaxed text-cyan-200/90">
              {boldify(line)}
            </p>
          )
        }
        return (
          <p key={i} className={cn("leading-relaxed", line.startsWith("*Context") && "text-[10px] italic text-muted-foreground", line.startsWith("↳") && "pl-4 text-primary/90", last && "stream-cursor")}>
            {boldify(line)}
          </p>
        )
      })}
    </div>
  )
}

/** Floating chat window: the open state of the copilot widget. */
function CopilotWindow({ onClose }: { onClose: () => void }) {
  const messages = useAppStore((s) => s.messages)
  const ask = useAppStore((s) => s.askCopilot)
  const finishStreaming = useAppStore((s) => s.finishStreaming)
  const liveDepth = useAppStore((s) => s.liveDepthM)

  const [input, setInput] = useState("")
  const [answers, setAnswers] = useState<Record<string, { text: string; citations: { label: string; ref: string }[]; followUps: string[] }>>({})
  const startRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const typingIdRef = useRef<string | null>(null)
  const answersRef = useRef(answers)
  answersRef.current = answers

  const stopTyping = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    typingIdRef.current = null
  }

  // typewriter: ~330 chars/s while the page is visible. Runs on a self-owned
  // interval instead of an effect keyed on `messages` — committing a new
  // messages array every tick inside that effect re-triggered the effect
  // synchronously and blew past React's max-update-depth, unmounting the
  // whole app (the blank dark page).
  const typeAnswer = (id: string) => {
    stopTyping()
    typingIdRef.current = id
    startRef.current = performance.now()
    const full = answersRef.current[id]?.text ?? ""
    const commit = (text: string, done: boolean) =>
      useAppStore.setState((st) => ({
        messages: st.messages.map((m) =>
          m.id === id ? { ...m, text, streaming: !done } : m,
        ),
      }))

    // hidden/background tabs (throttled timers) get the full text instantly
    if (document.hidden || full.length === 0) {
      commit(full, true)
      finishStreaming(id)
      return
    }

    const reveal = () => {
      const target = Math.min(full.length, Math.floor((performance.now() - startRef.current) / 3))
      if (target >= full.length) {
        stopTyping()
        commit(full, true)
        finishStreaming(id)
        return
      }
      commit(full.slice(0, target), false)
    }
    reveal()
    timerRef.current = window.setInterval(reveal, 16)
    // deterministic fallback: heavily-throttled/occluded windows still get the
    // full answer promptly instead of a frozen partial reveal
    window.setTimeout(() => {
      if (typingIdRef.current === id) {
        stopTyping()
        commit(full, true)
        finishStreaming(id)
      }
    }, 2000)
  }

  // on unmount: stop the clock; if an answer was mid-stream, land its full
  // text so nothing is left with a frozen cursor
  useEffect(
    () => () => {
      const id = typingIdRef.current
      stopTyping()
      useAppStore.setState((st) => ({
        messages: st.messages.map((m) =>
          m.streaming
            ? { ...m, text: (id && answersRef.current[id]?.text) || m.text, streaming: false }
            : m,
        ),
      }))
    },
    [],
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const submit = (q: string) => {
    const query = q.trim()
    if (!query) return
    const answer = composeAnswer(query, liveDepth)
    const pendingId = `a${Date.now()}`
    stopTyping()
    // force-finish any answer that is still typing
    useAppStore.setState((st) => ({
      messages: st.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    }))
    ask(query, pendingId) // pushes user msg + assistant placeholder with the SAME id
    const nextAnswers = { ...answersRef.current, [pendingId]: answer }
    answersRef.current = nextAnswers
    setAnswers(nextAnswers)
    typeAnswer(pendingId) // start streaming immediately, outside the render cycle
  }

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">NWIS Copilot</div>
            <div className="text-[10px] text-muted-foreground">Retrieval over offset-well corpus · offline</div>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-primary/25 bg-primary/8 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Institutional memory, on demand
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                I search {`{events, lessons, wells, formations}`} across all offset wells and answer with citations. Ask about risks ahead, a formation, a depth, an event type, or a well by name.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground">
                  {m.text}
                </div>
              </div>
            )
          }
          const ans = answers[m.id]
          return (
            <div key={m.id} className="space-y-2">
              <div className="rounded-2xl rounded-bl-sm border border-border bg-secondary/70 px-3.5 py-2.5 text-xs">
                {ans ? (
                  <RichText text={m.text || ans.text.slice(0, 3)} streaming={m.streaming} />
                ) : (
                  <span className="text-muted-foreground">Thinking…</span>
                )}
              </div>
              {ans && !m.streaming && (
                <>
                  {ans.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <BookMarked className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                      {ans.citations.map((c, i) => (
                        <span
                          key={i}
                          className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                          title={c.ref}
                        >
                          [{i + 1}] {c.label} — {c.ref}
                        </span>
                      ))}
                    </div>
                  )}
                  {ans.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ans.followUps.map((f) => (
                        <button
                          key={f}
                          onClick={() => submit(f)}
                          className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* input */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submit(input)
                setInput("")
              }
            }}
            placeholder="Ask about risks, formations, depths, wells…"
            className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
          />
          <button
            onClick={() => {
              submit(input)
              setInput("")
            }}
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Floating widget: launcher bubble when closed, chat window when open. */
export default function Copilot() {
  const open = useAppStore((s) => s.copilotOpen)
  const setOpen = useAppStore((s) => s.setCopilotOpen)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Ask NWIS Copilot — retrieval over the offset-well corpus"
        className="fixed bottom-5 right-5 z-[950] grid size-14 place-items-center rounded-full bg-cyan-500 text-cyan-950 shadow-[0_8px_30px_rgba(34,211,238,0.35)] transition-transform hover:scale-105 dark:bg-cyan-400"
      >
        <Bot className="size-7" />
        <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-card bg-emerald-400" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-[950] flex h-[600px] max-h-[calc(100vh-40px)] w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <CopilotWindow onClose={() => setOpen(false)} />
    </div>
  )
}
