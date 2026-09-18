# Mealibrio Webapp

React 19, TypeScript, Vite 7. Uses feature-owned APIs and explicit layer, naming, and import rules.
See [frontend conventions](docs/frontend-architecture.md).

```bash
nvm use
cp -n .env.example .env
npm ci
npm run dev
```

Use Node 22.12+; `.nvmrc` selects 22.14.0. The dockerizer normally runs the Vite development server
behind https://app-dev.mealibrio.com with WSS hot reload. The browser calls
https://api-dev.mealibrio.com/api/hello directly. Start the dockerizer for the shared HTTPS path.
`VITE_API_BASE_URL` is public client configuration, never a secret.

```bash
npm run lint
npm run test:all
npm run build
```

The hello feature owns its API contract and public entry point. HTTP transport and configuration
live under `infra/platform`; application composition lives under `app`. No login provider,
product domain, or global state library is selected yet.
