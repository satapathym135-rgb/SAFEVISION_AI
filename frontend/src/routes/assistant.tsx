import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Send,
  Sparkles,
  User,
  FileText,
  ShieldAlert,
  ClipboardCheck,
  TrendingUp,
  HelpCircle,
} from "lucide-react";

import { PageHeader } from "@/components/sentinel/ui";
import { meta } from "@/components/sentinel/meta";
import { askSafetyAssistant } from "@/lib/api";

export const Route = createFileRoute("/assistant")({
  head: () =>
    meta(
      "SafeVision AI Assistant",
      "AI safety assistant connected to live factory safety data."
    ),
  component: Assistant,
});

const samples = [
  "What is the current PPE compliance?",
  "How many violations are there?",
  "What is the current factory risk?",
  "Are there any fire or smoke events?",
];

const caps = [
  [HelpCircle, "Safety Q&A"],
  [ShieldAlert, "Incident explanation"],
  [ClipboardCheck, "Compliance analysis"],
  [TrendingUp, "Risk analysis"],
  [FileText, "Live safety data"],
] as const;

type Msg = {
  role: "user" | "ai";
  text: string;
};

function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text:
        "Hello, I'm **SafeVision AI Safety Assistant**. I am connected to your factory safety data, PPE compliance records, violations and fire/smoke events. How can I help?",
    },
  ]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [msgs, typing]);

  const send = async (q: string) => {
    if (!q.trim() || typing) return;

    const question = q.trim();

    setMsgs((m) => [
      ...m,
      {
        role: "user",
        text: question,
      },
    ]);

    setInput("");
    setTyping(true);

    try {
      const result = await askSafetyAssistant(question);

      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: result.answer ?? "No response received from SafeVision AI.",
        },
      ]);
    } catch (error) {
      console.error("Safety Assistant error:", error);

      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text:
            "I could not connect to the SafeVision backend. Please make sure the FastAPI server is running on port 8000.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const render = (t: string) =>
    t.split("\n").map((line, i) => (
      <p key={i} className="min-h-[0.5rem]">
        {line
          .split(/(\*\*[^*]+\*\*)/)
          .map((p, j) =>
            p.startsWith("**") ? (
              <strong
                key={j}
                className="text-primary"
              >
                {p.slice(2, -2)}
              </strong>
            ) : (
              p
            )
          )}
      </p>
    ));

  return (
    <>
      <PageHeader
        title="SafeVision AI Safety Assistant"
        subtitle="AI safety intelligence connected to live factory data and PostgreSQL"
      />

      <div className="grid gap-6 xl:grid-cols-4">

        {/* CHAT */}
        <div className="glass flex h-[calc(100vh-14rem)] flex-col rounded-xl xl:col-span-3">

          <div className="flex-1 space-y-5 overflow-y-auto p-6">

            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 animate-fade-up ${
                  m.role === "user"
                    ? "flex-row-reverse"
                    : ""
                }`}
              >

                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    m.role === "ai"
                      ? "bg-primary/15 text-primary"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {m.role === "ai" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </span>

                <div
                  className={`max-w-[75%] space-y-1 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "ai"
                      ? "border bg-background/40"
                      : "bg-primary/15"
                  }`}
                >
                  {render(m.text)}
                </div>

              </div>
            ))}

            {typing && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Bot className="h-4 w-4" />
                </span>

                <div className="flex items-center gap-1 rounded-xl border bg-background/40 px-4">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                      style={{
                        animationDelay: `${d * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={end} />
          </div>

          {/* INPUT */}
          <div className="border-t p-4">

            <div className="mb-3 flex flex-wrap gap-2">
              {samples.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={typing}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about compliance, workers, violations, fire, smoke or risk..."
                className="flex-1 rounded-lg border bg-background/40 px-4 py-3 text-sm outline-none focus:border-primary"
              />

              <button
                type="submit"
                disabled={typing || !input.trim()}
                className="grid w-12 place-items-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>

            </form>
          </div>
        </div>

        {/* CAPABILITIES */}
        <div className="glass h-fit rounded-xl p-5">

          <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Capabilities
          </p>

          <ul className="space-y-3">
            {caps.map(([I, l]) => (
              <li
                key={l}
                className="flex items-center gap-3 text-sm"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-primary">
                  <I className="h-4 w-4" />
                </span>

                {l}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">
              DATA SOURCES
            </p>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              YOLO11 PPE Detection
              <br />
              ByteTrack Worker Tracking
              <br />
              Fire & Smoke Detection
              <br />
              PostgreSQL Safety Records
            </p>
          </div>

        </div>
      </div>
    </>
  );
}