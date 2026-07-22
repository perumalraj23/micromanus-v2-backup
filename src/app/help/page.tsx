import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sparkles,
  Rocket,
  CreditCard,
  Cpu,
  Coins,
  FileText,
  HelpCircle,
} from "lucide-react";

const SECTIONS = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting Started",
    items: [
      {
        q: "How do I start my first research?",
        a: "Sign in, add a model API key in Settings, then just ask a question in Chat — MicroManus will search the web, think through multiple steps, and answer.",
      },
      {
        q: "Do I need my own API key?",
        a: "Yes — MicroManus is bring-your-own-key. Add an OpenAI, Anthropic, Google, xAI, OpenRouter, or Groq (or any OpenAI-compatible) key in Settings.",
      },
    ],
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Billing",
    items: [
      {
        q: "How do credits work?",
        a: "Each research query uses 1 credit. Buy credit packs from the paywall page, or redeem a coupon code if you have one.",
      },
      {
        q: "What happens if a research query fails?",
        a: "Your credit is automatically refunded if the agent errors out, returns an empty response, or you stop it mid-run.",
      },
      {
        q: "Where can I see my payment history?",
        a: "Settings → Billing shows your current balance, total payments, and a full history of past purchases.",
      },
    ],
  },
  {
    id: "models",
    icon: Cpu,
    title: "Models",
    items: [
      {
        q: "Which providers are supported?",
        a: "Any OpenAI-compatible chat completions endpoint — including OpenAI, Anthropic, Google Gemini, xAI Grok, OpenRouter, and Groq.",
      },
      {
        q: "How do I check if my key works?",
        a: "Use the \"Test Connection\" button on any model card in Settings — it sends a real request and reports back latency, tokens, and a specific error if something's wrong.",
      },
      {
        q: "Can I edit a model configuration after adding it?",
        a: "Yes — click the pencil icon on any model card to edit its label, provider, endpoint, model name, or API key without deleting it.",
      },
    ],
  },
  {
    id: "credits",
    icon: Coins,
    title: "Credits",
    items: [
      {
        q: "How do I get more credits?",
        a: "Open the paywall page (linked from Chat and Settings) and choose a credit pack, or redeem a coupon code.",
      },
    ],
  },
  {
    id: "reports",
    icon: FileText,
    title: "Reports",
    items: [
      {
        q: "How do I generate a report?",
        a: "Ask MicroManus for an executive summary, analysis, or comparison — when the agent produces a structured result, it appears as a report card with a PDF export button.",
      },
      {
        q: "Where can I find all my past reports?",
        a: "The Reports page (in the sidebar) lists every report you've generated, with a link back to the original conversation and a PDF download.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          MicroManus
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link href="/chat">Back to app</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-24 pt-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
          <p className="mt-2 text-muted-foreground">Everything you need to get the most out of MicroManus.</p>
        </div>

        <div className="flex flex-col gap-6">
          {SECTIONS.map((section) => (
            <Card key={section.id} id={section.id} className="scroll-mt-6 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <section.icon className="h-5 w-5 text-primary" /> {section.title}
              </h2>
              <div className="flex flex-col gap-4">
                {section.items.map((item) => (
                  <div key={item.q}>
                    <p className="font-medium">{item.q}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card className="p-5">
            <h2 className="mb-2 text-lg font-semibold">FAQ</h2>
            <div className="flex flex-col gap-4">
              <div>
                <p className="font-medium">Is my API key secure?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yes — keys are encrypted at rest (AES-256-GCM) and are never sent back to the browser after saving.
                </p>
              </div>
              <div>
                <p className="font-medium">Can I use MicroManus on mobile?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yes — the sidebar, chat, analytics, and settings are all responsive and work on phone-sized screens.
                </p>
              </div>
              <div>
                <p className="font-medium">Something isn&apos;t working — what do I do?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check the <Link href="/status" className="underline">status page</Link> for live system health, or
                  try Test Connection in Settings to rule out a model configuration issue.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
