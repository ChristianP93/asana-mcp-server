#!/usr/bin/env node

// MCP SDK imports
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// schemas and server info imports
import {
  GetMyAsanaTasksDueTodayInputSchema,
  GetMyAsanaTasksDueTodayLogicOutputSchema,
} from './schemas/index.js';

import fetchAsanaTasksDueToday from './asana/getTask.js'; // Importing the function to fetch tasks

// --- Constants and Environment Variables ---
const ASANA_PAT = process.env.ASANA_PERSONAL_ACCESS_TOKEN;
const ASANA_WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID;

const LOG_PREFIX = '[ASANA MCP SERVER]'; // Simplified log prefix

// The version is set from the environment variable or defaults to '0.1.0' if not provided.
const VERSION = process.env.VERSION || '0.1.0';

// Initial console log to indicate server process start (uses console.error to avoid polluting stdout)
console.error(`${LOG_PREFIX} Starting MCP server process...`);

if (!ASANA_PAT) {
  console.error(
    `${LOG_PREFIX} [CRITICAL ERROR]: ASANA_PERSONAL_ACCESS_TOKEN environment variable is not set. Exiting.`
  );
  process.exit(1);
}
if (!ASANA_WORKSPACE_GID) {
  console.error(
    `${LOG_PREFIX} [CRITICAL ERROR]: ASANA_WORKSPACE_GID environment variable is not set. Exiting.`
  );
  process.exit(1);
}

// --- McpServer Initialization ---
const serverInfo = {
  name: 'asana-mcp-server',
  version: VERSION,
  description: 'MCP Server to interact with Asana API, providing tools to fetch tasks.',
};

// Initialize McpServer.
const server = new McpServer(serverInfo /*, serverCapabilities (optional) */);
console.info(`${LOG_PREFIX} McpServer instance created: ${serverInfo.name} v${serverInfo.version}`);

// --- Tool Registration with McpServer SDK ---
server.tool(
  'get_my_tasks_due_today',
  'Retrieves your Asana tasks that are due today from the configured workspace.',
  GetMyAsanaTasksDueTodayInputSchema.shape,
  GetMyAsanaTasksDueTodayLogicOutputSchema.shape,
  async (): Promise<any> => fetchAsanaTasksDueToday()
);

// --- Main Server Execution Logic ---
/**
 * Initializes and runs the McpServer with StdioTransport.
 */
async function runServer() {
  const transport = new StdioServerTransport();
  console.info(`${LOG_PREFIX} Connecting McpServer to StdioTransport...`);
  // The .connect() method likely handles the 'initialize' handshake internally
  await server.connect(transport);
  console.info(`${LOG_PREFIX} Asana MCP Server is now running and connected via stdio.`);
  console.info(`${LOG_PREFIX} Waiting for requests from Warp client...`);
}

runServer().catch((error) => {
  console.error(`${LOG_PREFIX} [FATAL ERROR] Uncaught error during server execution:`, error);
  process.exit(1);
});

// --- Graceful Shutdown Handling ---
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, () => {
    console.info(`${LOG_PREFIX} Received ${signal}. Shutting down gracefully...`);
    process.exit(0); // Simple exit for now
  });
});
