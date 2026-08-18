---
name: pocketbase-conventions
description: PocketBase usage conventions for this repo. Use when writing code that talks to PocketBase (queries, auth), adding or changing a collection (migrations), writing custom PocketBase server logic (hooks), or deciding where pb_migrations/pb_hooks/pb_data should live.
---

# PocketBase conventions

This project's backend is a single-tenant PocketBase instance, provisioned and deployed by the shared platform. It reads `pb_migrations/` and `pb_hooks/` straight out of this repo, so their location and contents are a contract, not a preference.

## The Direct pattern

The browser talks to PocketBase directly, through the PocketBase JS SDK — the same shape as calling Supabase from the client. There is no backend proxy in front of it. Call `pb.collection(...)` from your components/routes; don't write a server route that re-implements a PocketBase call just to reach it indirectly.

If a route needs to know who's signed in before rendering (SSR route gating), read the auth cookie in `hooks.server.ts` using the SDK's own `authStore.loadFromCookie()` / `exportToCookie()` helpers and call `authRefresh()` to confirm it's still valid — don't build a separate session system. If the project has no server-rendering at all, check `pb.authStore.isValid` on load and redirect client-side; that's the expected fallback, not a workaround.

## PocketBase is not Postgres

If you've worked with Supabase, three habits don't carry over:

- **Access control is API Rules, not RLS.** Each collection has List/View/Create/Update/Delete filter expressions (e.g. `@request.auth.id != "" && owner = @request.auth.id`). Write the rule on the collection, not a `WHERE` clause you remember to add in every query.
- **There's no arbitrary SQL.** PocketBase runs on SQLite through its own API — no hand-written joins, no `SECURITY DEFINER` functions callable via RPC.
- **Multi-step or transactional logic is a hook, not a database function.** Anything that needs to validate across records, run atomically, or be reachable without an account (a tokenized public link, say) is a custom route in `pb_hooks/`, written in JS. If you catch yourself wanting a Postgres function, that logic belongs in a hook instead.

## Schema changes

Make the change in the local PocketBase Admin UI (or via a hook), then let PocketBase write the migration file — don't hand-author migration JS from scratch, and don't edit a generated migration after the fact. Commit the resulting file in `pb_migrations/`. It runs automatically wherever this project is deployed; there is no separate "apply migration" step to remember.

## File layout

```
repo root/
├── pb_migrations/      committed — schema changes, one file per change
├── pb_hooks/            committed — custom server-side routes/logic
├── pb_data/              gitignored — local instance data, never committed
└── pocketbase            gitignored — the local binary
```

`pb_migrations/` and `pb_hooks/` must live at the repo root — the deploy pipeline looks for them there, not nested under `src/` or similar.

## Validating structure

Run `node validate-structure.mjs` (in this skill's own directory) after touching `pb_migrations/`, `pb_data/`, the `pocketbase` binary, or `.gitignore` — before considering that change done. It currently checks the three hard rules only: `pb_migrations/` present at the root, and `pb_data/` and the `pocketbase` binary never committed. `pb_hooks/` placement and the `*_POCKETBASE_URL` env var convention aren't checked yet — those rules are still settling; don't treat their absence from the script as license to ignore them.

## Local dev

Run a local instance with `./pocketbase serve --hooksDir=pb_hooks --migrationsDir=pb_migrations`. Use the version of the `pocketbase` binary the platform has pinned, not whatever `latest` happens to be — check for an `install-pocketbase.sh` in this repo, or ask if one isn't set up yet.

Point the frontend at it with a client-exposed env var named `<FRAMEWORK_PREFIX>POCKETBASE_URL` — `PUBLIC_POCKETBASE_URL` for SvelteKit, `VITE_POCKETBASE_URL` for plain Vite, and so on for whatever prefix your framework requires to expose a var to the browser. Locally it points at `http://127.0.0.1:8090`; in production the platform sets it to this project's own subdomain.
