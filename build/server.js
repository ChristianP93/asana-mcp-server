#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import axios from 'axios';
// dotenv.config();
const ASANA_API_BASE_URL = 'https://app.asana.com/api/1.0';
const ASANA_PAT = process.env.ASANA_PERSONAL_ACCESS_TOKEN;
const ASANA_WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID;
// --- Logs prefix ---
const LOG_PREFIX_MCP_SERVER = '[ASANA MCP SERVER]';
const LOG_PREFIX_HTTP = '[ASANA MCP SERVER - HTTP]';
console.log(`${LOG_PREFIX_MCP_SERVER} Starting MCP server...`);
if (!ASANA_PAT) {
  console.error(`${LOG_PREFIX_MCP_SERVER} [ERROR]: ASANA_PERSONAL_ACCESS_TOKEN not found.`);
  process.exit(1);
}
if (!ASANA_WORKSPACE_GID) {
  console.error(`${LOG_PREFIX_MCP_SERVER} [ERROR]: ASANA_WORKSPACE_GID not found.`);
  process.exit(1);
}
const server = new McpServer(
  {
    name: 'asana-mcp-server',
    version: '0.0.1',
    description: 'Asana MCP Server',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
async function getUserTaskListGid(workspaceGid) {
  console.log(
    `${LOG_PREFIX_MCP_SERVER} trying to get User Task List GID for workspace: ${workspaceGid}`
  );
  try {
    const response = await axios.get(`${ASANA_API_BASE_URL}/users/me/user_task_list`, {
      headers: { Authorization: `Bearer ${ASANA_PAT}`, Accept: 'application/json' },
      params: { workspace: workspaceGid },
    });
    if (response.data?.data?.gid) {
      console.log(`${LOG_PREFIX_MCP_SERVER} User Task List GID found: ${response.data.data.gid}`);
      return response.data.data.gid;
    }
    console.error(
      `${LOG_PREFIX_MCP_SERVER} Api response without GID for workspace ${workspaceGid}:`,
      response.data
    );
    return null;
  } catch (error) {
    console.error(
      `${LOG_PREFIX_MCP_SERVER} Error getting User Task List GID for workspace ${workspaceGid}:`
    );
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      console.error(
        `${LOG_PREFIX_MCP_SERVER} Error details:`,
        axiosError.response?.status,
        axiosError.response?.data
      );
    } else {
      console.error(error);
    }
    return null;
  }
}
const getTask = async () => {
  console.log(`${LOG_PREFIX_HTTP} Start logic get_my_tasks_due_today`);
  const todayString = getTodayDateString();
  const userTaskListGid = await getUserTaskListGid(ASANA_WORKSPACE_GID);
  if (!userTaskListGid) {
    return {
      content: [{ type: 'ERROR', text: 'Unable to get User Task List GID.' }],
    };
  }
  console.log(
    `${LOG_PREFIX_HTTP} User Task List GID: ${userTaskListGid}. Getting tasks due today...`
  );
  const params = {
    due_on: todayString,
    completed: false,
    opt_fields: 'name,due_on,permalink_url,assignee.name,assignee.gid,projects.name,projects.gid',
  };
  try {
    const apiResponse = await axios.get(
      `${ASANA_API_BASE_URL}/user_task_lists/${userTaskListGid}/tasks`,
      {
        headers: { Authorization: `Bearer ${ASANA_PAT}`, Accept: 'application/json' },
        params: params,
      }
    );
    const tasks = apiResponse.data.data;
    console.log(`${LOG_PREFIX_HTTP} Founded ${tasks.length} tasks due today.`);
    return {
      content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
    };
  } catch (error) {
    console.error(`${LOG_PREFIX_HTTP} Error getting tasks due today:`);
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      let errorMessage = 'General error retrieving tasks due today.';
      if (axiosError.response) {
        errorMessage = `Error details: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`;
        console.error(`${LOG_PREFIX_HTTP} Error details:`, axiosError.response?.data);
      } else if (axiosError.request) {
        errorMessage = 'Timeout error: No response received from Asana API.';
      }
      return {
        content: [{ type: 'ERROR', text: JSON.stringify(errorMessage, null, 2) }],
      };
    }
    let internalErrorMessage = 'General error retrieving tasks due today.';
    return {
      content: [{ type: 'ERROR', text: JSON.stringify(internalErrorMessage, null, 2) }],
    };
  }
};
// server.setRequestHandler(ListToolsRequestSchema, async () => {
//   return {
//     tools: [
//       {
//         name: "get_my_tasks_due_today",
//         description: "Get my tasks due today",
//         // !!! MANCANO GLI SCHEMI QUI !!!
//         // Devi aggiungere input_schema e output_schema come abbiamo discusso prima
//         input_schema: {
//             type: "object",
//             title: "GetMyAsanaTasksDueTodayInput",
//             properties: {},
//             required: [],
//             additionalProperties: false
//         },
//         output_schema: { // Lo schema che abbiamo definito nella risposta precedente
//             type: "object",
//             title: "GetMyAsanaTasksDueTodayOutput",
//             // ... (copia qui lo schema dettagliato dell'output che avevamo definito)
//              properties: {
//                 success: { type: "boolean", description: "Indica se la chiamata allo strumento ha avuto successo." },
//                 // ... tutti gli altri campi come definiti prima ...
//                 tasks: {
//                     type: "array",
//                     nullable: true,
//                     description: "Elenco dei task Asana.",
//                     items: {
//                         type: "object",
//                         title: "AsanaTaskItem",
//                         properties: { /* ... */ },
//                         required: ["gid", "name", "permalink_url"]
//                     }
//                 }
//             },
//             required: ["success"]
//         }
//       }
//     ],
//   };
// });
server.tool('get_my_tasks_due_today', 'Get my tasks due today', async () => {
  return getTask();
});
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Asana MCP Server running on stdio');
}
runServer().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
