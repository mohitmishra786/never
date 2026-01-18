#!/usr/bin/env node
/**
 * Never MCP Server
 * Model Context Protocol server that exposes get_relevant_constraints tool
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getRelevantConstraints } from './tools/get_relevant_constraints.js';

// Create the MCP server
const server = new Server(
    {
        name: 'never-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'get_relevant_constraints',
                description:
                    'Get Never constraints applicable to the files currently being edited. ' +
                    'Returns only the rules that match the file patterns, keeping the AI focused on relevant constraints.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        files: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of file paths being edited',
                        },
                        projectPath: {
                            type: 'string',
                            description: 'Root path of the project (optional, defaults to cwd)',
                        },
                    },
                    required: ['files'],
                },
            },
        ],
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'get_relevant_constraints') {
        const files = (args?.files as string[]) || [];
        const projectPath = (args?.projectPath as string) || process.cwd();

        try {
            const result = await getRelevantConstraints(files, projectPath);
            return {
                content: [
                    {
                        type: 'text',
                        text: result,
                    },
                ],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error getting constraints: ${message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    return {
        content: [
            {
                type: 'text',
                text: `Unknown tool: ${name}`,
            },
        ],
        isError: true,
    };
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Never MCP Server running on stdio');
}

main().catch(console.error);
