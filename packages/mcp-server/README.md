# @mohitmishra7/never-mcp-server

*"Bridging the gap between your rules and your LLM."*

This is the Model Context Protocol (MCP) server for **Never**. It allows MCP-compliant AI clients (like Claude Desktop) to dynamically access and query your project's constraint library.

---

## Why This Exists

Static rule files (`CLAUDE.md`) are great, but they are passive. The AI has to read them. An MCP server allows the AI to *ask* for the rules.

When you connect Claude Desktop to this server, it gains a tool: `get_relevant_constraints`. It can invoke this tool when it starts a task to understand exactly what boundaries it must operate within for the current project context.

## capabilities

1.  **Dynamic Rule Retrieval:** The server reads your `.never/config.yaml` and returns only the active rules.
2.  **Context Awareness:** It can filter rules based on the files the user is currently asking about (e.g., "Give me the rules for `auth.ts`").
3.  **Conflict Resolution:** It leverages the core engine to filter out contradictory or duplicated rules before sending them to the LLM context.

## Setup

You generally do not install this package manually. Instead, you configure it in your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "never": {
      "command": "npx",
      "args": ["-y", "@mohitmishra7/never-mcp-server"]
    }
  }
}
```

## How It Works

The server sits on top of `@mohitmishra7/never-core`. When Claude requests constraints:
1.  The server locates the project root.
2.  It loads the rule library and configuration.
3.  It runs the `SyncEngine` logic in memory.
4.  It returns the structured constraints as a JSON payload to the LLM.

This ensures that the constraints served via MCP are identical to those enforced by the CLI. There is one source of truth.

---

MIT License
