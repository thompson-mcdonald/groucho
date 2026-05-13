# Groucho

Monorepo for the Groucho gatekeeper platform (Next.js) and the published [`@groucho/sdk`](./packages/sdk) package.

## Development

Install dependencies from the repository root using [pnpm](https://pnpm.io/) (version pinned in [`package.json`](./package.json) via `packageManager`):

```bash
pnpm install
```

Run the platform app:

```bash
pnpm dev
```

Build or test the SDK:

```bash
pnpm run sdk:build
pnpm run sdk:test
```

Run the Next.js example consumer (port **3001**):

```bash
pnpm run example:groucho
```

## Docs and releases

- Documentation index: [`docs/README.md`](./docs/README.md)
- Publishing `@groucho/sdk`: [Changesets](https://github.com/changesets/changesets) — merge version PRs from `.github/workflows/release.yml`; configure the `NPM_TOKEN` repository secret for npm publishes.
