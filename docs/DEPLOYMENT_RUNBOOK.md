# CodeArena — Final Go-Live Deployment Runbook

This consolidates the deployment architecture, the production testing plan, and what Phase 14 (ranking/AI/onboarding) adds to it, into one sequential checklist. Follow in order — each step gates the next.

---

## STEP 0 — Pre-flight gate

Do not start deployment until:
- Phases 9–14 are all marked **Verified** (real pasted output, not summary claims) with zero open **Flagged Risks**.
- The private-room RP decision and any other blocking decisions are confirmed by you in writing (not agent-assumed).
- `git log` / diff review confirms nothing under `packages/execution-engine`'s security-relevant files was touched without your review.

---

## STEP 1 — Cloud accounts (D1)

Create/verify: Oracle Cloud, MongoDB Atlas, Upstash, Vercel, GitHub. Confirm each account is actually usable (billing/verification steps done) before touching infrastructure.

---

## STEP 2 — Oracle VM + the blocking security re-verification

1. Provision the Always Free A1 Flex instance (2 OCPU / 12GB, Ubuntu).
2. Install the exact validated stack (isolate, gcc/g++, OpenJDK, Python, Node) and deploy `packages/execution-engine` unchanged.
3. **[BLOCKING]** SSH in and run:
   ```bash
   cd packages/execution-engine && npm run test:security
   ```
   Required: `6 passed, 6 total` on the real Oracle kernel — a WSL2 pass does not satisfy this. Do not proceed past this step on anything less than a full pass.
4. If containerizing the executor: re-run the same suite **inside the container** specifically (PID-limit and filesystem-isolation tests are the most likely to silently degrade under restricted container capabilities). If it fails in-container, deploy bare rather than weakening isolate to fit.

---

## STEP 3 — Executor lockdown

1. Confirm `:3005` is unreachable from the public internet (only the backend, over an authenticated internal path, can reach it).
2. Add `EXECUTION_ENGINE_TOKEN`; confirm the executor rejects missing/wrong tokens **before** any sandbox is spawned (check logs, not just the response code).
3. Oracle Cloud Console: firewall allows only SSH (ideally IP-restricted) and whatever fronts the executor's authenticated path — nothing else.

---

## STEP 4 — Database & queue (D6/D7)

1. MongoDB Atlas Free cluster — decide fresh production DB + seed import vs. copying dev data (fresh is recommended).
2. Upstash Redis — configure and confirm BullMQ, room state, and the Phase 14 rate-limit keys (Run/Submit limits, AI-assist limits, pair-farming sliding window) all use it correctly.
3. Atlas network access: restrict to the backend's IP if static; avoid `0.0.0.0/0` unless genuinely required.

---

## STEP 5 — Backend deployment (D8)

Deploy `apps/server` with the full production env var set — this list now includes what Phase 14 added, not just the original core:

```env
MONGODB_URI=
REDIS_URL=
JWT_SECRET=
EXECUTION_ENGINE_URL=
EXECUTION_ENGINE_TOKEN=

# Phase 14 additions
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
CEREBRAS_API_KEY=
```
Notes:
- If none of the AI provider keys are set, confirm the app degrades gracefully ("AI Coach unavailable") rather than erroring — this was built and tested in Phase 14, re-confirm it holds in the production env specifically.
- Rank tier thresholds and the 1200 RP baseline live as constants in code (`User.ts`), not env vars — no action needed here, just noting they don't need secrets-manager handling.
- Confirm `.env`/secrets are set only in the hosting platform's variable manager, never committed.

Verify after deploy: `/health` reports DB/Redis/AI status correctly, login works, Socket.IO connects.

---

## STEP 6 — Frontend deployment (D9)

Deploy `apps/web` to Vercel with:
```env
VITE_API_URL=
VITE_SOCKET_URL=
```
Verify: login, Dashboard, Practice Lab, Battle Arena all load and hit the live backend correctly.

---

## STEP 7 — Full cross-service E2E on real infrastructure

Run the original E2E checklist, **extended to cover what Phase 14 added** — this is the part most likely to be under-tested if you rush straight from "backend is up" to "done":

1. Standard flow: login → Run → Submit → Atlas persistence, from a real browser off the dev machine.
2. Two-simultaneous-ranked-matches concurrency test against production URLs (not localhost) — confirm the 2-OCPU WorkerPool bound holds under real network latency.
3. **New-user flow end to end:** fresh signup on production → confirm honest cold-start state (no fabricated radar/weak-area data) → complete calibration → confirm skill vector updates → confirm Recommended card changes from calibration CTA to a real suggestion.
4. **Ranked flow end to end:** complete real placement matches → confirm K=64 deltas → confirm tier assignment on placement completion → confirm leaderboard excludes still-placing accounts and includes completed ones correctly.
5. **Adversarial guardrail, on production:** raw request to an AI-assist endpoint during a live ranked match on the production backend — confirm 403 + log entry. Don't assume the WSL-verified behavior automatically holds on prod infra; this endpoint is new enough to be worth one more real check.
6. HTTPS end-to-end: no mixed content, valid certs on all subdomains, no plaintext hop for JWTs/source/results anywhere.

---

## STEP 8 — Secrets & exposure audit

1. Grep the built frontend bundle for any accidental server secret leakage — only `VITE_`-prefixed values should appear.
2. Confirm no scratch test scripts with hardcoded tokens/IDs from earlier debugging got committed.
3. Confirm Atlas/Upstash/Oracle console access itself is behind your own strong auth (unrelated to app secrets, but worth a beat here since it's the last checkpoint before going public).

---

## STEP 9 — Free-tier survival setup

1. Low-frequency uptime monitor hitting the backend `/health` to keep Atlas from auto-pausing after 30 days idle.
2. A scheduled check that generates real utilization on the Oracle VM (e.g. one real `/execute` call/day), not just health-check GETs, to stay clear of the 7-day idle-reclaim threshold.
3. Write down (README/runbook) what "CodeArena is down" looks like per service and which free-tier limit is the likely cause — for future-you debugging this without full context.

---

## STEP 10 — Rollback rehearsal (do it once, for real)

1. Deliberately stop the execution engine while the backend keeps running — confirm sessions stay connected, jobs queue rather than erroring, UI shows reasonable feedback.
2. Restart it, confirm queued jobs drain automatically.
3. Practice the actual git-based rollback command against a deliberately bad build once, confirm recovery and that `test:security` still passes post-rollback.

---

## GO-LIVE GATE

Do not open the domain to anyone outside you until:
- Step 2 (security suite on real Oracle kernel) — **fully verified**
- Step 3 (executor lockdown) — **fully verified**
- Step 7 (full E2E including the four Phase 14-specific flows) — **fully verified**
- Step 10 (rollback rehearsed at least once) — **done**

Everything else (Step 9 monitoring, polish) can continue after soft-launch, but these four are the actual bar for "safe to share."
