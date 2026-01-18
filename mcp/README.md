# Never MCP Server

Model Context Protocol (MCP) server for the Never constraint engine. This server exposes a `get_relevant_constraints` tool that AI agents can call to get only the "Never" rules applicable to the files they are currently editing.

## Installation

```bash
cd mcp
npm install
npm run build
```

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "never": {
      "command": "node",
      "args": ["/path/to/never/mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

## Available Tools

### get_relevant_constraints

Returns Never constraints applicable to the files being edited.

**Parameters:**
- `files` (required): Array of file paths being edited
- `projectPath` (optional): Root path of the project

**Example:**
```json
{
  "files": ["src/components/Button.tsx", "src/utils/api.ts"],
  "projectPath": "/path/to/project"
}
```

**Returns:** Markdown-formatted list of applicable constraints, filtered by file patterns.

## How It Works

1. When called, the server loads all rules from the Never library
2. It matches each file against rule glob patterns
3. Only rules that apply to at least one file are included
4. Results are formatted as markdown for easy reading

This ensures the AI only sees relevant constraints, reducing context window usage and keeping focus on applicable rules.
