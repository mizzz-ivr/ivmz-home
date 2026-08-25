# Contributing

`ivumz-home` is developed in public.

## Workflow

1. Create a focused branch from `main`.
2. Keep implementation decisions in the repository; long-term product decisions are synchronized with Notion.
3. Do not commit secrets or private content.
4. Run the quality gate before requesting review.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Design changes

Changes to the character, identity, color system, signature motion, information architecture, hosting boundary, CMS boundary or public contact routing require an ADR or an update to the relevant document.

The current GitHub avatar is the canonical character reference. Do not replace it with unrelated generated character art.
