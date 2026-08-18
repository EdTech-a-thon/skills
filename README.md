# EdTech-a-thon Skills

Agent skills shared across EdTech-a-thon project repos, installable with [`npx skills`](https://github.com/vercel-labs/skills).

## Install

```sh
npx skills@latest add EdTech-a-thon/skills --skill pocketbase-conventions
```

Or run it with no `--skill` flag to pick interactively from everything in this repo.

## What's here

- **`skills/pocketbase-conventions/`** — PocketBase usage conventions for projects on the shared hosting platform: the Direct pattern for talking to PocketBase from the client, where `pb_migrations/`/`pb_hooks/`/`pb_data` must live, and a script to validate a repo's structure against the hard rules.

## Adding a skill

Each skill is a folder under `skills/` containing a `SKILL.md` (with `name`/`description` frontmatter) and anything else it needs. See [`writing-for-agents`](https://github.com/EdTech-a-thon/teacher-db/tree/main/.claude/skills/writing-for-agents) in `teacher-db` for how to write one well.
