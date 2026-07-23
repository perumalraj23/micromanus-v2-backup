import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sparkles,
  Search,
  FileText,
  BarChart3,
  Brain,
  Zap,
  ArrowRight,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Live web research",
    desc: "Tavily-powered agent that reads real articles before answering.",
  },
  {
    icon: Brain,
    title: "Think → Act → Observe loop",
    desc: "Watch the agent's live thoughts, searches, and reasoning steps unfold.",
  },
  {
    icon: FileText,
    title: "Executive reports & PDFs",
    desc: "TL;DR, key findings, and recommendations — exported as a polished PDF.",
  },
  {
    icon: BarChart3,
    title: "Usage analytics",
    desc: "Track tokens, cost per model, cache savings, and reports generated.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          MicroManus
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 pb-24 pt-10 text-center md:pt-20">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" /> MicroManus
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          AI Research Assistant for Founders and Engineers.
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-muted-foreground md:text-lg">
          Generate cited reports, startup intelligence, competitor analysis, market research,
          and technology deep-dives in minutes.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/login">
              Start researching <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-20 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary">
                <f.icon className="h-4.5 w-4.5" />
              </div>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        Built by DrDroid · Stripe sandbox billing · Bring your own OpenAI-compatible API key
      </footer>
    </div>
  );
}
