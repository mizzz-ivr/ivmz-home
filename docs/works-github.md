# GitHub-linked Works (phase 1)

Works already carry an optional `githubUrl`. Phase 1 reads **public** repository facts for it and shows
them next to the link on `/works` and `/works/<slug>`: stars, forks, language, last push date and an
`archived` flag. There is no schema change and nothing is stored.

## How it works

- Only a published Work's own `githubUrl` is used, and only when it is exactly
  `https://github.com/<owner>/<repo>` (optional `.git` / trailing slash). Profile URLs
  (`https://github.com/mizzz-ivr`), deep links, other hosts, credentials in the URL and ports are
  ignored. The CMS therefore decides which repositories are queried.
- The server calls `https://api.github.com/repos/<owner>/<repo>` with a 2.5 s timeout. The response is
  cached by Next for 1 hour per repository; the pages themselves revalidate every 5 minutes.
- Any failure (private/deleted repo, rate limit, timeout, unexpected shape) renders nothing; the page and
  the link are unaffected.
- At most 12 repositories are requested per render, so the unauthenticated limit of 60 requests/hour per
  IP is not exhausted. Set `GITHUB_API_TOKEN` (a fine-grained token with **no** permissions, public data
  only) in Netlify to raise it. It is read server-side only.

## Editing

In `/admin` -> Works, put the repository URL in *GitHub URL*. Remove it to stop showing facts.

## Phase 2 (not built)

Syncing README / releases / topics into Works, and creating Works from selected repositories, would need
an explicit allowlist in the CMS and a token with read access; design it before adding fields.
