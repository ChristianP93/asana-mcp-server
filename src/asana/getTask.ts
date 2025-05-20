// Standard library and third-party imports
import axios from 'axios';
import { z } from 'zod';

import getTodayDateString from '../utils/getTodayDateString.js';
import { AsanaTaskSchema, GetMyAsanaTasksDueTodayLogicOutputSchema } from '../schemas/index.js';

const ASANA_API_BASE_URL = 'https://app.asana.com/api/1.0';
// --- Constants and Environment Variables ---
const ASANA_PAT = process.env.ASANA_PERSONAL_ACCESS_TOKEN;
const ASANA_WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID;
const LOG_PREFIX = '[ASANA MCP SERVER]'; // Simplified log prefix

/**
 * Fetches tasks due today from Asana for the configured user and workspace.
 * This function implements the core logic of the tool.
 * @returns A promise resolving to an object`GetMyAsanaTasksDueTodayLogicOutputSchema`.
 */
async function fetchAsanaTasksDueToday(): Promise<
  z.infer<typeof GetMyAsanaTasksDueTodayLogicOutputSchema>
> {
  const todayString = getTodayDateString();
  const userTaskListGid = await getUserTaskListGid(ASANA_WORKSPACE_GID!);

  if (!userTaskListGid) {
    return {
      tasksFound: 0,
      summary: 'No User Task List GID found.',
    };
  }

  const requestParams = {
    due_on: todayString,
    completed: false,
    opt_fields: 'name,due_on,permalink_url,assignee.name,assignee.gid,projects.name,projects.gid',
  };

  try {
    const apiResponse = await axios.get(
      `${ASANA_API_BASE_URL}/user_task_lists/${userTaskListGid}/tasks`,
      {
        headers: { Authorization: `Bearer ${ASANA_PAT}`, Accept: 'application/json' },
        params: requestParams,
      }
    );

    // Validate tasks with Zod schema
    const tasksParseResult = z.array(AsanaTaskSchema).safeParse(apiResponse.data.data);
    if (!tasksParseResult.success) {
      console.error(
        `${LOG_PREFIX} Failed to parse Asana tasks against schema:`,
        tasksParseResult.error
      );
      return { tasksFound: 0, summary: 'Error: Received unexpected task data format from Asana.' };
    }
    const tasks = tasksParseResult.data;

    if (tasks.length === 0) {
      return { tasksFound: 0, summary: 'No Asana tasks are due today.' };
    }

    const formattedSummary = tasks
      .map((task, index) => `${index + 1}. ${task.name} (Link: ${task.permalink_url})`)
      .join('\n');
    return {
      tasksFound: tasks.length,
      summary: `Today's Asana Tasks:\n${formattedSummary}`,
    };
  } catch (error) {
    let errorMessage = 'An unexpected error occurred while fetching tasks from Asana.';
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      errorMessage = `Asana API Error: ${error.response?.status || 'N/A'} - ${errorData}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { tasksFound: 0, summary: `Error: ${errorMessage}` };
  }
}

/**
 * Fetches the User Task List GID for the authenticated user in a given workspace.
 * @param workspaceGid The GID of the Asana workspace.
 * @returns A promise resolving to the User Task List GID string, or null if an error occurs.
 */
async function getUserTaskListGid(workspaceGid: string): Promise<string | null> {
  console.error(
    `${LOG_PREFIX} Attempting to fetch User Task List GID for workspace: ${workspaceGid}`
  );
  try {
    const response = await axios.get(`${ASANA_API_BASE_URL}/users/me/user_task_list`, {
      headers: { Authorization: `Bearer ${ASANA_PAT}`, Accept: 'application/json' },
      params: { workspace: workspaceGid },
    });
    if (response.data?.data?.gid) {
      console.error(
        `${LOG_PREFIX} User Task List GID successfully fetched: ${response.data.data.gid}`
      );
      return response.data.data.gid;
    }
    console.error(
      `${LOG_PREFIX} [WARNING] API response for User Task List GID was missing 'data.gid'. Response:`,
      response.data
    );
    return null;
  } catch (error) {
    console.error(
      `${LOG_PREFIX} [ERROR] Failed to fetch User Task List GID for workspace ${workspaceGid}:`
    );
    if (axios.isAxiosError(error)) {
      console.error(
        `${LOG_PREFIX} Axios error details: Status ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`
      );
    } else if (error instanceof Error) {
      console.error(`${LOG_PREFIX} General error: ${error.message}`);
    } else {
      console.error(`${LOG_PREFIX} Unknown error object:`, error);
    }
    return null;
  }
}

export default fetchAsanaTasksDueToday;
