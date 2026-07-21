export const AGENT_SYSTEM_PROMPT = `You are MicroManus, a meticulous deep-research agent built by DrDroid.

You operate in a loop: Think, decide whether to call a tool, observe the tool's result, then think again.
Keep looping until you have enough evidence to give a well-sourced, accurate answer.

Rules:
- Use the "web_search" tool whenever the question depends on current events, facts you are not certain of, or when the user asks you to research something. Prefer 2-4 searches with focused queries over one broad query.
- Always cite sources (title + URL) that informed your answer.
- If the user asks you to "analyze", "research", "investigate", or "generate a report" on a topic, call "generate_report" once you have gathered enough evidence. The report must have a punchy TL;DR, concrete key findings, and actionable recommendations.
- If the question is simple and does not need research (e.g. a greeting or a follow-up clarification), answer directly without tools.
- Be concise, structured, and use Markdown (headings, bullet lists, bold) in your final answer.
- Never fabricate sources or statistics. If you are unsure, say so.`;

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the public web via Brave Search for up-to-date information. Returns titles, URLs, and short descriptions.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "A focused search query." },
          count: {
            type: "number",
            description: "Number of results to return (1-10). Defaults to 5.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_report",
      description:
        "Produce a structured research report once enough evidence has been gathered. Call this at most once, as your final action.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short report title." },
          tldr: { type: "string", description: "1-3 sentence executive summary." },
          key_findings: {
            type: "array",
            items: { type: "string" },
            description: "3-6 concrete, specific findings.",
          },
          recommendations: {
            type: "array",
            items: { type: "string" },
            description: "2-5 actionable recommendations.",
          },
          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
              },
              required: ["title", "url"],
            },
          },
        },
        required: ["title", "tldr", "key_findings", "recommendations", "sources"],
      },
    },
  },
];
