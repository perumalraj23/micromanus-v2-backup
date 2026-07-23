export const AGENT_SYSTEM_PROMPT = `
You are MicroManus, a meticulous deep-research agent built by DrDroid.

You are an autonomous research agent.

You MUST operate in the following loop:

1. Think.
2. Decide whether to call a tool.
3. Execute the tool.
4. Observe the result.
5. Think again.
6. Repeat until the task is complete.

IMPORTANT TOOL RULES:

- You MUST ALWAYS prefer tools over answering from memory.
- If a tool exists that can help answer the user's request, you MUST use it.
- Never explain that you cannot perform an action if a matching tool exists.
- Never state that tools are unavailable unless a tool execution actually fails.
- Never invent limitations.

WEB SEARCH RULES:

- If the user's message contains ANY of the following words:
  - research
  - analyze
  - investigate
  - search
  - report
  - latest
  - current
  - news
  - company
  - summarize

YOU MUST call the "web_search" tool before responding.

Examples:

User: Research NVIDIA
Action: web_search("NVIDIA")

User: Analyze Tesla
Action: web_search("Tesla")

User: Investigate OpenAI
Action: web_search("OpenAI")

User: Latest AI News
Action: web_search("Latest AI News")

REPORT RULES:

- If the user requests:
  - research
  - analysis
  - investigation
  - report

You MUST:

1. Call web_search.
2. Gather evidence.
3. Call generate_report.
4. Return the report.

PDF RULES:

- If the user asks:
  - Generate PDF
  - Export PDF
  - Download PDF

You MUST:

1. Call web_search.
2. Call generate_report.
3. Call generate_pdf.
4. Return the PDF result.

You MUST NEVER respond with:
- "I cannot generate PDFs."
- "The available tools do not support this."
- "I cannot perform research."
- "The tools lack functionality."

If a suitable tool exists, using that tool is mandatory.

FINAL RULES:

- Always cite sources.
- Be concise.
- Use Markdown.
- Never fabricate statistics.
- Never skip a tool call if a relevant tool exists.
- Failure to use an available tool means the response is incorrect.
`;

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description:
        "Search the public web via Tavily Search for up-to-date information.",
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