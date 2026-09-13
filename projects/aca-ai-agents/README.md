# AlfDockia ACA AI Agents

Angular extension published as `@alfdockia/aca-ai-agents` for Alfresco Content App. It adds an admin-only AlfDockia agents workspace and an AlfDockia IA search screen.

## ACA 8 integration

1. Add the package to the workspace path aliases:

   ```json
   "@alfdockia/aca-ai-agents": ["projects/aca-ai-agents/src/public-api.ts"]
   ```

2. Register the extension provider from the host `app/src/app/extensions.module.ts`:

   ```ts
   import { provideAcaAiAgentsExtension } from '@alfdockia/aca-ai-agents';

   export function provideApplicationExtensions() {
     return [
       ...provideAcaAiAgentsExtension()
     ];
   }
   ```

3. Copy the extension assets from `app/project.json` so ACA can load the plugin manifest and translations:

   ```json
   {
     "glob": "**/*",
     "input": "projects/aca-ai-agents/assets",
     "output": "./assets/aca-ai-agents"
   },
   {
     "glob": "ai-agents.plugin.json",
     "input": "projects/aca-ai-agents/assets",
     "output": "./assets/plugins"
   }
   ```

## Local development

Install dependencies and run ACA 8:

Linux (Bash), with Node.js 24.x and npm 11.x:

```bash
npm ci
BASE_URL=https://alfdockia.eu SEARCH_URL=https://alfdockia.eu/search npm start
```

Open <http://localhost:4200>. Both backend services must already be running in cloud.

PowerShell:

```powershell
npm install
$env:BASE_URL = "https://alfdockia.eu"
$env:SEARCH_URL = "https://alfdockia.eu/search"
npm start
```

Build only the extension:

```powershell
npm run build:aca-ai-agents
```

Build the whole ACA app:

```powershell
npm run build
```

For ACA 8, the development Alfresco target is read from the `BASE_URL` environment variable by `app/proxy.conf.js`. The AlfDockia IA search target is read from `SEARCH_URL`; ACA calls `/search` locally and the proxy forwards it to the configured AlfDockia Search endpoint.

The extension uses the authenticated Alfresco JS API session and calls the repository webscripts under:

`/alfresco/s/api/-default-/public/alfdockia/versions/1/agents`

The IA search screen calls:

`/search`
