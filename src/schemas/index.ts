import { z } from 'zod'; // For schema definition and validation

// Input schema for the 'get_my_tasks_due_today' tool.
// This tool does not require any input parameters.
const GetMyAsanaTasksDueTodayInputSchema = z
  .object({})
  .describe('Input for fetching Asana tasks due today (no parameters needed).');

// Schema for a single Asana task item, used in the output.
const AsanaTaskSchema = z
  .object({
    gid: z.string().describe('Global ID of the Asana task.'),
    name: z.string().describe('Name of the task.'),
    due_on: z
      .string()
      .nullable()
      .describe('Due date of the task (YYYY-MM-DD), or null if not set.'),
    permalink_url: z.string().url().describe('Permanent URL to the task in Asana.'),
    assignee: z
      .object({
        name: z.string(),
        gid: z.string(),
      })
      .nullable()
      .optional()
      .describe('The assignee of the task, if any.'),
    projects: z
      .array(
        z.object({
          name: z.string(),
          gid: z.string(),
        })
      )
      .nullable()
      .optional()
      .describe('Projects the task belongs to, if any.'),
  })
  .describe('Represents a single Asana task.');

// Output schema for the *logic* of the 'get_my_tasks_due_today' tool.
// The SDK will use this to validate the handler's return value and to inform the client.
// The handler itself will return an object matching this schema.
// The SDK then constructs the final ToolResponse (with `content: ContentPart[]`) based on this.
const GetMyAsanaTasksDueTodayLogicOutputSchema = z
  .object({
    tasksFound: z.number().int().min(0).describe('Number of Asana tasks found due today.'),
    summary: z.string().describe('A human-readable summary of the tasks or a status message.'),
  })
  .describe('Logical output of the Asana task fetching tool.');

export {
  GetMyAsanaTasksDueTodayInputSchema,
  AsanaTaskSchema,
  GetMyAsanaTasksDueTodayLogicOutputSchema,
};
