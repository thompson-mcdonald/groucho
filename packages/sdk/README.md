# `@groucho/sdk`

Headless client, server helper, and React UI for the Groucho Project API.

- **Docs:** [sdk-surface.md](../../docs/sdk-surface.md) · [OpenAPI](../../docs/api/openapi.yaml)
- **Build:** from repo root, `npm run sdk:build` (runs `openapi-typescript` + `tsup`).

```ts
import { createClient } from "@groucho/sdk"

const client = createClient({
  baseUrl: "https://your-host",
  apiKey: process.env.GROUPCHO_API_KEY!,
})

await client.sendMessage("sess_abc", { message: "Hi." })
```

```tsx
import "@groucho/sdk/groucho.css"
import { GrouchoProvider, Gatekeeper } from "@groucho/sdk/react"

export function Door() {
  return (
    <GrouchoProvider proxyBasePath="/api/groucho">
      <Gatekeeper />
    </GrouchoProvider>
  )
}
```
