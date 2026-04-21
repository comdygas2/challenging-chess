# Handoff — Claude → Codex

_Last updated: 2026-04-21_

## Current state
`main` is at `4561dc0`. Live site at https://challenging-chess.vercel.app/ matches `main` (verified via `curl` — title = `'Maizing Challenging Chess`, HTTP 200).

## What just changed (this session)
1. **Fixed the stale live-site problem.** The GitHub auto-deploy for commit `ac2d59c` (the rename-title commit) was stuck in `Blocked` status on Vercel (Hobby-tier policy). I bypassed the GitHub integration by deploying directly via CLI:
   - `npx vercel login` (GitHub device flow, authorized by user)
   - `npx vercel link --project challenging-chess --yes` (linked local folder → `comdygas-projects/challenging-chess`, auto-added `.vercel` to `.gitignore`)
   - `npx vercel --prod --yes` (built and aliased `challenging-chess.vercel.app` to the new deploy)
2. **Committed `.gitignore` update** (the `.vercel` addition). Pushed to `origin/main`.
3. **Added agent infrastructure**: this file, `CLAUDE.md`, `AGENTS.md`, `.agents/codex-feedback.md`.

## Key decisions
- **Chose CLI deploy over upgrading to Vercel Pro.** Pro would fix the GitHub auto-deploy block but costs money and isn't needed for a personal project. CLI deploy is a single command; trade-off is that it's manual (must remember to run it after pushing).
- **Did not delete the Blocked deployment (`5W68uXQgk`) from the Vercel dashboard.** Harmless, and removing it requires user action.
- **Kept `.vercel/project.json` gitignored** (Vercel's default). If the user ever wants CI or another machine to deploy, the link can be recreated with `vercel link --project challenging-chess --yes`.

## Areas of uncertainty — please review
- **Root cause of the `Blocked` status.** I'm assuming it's the Hobby-plan policy around commit authors from multiple GitHub accounts (`jerrodbennett` vs. `comdygas` / `comdygas2`), since both deploys were attributed to `jerrodbennett` but only the first went through. Worth confirming by looking at the Vercel "why was this blocked" detail if it's visible. If it's actually a quota issue or a protection rule, the fix might differ.
- **`.vercel/project.json` gitignored vs. checked in.** Industry split on this. I followed the Vercel CLI default (gitignored). If we ever want another machine or CI to deploy without running `vercel link` first, we'd commit it.
- **Deploy workflow is manual.** The user has been told the rule "push to GitHub + run `npx vercel --prod`." If the user forgets, the live site will silently drift. Worth discussing whether a local git `post-push` hook should run the deploy automatically.

## What to review
- `CLAUDE.md` — project-specific rules for future Claude sessions
- `AGENTS.md` — this file's sibling, aimed at you (Codex)
- The `.gitignore` diff in commit `4561dc0`

## Next up
Nothing queued from the user. Session ended cleanly with the live site matching `main`.
