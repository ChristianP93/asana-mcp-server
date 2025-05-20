# Asana MCP Server for Warp (Hello World Example)

This project is a "Hello World" example of an MCP (Model Context Protocol) server designed to interact with Asana. It's specifically built to be used as a "CLI Server (Command)" الطريقة the Warp terminal's AI features.

The server exposes a single tool:
* `get_my_tasks_due_today`: Retrieves your Asana tasks that are due today from a configured workspace.

## Prerequisites

* [Node.js](https://nodejs.org/) (v18+ recommended, a version with global `Workspace` like v22.x.x as used during development is ideal)
* [npm](https://www.npmjs.com/) (comes with Node.js)
* An [Asana](https://asana.com/) account
* An Asana Personal Access Token (PAT)
* The GID (Global ID) of your Asana Workspace

## Project Setup

1.  **Clone the repository (or set up the files):**
    If this were a Git repository:
    ```bash
    git clone <your-repo-url>
    cd my-asana-mcp-server
    ```
    Otherwise, ensure you have the `package.json`, `tsconfig.json`, and the `src/server.ts` file.

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    This will install `axios`, `zod`, and the MCP SDK (`@modelcontextprotocol/sdk`). It will also install development dependencies like `typescript`, `ts-node-dev`, and `prettier`.

3.  **Configure Environment Variables for Local Development (Optional):**
    While Warp will pass environment variables when it runs the server, for local testing or direct execution, you might want a `.env` file (ensure it's in your `.gitignore` and **not committed**).
    Create a `.env` file in the project root:
    ```env
    ASANA_PERSONAL_ACCESS_TOKEN=your_asana_personal_access_token_here
    ASANA_WORKSPACE_GID=your_asana_workspace_gid_here
    # PORT=8002 # The SDK uses stdio, so PORT for HTTP is not directly used by Warp CLI mode
    ```
    * **ASANA_PERSONAL_ACCESS_TOKEN**: Your Asana PAT.
    * **ASANA_WORKSPACE_GID**: The GID of the Asana workspace you want to get tasks from.

4.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```
    This compiles the TypeScript code from `src/` to JavaScript in `dist/`.

## Configuration with Warp

This server is designed to be run by Warp as a "CLI Server (Command)".

1.  **Open Warp.**
2.  Go to `Settings > Warp AI > MCP Servers`. (The exact path might vary based on your Warp version - refer to the Warp documentation or your previous screenshots).
3.  Click **"+ Add"** to add a new MCP Server.
4.  Select **"CLI Server (Command)"** as the "Transport type".
5.  Fill in the details:
    * **Name:** A descriptive name, e.g., `My Asana Task Server`
    * **Command to run:** This is the command Warp will execute to start your server. Use:
        ```
        npm run start
        ```
        (This script in `package.json` runs `node ./dist/server.js`).
        Alternatively, for development with auto-reloading (if Warp's environment supports it well): `npm run dev`
    * **CWD parameter (optional but recommended):** The **absolute path** to the root directory of this project (`my-asana-mcp-server`). For example:
        `/Users/yourusername/path/to/my-asana-mcp-server`
    * **Start on Warp launch:** Check this if you want the server to start automatically with Warp.
    * **Environment variables:** Add the following variables here:
        * `ASANA_PERSONAL_ACCESS_TOKEN`: `your_asana_personal_access_token_here`
        * `ASANA_WORKSPACE_GID`: `your_asana_workspace_gid_here`
        * `NODE_ENV`: `production` (recommended when running via `npm run start`)
        * `MCP_LOG_LEVEL`: `info` or `debug` (if the SDK supports this, for more verbose logging from the SDK itself)

6.  **Save** the configuration in Warp.

## Using the Tool in Warp AI

Once the MCP server is configured and running (either started by Warp or manually if "Start on Warp launch" is off and you are testing), you should be able to invoke the tool via Warp AI.

Try queries like:

* "Warp, what are my Asana tasks due today?"
* "Use the Asana tool to get today's tasks."

Warp AI should then communicate with your MCP server, which will execute the `get_my_tasks_due_today` tool and return the results.

## How It Works

This server uses the `@modelcontextprotocol/sdk` to implement the MCP.
1.  It initializes an `McpServer` instance.
2.  It defines a tool named `get_my_tasks_due_today` using `server.tool()`.
    * Zod schemas (`GetMyAsanaTasksDueTodayInputSchema` and `GetMyAsanaTasksDueTodayLogicOutputSchema`) are provided to define the expected input and the logical output of the tool's handler.
3.  The tool's handler function (`WorkspaceAsanaTasksDueToday`) contains the logic to:
    * Get the current date.
    * Fetch the User Task List GID from Asana for the configured user and workspace.
    * Fetch tasks due today from that User Task List via the Asana API.
    * Return a structured result matching `GetMyAsanaTasksDueTodayLogicOutputSchema`.
4.  The server connects using `StdioServerTransport`, meaning it communicates with the client (Warp) over standard input/output when run as a CLI command.
5.  Warp's MCP client sends an `initialize` request (handled internally by the SDK, which likely uses the registered tools to describe capabilities).
6.  When a tool is invoked by Warp AI, Warp sends a `CallTool` request. The SDK dispatches this to the appropriate handler, validates input/output against the Zod schemas, and manages the JSON-RPC communication.

## Troubleshooting

* **`ERR_REQUIRE_ESM` or `exports is not defined`:** Ensure your `package.json` has `"type": "module"` and your `tsconfig.json` is configured for ES Module output (e.g., `"module": "NodeNext"`).
* **Warp Errors (`Serialization`, `RequestCancelled`):**
    * Check the logs from your Node.js server (they go to `stderr` and should be visible in Warp's MCP server logs or if you run the command manually).
    * Ensure the `CWD parameter` in Warp's MCP server configuration punten to the correct project root.
    * Verify that the `ASANA_PERSONAL_ACCESS_TOKEN` and `ASANA_WORKSPACE_GID` environment variables are correctly set in Warp's configuration for the server.
    * The most common cause for `Serialization` errors after `initialize` is that the structure of the `tools` (especially their `input_schema` and `output_schema`) provided to the SDK does not perfectly match what the client (Warp) expects. Refer to the MCP SDK documentation and examples like `gdrive` for the precise schema structure.
* **Asana API Errors:** Check the `stderr` logs from your server for messages prefixed with `[ASANA MCP SERVER]`. These will indicate issues comunicazione with the Asana API (e.g., invalid PAT, incorrect Workspace GID, network issues).
