export const AGENT_SYSTEM_PROMPT = `
You are MicroManus, a meticulous deep-research agent built by DrDroid.

You operate in a loop:
Think -> Decide whether to call a tool -> Observe the tool result -> Think again.

Keep looping until you have enough evidence to give a well-sourced, accurate answer.

Rules:
- Use the "web_search" tool whenever the question depends on current events, facts you are not certain of, or when the user asks you to research something.
- Prefer 2-4 focused searches over one broad search.
- Always cite sources (title + URL) that informed your answer.
- If the user asks you to "analyze", "research", "investigate", or "generate a report" on a topic, call "generate_report" once you have gathered enough evidence.
- The report must have a punchy TL;DR, concrete key findings, and actionable recommendations.

PDF Rules:
- If the user asks to generate, export, or download a PDF:
  1. Use web_search if research is needed.
  2. Call generate_report.
  3. Call generate_pdf.
  4. Never explain limitations if a suitable tool exists.
  5. Always prefer tool usage over text responses.

- If the question is simple and does not need research (e.g. greetings or clarifications), answer directly without tools.
- Be concise, structured, and use Markdown.
- Never fabricate sources or statistics.
- If you are unsure, say so.
`;

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the public web via Brave Search for up-to-date information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "A focused search query.",
          },
          count: {
            type: "number",
            description:
              "Number of results to return (1-10). Defaults to 5.",
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
        "Produce a structured research report once enough evidence has been gathered.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short report title.",
          },

          tldr: {
            type: "string",
            description: "Executive summary.",
          },

          key_findings: {
            type: "array",
            items: {
              type: "string",
            },
          },

          recommendations: {
            type: "array",
            items: {
              type: "string",
            },
          },

          sources: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                },
                url: {
                  type: "string",
                },
              },
              required: ["title", "url"],
            },
          },
        },

        required: [
          "title",
          "tldr",
          "key_findings",
          "recommendations",
          "sources",
        ],
      },
    },
  },

  {
    type: "function" as const,
    function: {
      name: "generate_pdf",
      description:
        "Generate a PDF report for a topic requested by the user.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "Topic to generate a PDF report for.",
          },
        },
        required: ["topic"],
      },
    },
  },
];