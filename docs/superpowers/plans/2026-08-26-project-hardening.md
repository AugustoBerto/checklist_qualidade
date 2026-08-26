# Project Hardening Implementation Plan

> **Required for agentic workers:** execute this plan with `superpowers:subagent-driven-development`, using `superpowers:test-driven-development` for behavior changes, `superpowers:systematic-debugging` for failures, `superpowers:requesting-code-review` after every stage, and `superpowers:verification-before-completion` before any completion claim. Use `superpowers:dispatching-parallel-agents` only for genuinely independent, non-overlapping work.

**Goal:** Correct the confirmed integrity, concurrency, session, error-handling, and test-suite findings without changing the global read-access policy or introducing unconfirmed data rules.

**Architecture:** Preserve the current Vue/Express/PostgreSQL structure and fix each defect at its existing ownership boundary. Prefer local guards, existing helpers, Node/Vue platform features, and additive migrations; add no dependency or generalized abstraction unless a failing test proves it necessary.

**Tech Stack:** Vue 3, Vue Router 4, Axios, Vitest, Express 5, Node test runner, PostgreSQL, `pg`, JWT, Docker Compose integration database.

**Specification:** The findings and confirmed business rules in this document are the branch specification. If conversation history conflicts with this file, stop and update this file with the newly confirmed decision before changing production code.

---

## Persistent execution status

Update this section and the SDD ledger after every material action. Do not rely on chat history.

- **Current stage:** planning complete; implementation not started. Stage 1 is next.
- **Completed tasks:** repository review; global-read rule confirmed; finding #1 reclassified; plan written.
- **Pending tasks:** Stages 1 through 5 below.
- **Decisions taken:**
  - `ADMIN`, `LIDER`, and `INSPETOR` have global read access to submissions, reports, photos, evidence, and history.
  - Only administrative functions are exclusive to `ADMIN`.
  - No read query may be scoped by user, sector, or cell as part of this work.
  - Existing data must remain readable; schema evolution must use a new migration rather than editing an applied migration.
  - No `UNIQUE` constraint will be created until the corresponding business rule and existing-data compatibility are confirmed and recorded.
  - No new runtime or test dependency is planned; use Node `fetch`, `http`, `node:test`, and existing Vitest facilities.
- **Findings discarded:** original finding #1 (global visibility) is expected behavior, not a vulnerability.
- **Commits produced:** none.
- **Baseline validations on 2026-08-26:**
  - `cd backend && npm run test:unit` — passed: 2 files, 2 tests.
  - `cd frontend && npm test -- --run` — passed: 2 files, 3 tests.
  - `npm run test:integration` was not run because finding #12 proves the suite fails during module loading and the runner manages a disposable Docker database.
- **Open risks/decisions:** exact model/sector/cell invariant (#2); uniqueness policy for model and brand names (#7); unmatched/ambiguous legacy `modelo.marca` values (#4); whether report flows are duplicate implementations or intentionally distinct read models (#13).

### SDD ledger and context recovery

At the start of implementation:

1. Read this entire file.
2. Use `superpowers:using-git-worktrees`; do not implement on `main` without explicit user authorization.
3. From the Superpowers skill directory, run `scripts/sdd-workspace docs/superpowers/plans/2026-08-26-project-hardening.md` and use the returned ignored workspace under `.superpowers/sdd/`.
4. Confirm that `progress.md` starts with:

   ```markdown
   # SDD ledger — plan: docs/superpowers/plans/2026-08-26-project-hardening.md
   ```

5. Persist in the ledger: preflight conflicts and rulings, current stage/task, task briefs, completed steps, commits, tests and results, review findings/fix rounds, deferred minor issues, business decisions, and open risks.
6. Before each new stage—and after any context compaction—read this plan, `progress.md`, `git status`, and the stage commits. Treat them as authoritative.

Use one fresh implementation agent and one separate review agent per task when SDD calls for them. Never let agents edit the same file concurrently. Specify the model on every spawn:

- Luna Medium: inventory, searches, simple validation, mechanical changes.
- Luna High: cross-file tracing, debugging, review, or moderately complex implementation.
- Terra only after a concrete Luna High failure or identified reasoning gap is recorded in the ledger.
- Do not use Sol for routine subagent work.

Parallel work is permitted only when file ownership and dependencies do not overlap. Good candidates are read-only review/inventory while the main worker runs independent validation; implementation within a stage remains sequential when files or contracts overlap.

## Global constraints and invariants

- Preserve `autorizar()` access on global-read routes: `GET /api/submissoes`, `GET /api/submissoes/:id`, `GET /api/relatorios/:id`, and evidence returned by those controllers.
- Preserve `ADMIN` protection on all administrative reads/mutations in `CadastrosRoutes.js` and `PerfisRoutes.js`; Stage 4 must prove this by HTTP tests.
- Do not add user/sector/cell filters to submission, report, photo, evidence, or history reads.
- Do not edit `migrations/001_initial_schema.sql`; add a sequential migration only when Stage 1 evidence requires it.
- Do not add a `UNIQUE`, `NOT NULL`, or destructive column removal without confirmed business semantics and a clean-data preflight.
- Preserve legacy rows during the model-brand transition. Unmapped or ambiguous values must remain representable and observable rather than being guessed or deleted.
- Do not standardize all HTTP envelopes as incidental cleanup. Change an envelope only with a failing contract test and verified frontend callers.
- No cosmetic refactors, broad renames, speculative helpers, new dependencies, or push.
- Each stage must leave the repository functional, have its own validation evidence, and be independently revertible by its commits.

---

## Stage 1 — Integrity and data model

### Findings treated

- #2 — validate coherence among model, sector, and cell when submitting.
- #4 — normalize model–brand association through `id_marca_fk`.
- #6 — align model-update validation with model creation.
- #7 — reconcile uniqueness constraints with `23505` handling.

### Likely files

- Modify: `backend/controllers/ChecklistController.js`
- Modify: `backend/controllers/CadastrosController.js`
- Modify: `backend/controllers/DadosController.js`
- Inspect and modify only if the brand filter contract is confirmed there: `backend/controllers/SubmissoesController.js`
- Create if required by the confirmed #4 migration design: `migrations/002_modelo_marca_fk.sql`
- Modify: `backend/test/checklist-validation.test.js`
- Create: `backend/test/cadastros-validation.test.js`
- Modify: `backend/test/db-foundation.test.js`
- Modify later in Stage 4 for database execution coverage: `backend/test/integration/database.integration.test.js`
- Inspect frontend contracts only: `frontend/src/views/CheckSelecao.vue`, `frontend/src/views/CriarModeloView.vue`, `frontend/src/views/ConfiguracoesView.vue`

### Dependencies and decision gates

1. **#2 business gate:** before writing a red test, trace the model, sector, and cell selectors plus current schema, then obtain and record the exact invariant. The code suggests both model→sector and cell→sector relationships, but that is evidence, not a confirmed rule. Do not encode either of these candidates until confirmed:
   - submitted sector must equal both `modelo.id_setor_fk` and `celula.id_setor_fk`; or
   - cell must belong to submitted sector while model is allowed independently.
   If no confirmation is available, mark #2 blocked in the ledger and proceed only with independent findings.
2. **#4 precedes brand-query changes:** define backward-compatible request/response behavior, then add migration/backfill, then change writes and filters.
3. **#6 precedes broad model CRUD tests:** one shared in-controller validation path should cover create/update only if it is the smallest way to prevent divergence.
4. **#7 business gate:** inspect schema and duplicate data, then record whether model names and brand names are required to be unique and under what normalization/scope. No answer means no constraint change.

### Expected behavior

- A submission with nonexistent or incoherent model/sector/cell references returns a deterministic `400` JSON response before transaction writes; a coherent submission continues unchanged.
- Model create/update accepts the canonical brand identifier, validates that the active/existing brand is valid according to the current catalog contract, and writes `id_marca_fk`.
- Model reads expose the identifier needed by current frontend selectors and retain a usable display name for legacy compatibility.
- `GET /api/dados/modelos?marca_id=<id>` filters by `id_marca_fk`, not textual `marca`.
- Legacy model rows are backfilled only when mapping is deterministic. Unmatched or ambiguous textual values remain intact with a nullable FK and are reported by a verification query.
- Create and update reject the same malformed/empty category and question structures with the same status/message family.
- `23505` maps to a domain conflict only where a matching confirmed database uniqueness constraint exists; otherwise duplicates follow the confirmed rule and the controller does not claim a nonexistent constraint.

### Tests that must fail first when applicable

- Add controller-validation tests proving the confirmed #2 invalid combination is rejected and the valid combination reaches the transaction path. Prefer exporting a small `_internals` validator, matching the existing `ChecklistController` test pattern, over adding a service layer.
- Add model validation tests that run the same cases against create/update input normalization: missing categories, non-array questions, empty questions, and valid categories.
- Add an integration migration test with legacy rows for: numeric textual brand that matches an ID, uniquely matching brand name, unmatched name, and ambiguous normalized name. The first two must backfill; the latter two must remain nullable.
- Add a query-level integration test proving `marca_id` returns only models linked by `id_marca_fk`.
- For #7, write the red test only after the rule is confirmed: either the confirmed duplicate must return `409` backed by a real constraint, or allowed duplicates must not be translated to `409`.

### Minimal implementation

1. Implement the confirmed #2 invariant as one parameterized lookup or one small validator query before inserting a submission. Reuse the transaction/database helpers already present; do not create repository/service layers.
2. Add migration `002` without changing migration `001`:
   - backfill numeric legacy `modelo.marca` values that reference an existing `marcas.id`;
   - backfill exact normalized names only where exactly one brand matches;
   - leave unresolved rows untouched and `id_marca_fk` nullable;
   - add no destructive drop, `NOT NULL`, or guessed association.
3. Normalize model create/update inputs to `id_marca_fk`; join or select the existing textual/display value only where callers need it. Preserve the old column during this branch.
4. Change the operational `marca_id` filter to `id_marca_fk`. Change other textual filters only if their frontend/API contract is proven to mean a brand ID.
5. Reuse one local validation function for both model create and update if direct reuse removes duplicated rules; export through `_internals` only for tests.
6. For #7, implement exactly the recorded business outcome. If uniqueness is not confirmed, make no schema change and record #7 as decision-blocked—not “fixed.”

### Required validation

```bash
cd backend && npm run test:unit
cd backend && npm run test:integration
cd frontend && npm test -- --run
cd frontend && npm run build
```

Additionally inspect the migration status on the disposable integration database and run read-only SQL counts for unresolved/ambiguous brand mappings. Never run migration/status commands against an unverified production database.

### Code review

Use a fresh Luna High reviewer after implementation. Review specifically for: transaction boundary, TOCTOU/inactive references, migration idempotence/checksum conventions, unsafe legacy backfill, frontend contract drift, unintended read scoping, and misleading `23505` branches. Run the SDD review package and record every finding/fix round.

### Risks

- #2 and #7 can encode incorrect business rules if their gates are bypassed.
- Legacy brand strings may not map deterministically; guessing would corrupt associations.
- Editing migration `001` would break deployed checksum/history.
- Updating only writes or only reads would create mixed-data regressions.

### Objective completion criterion

Stage 1 is complete when every non-blocked finding has a red-then-green test, migration `002` passes on a fresh disposable database and preserves unresolved legacy data, model create/update/filter use the same FK contract, all required checks pass, and the reviewer has no unresolved P0/P1 issue. Any blocked business decision remains explicitly open in both this file and the ledger and is not represented as completed.

### Suggested commits

1. `test: cover submission relation and model validation rules`
2. `fix: validate submission and model update integrity`
3. `test: cover legacy model brand migration`
4. `fix: normalize model brand association by foreign key`
5. Conditional only after confirmation: `fix: align catalog conflicts with uniqueness rules`

---

## Stage 2 — Frontend administration

### Findings treated

- #5 — sector, unit, and cell edits omit required `ativo` and receive `400`.
- #8 — tab changes in `ConfiguracoesView` allow an old response to populate the new tab.

### Likely files

- Modify: `frontend/src/views/ConfiguracoesView.vue`
- Inspect API contract: `frontend/src/services/api.js`
- Inspect backend validation only: `backend/controllers/CadastrosController.js`
- Create a focused frontend test only if behavior can be exercised with existing Vitest/Vite facilities without a new dependency: `frontend/test/configuracoes.test.js`

### Dependencies between tasks

- Trace edit form initialization and payload construction before changing either path; `ativo` must preserve the selected entity’s current value.
- Fix #5 first, then #8 in the same component. Do not use parallel implementers on this stage.
- #8 should capture request context independently of #10; do not introduce a shared request manager.

### Expected behavior

- Editing sector, unit, or cell sends the existing boolean `ativo` along with required fields and no longer fails solely because the field is absent.
- A response started for tab A updates only tab A, even if the user switches to tab B before it completes.
- Same-tab refresh and error/loading state remain consistent with the existing UI.

### Tests that must fail first when applicable

- If the component logic is importable with current tooling, add a test that asserts the update payload preserves `ativo: true/false` and a deferred-promise test where tab A resolves after tab B without overwriting B.
- Do not add `@vue/test-utils` or extract a general helper solely to force unit testing. If current tooling cannot exercise `<script setup>` behavior cheaply, record TDD as not applicable for these wiring changes and use the deterministic manual scenario below plus build validation.

### Minimal implementation

1. Initialize/preserve `form.ativo` from the edited record and include it only in update payloads whose backend contract requires it.
2. In `buscarDados`, capture the tab and endpoint before `await`, and write data/error/loading state back to that captured tab. Add a local monotonically increasing request ID only if same-tab overlapping calls can still overwrite newer data; no shared abstraction.

### Required validation

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```

Manual deterministic check against a development backend: delay the first catalog request, switch tabs, allow the second request to complete first, then release the first; each tab must retain its own data. Edit one sector, unit, and cell while preserving both active and inactive values where the UI exposes them; no request may fail for missing `ativo`.

### Code review

Use a Luna High reviewer focused on request ownership, stale loading/error state, payload shape for each entity, and accidental changes to permissions or catalog semantics.

### Risks

- Using the current tab after `await` recreates the race even if the endpoint was captured.
- Hard-coding `ativo: true` would prevent correct inactive-row editing.
- A shared async abstraction would expand scope and complicate later #10 work.

### Objective completion criterion

Stage 2 is complete when all three update payloads include the preserved boolean, the delayed cross-tab scenario cannot misroute data/error/loading state, frontend tests/build pass, and review has no unresolved P0/P1 issue.

### Suggested commits

1. `fix: preserve active state in catalog edits`
2. `fix: bind configuration responses to their source tab`

---

## Stage 3 — Frontend concurrency and session

### Findings treated

- #9 — late photo compression persists evidence after the answer stops being “Não Conforme”.
- #10 — stale HTTP responses overwrite current selection, filters, pagination, or cloning state.
- #11 — the router trusts a locally stored profile before validating the server session.

### Likely files

- Modify: `frontend/src/views/FormularioView.vue`
- Modify: `frontend/src/views/CheckSelecao.vue`
- Modify: `frontend/src/views/ConsultarView.vue`
- Modify: `frontend/src/views/CriarModeloView.vue`
- Modify: `frontend/src/router/index.js`
- Modify only if the existing contract must expose a once-per-load operation: `frontend/src/services/session.js`
- Modify: `frontend/test/session.test.js`
- Modify only if persistence ownership changes: `frontend/test/draftPersistence.test.js`
- Create focused tests only with existing tooling: `frontend/test/requestConcurrency.test.js`

### Dependencies between tasks

- #9 is independent of #10/#11 and may be implemented/reviewed separately, but only one agent may edit `FormularioView.vue` at a time.
- Inventory every async request that derives its destination from mutable state before implementing #10. Scope is limited to the confirmed paths: model selection, query filters/pagination, and model cloning.
- Define the session validation lifecycle before changing the router: one server validation per application load for protected navigation, shared by concurrent guards, with failure clearing local auth state.

### Expected behavior

- After image compression resolves, the form rechecks that the same question is still “Não Conforme”; otherwise the generated photo is discarded and neither draft nor UI state is updated.
- Only the latest relevant request may update model options, query results/count/page, or cloned-model form state. Older success and error responses are ignored for state ownership.
- A stored profile is display/cache data, not proof of authentication. The first protected navigation validates `/api/perfis/me`; concurrent navigations share the in-flight promise. Invalid/expired sessions clear local state and route to login.
- Global data visibility for valid `ADMIN`, `LIDER`, and `INSPETOR` sessions remains unchanged.

### Tests that must fail first when applicable

- Add a deferred-promise session test proving a stored profile still triggers server restoration once, concurrent calls deduplicate, and rejection clears profile/token state.
- Add focused deferred-promise tests for any extracted minimal “latest request wins” primitive only if one primitive is actually reused by multiple callers. Otherwise test component-local logic where current Vite/Vitest supports it and validate remaining paths manually.
- For #9, add a test around existing draft persistence only if the guard is placed there for all callers. If ownership is correctly local to the form’s answer state, do not move domain state into `draftPersistence`; use a component-level/manual delayed-compression test rather than creating an abstraction.

### Minimal implementation

1. In `FormularioView.vue`, re-read the answer immediately after the compression `await` and return before updating/persisting when it is no longer “Não Conforme”. Also ensure a newer photo operation for the same question owns the result if overlapping selections are possible in the existing UI.
2. In each #10 component, use the smallest local mechanism that works: capture request parameters and increment a request sequence; apply success/error/finally state only when the sequence still matches. Prefer Axios `signal` only if cancellation is already used and simpler than sequence checks.
3. In session/router code, reuse the existing in-flight restoration promise. Add only the minimal once-per-application-load validation state needed by the router; do not create a session state framework.

### Required validation

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
```

Manual deterministic checks with delayed promises/network throttling:

- start photo compression, change the answer to Conforme, release compression; no photo/draft remains;
- select model/filter/page/clone A, immediately choose B, resolve B then A; B remains visible;
- preload a stale local profile and open an admin/protected URL; server rejection clears it and redirects to login;
- preload valid `LIDER` and `INSPETOR` profiles; server validation succeeds and global read screens remain accessible, while admin UI stays denied.

### Code review

Use separate Luna High review passes for concurrency ownership and session/security behavior. Review all `await`/`finally` writes, error races, loading flags, cleanup, redirect loops, duplicate `/me` calls, and any accidental use of local role before validation.

### Risks

- Guarding only the success result but not error/finally can let stale requests clear loading or show obsolete errors.
- A global request counter shared across unrelated operations would cancel valid work.
- Revalidating on every route change causes needless traffic; validating only when no local profile preserves the current vulnerability.
- Clearing only the profile but retaining other auth state can produce redirect loops.

### Objective completion criterion

Stage 3 is complete when all specified delayed-result scenarios deterministically retain the newest state, no photo persists after its answer changes, the first protected navigation validates the server session exactly once per load (with in-flight deduplication), tests/build pass, and reviews have no unresolved P0/P1 issue.

### Suggested commits

1. `test: cover delayed frontend state ownership`
2. `fix: discard stale photo and request results`
3. `test: require server validation for cached sessions`
4. `fix: validate cached profile before protected navigation`

---

## Stage 4 — Backend robustness and priority HTTP tests

### Findings treated

- #3 — malformed cookies and unexpected errors do not consistently return JSON.
- #12 — integration suite imports removed services and assumes obsolete factory APIs.
- #14 — missing priority HTTP tests for administrative authorization and changed controllers.

### Likely files

- Modify: `backend/middlewares/auth.js`
- Modify: `backend/index.js`
- Modify: `backend/test/integration/database.integration.test.js`
- Create: `backend/test/integration/http.integration.test.js`
- Modify: `backend/scripts/test-integration.js`
- Modify if unit coverage is the smallest first step: `backend/test/auth.test.js`
- Inspect: all files under `backend/routes/`
- Exercise controllers changed in Stage 1: `backend/controllers/ChecklistController.js`, `backend/controllers/CadastrosController.js`, `backend/controllers/DadosController.js`

### Dependencies between tasks

- Stage 4 depends on Stage 1 migration/controller contracts so integration tests assert final behavior and migration count.
- Fix test harness loading before diagnosing runtime failures. Use `systematic-debugging`: reproduce, isolate load/setup/HTTP/database failures, then make one evidence-backed correction at a time.
- Make the Express app startable on an ephemeral port without a module-load listener before writing HTTP tests. Preserve `npm start` behavior.
- Authorization tests must encode the confirmed matrix: global reads allowed to all three roles; administrative operations allowed only to `ADMIN`.

### Expected behavior

- Malformed percent-encoding in the `token` cookie produces JSON `401`/`403` according to the existing invalid-token contract, never an uncaught URI error or HTML.
- Unexpected middleware/controller errors reach a terminal JSON `500` handler with no sensitive error detail in the response.
- The integration command loads only current modules, creates a disposable database, applies all migrations, executes database and HTTP tests, and tears down reliably.
- `LIDER` and `INSPETOR` receive `403` before administrative controllers execute; `ADMIN` reaches them.
- All three roles can read submissions, submission details/evidence, and reports globally.

### Tests that must fail first

- HTTP request with malformed cookie encoding asserts JSON content type and stable 401/403 envelope.
- Route/controller forced to throw asserts JSON `500`, not Express HTML. Add a test-only failing route only inside the test-created app or inject a rejected handler; do not expose it in production routing.
- Table-driven HTTP authorization tests using real signed JWTs and disposable DB profiles:
  - `ADMIN`: administrative model reads/mutations and profile/catalog administration are not rejected by authorization (controller validation may return another non-403 status for minimal payloads).
  - `LIDER`, `INSPETOR`: every administrative route/method group returns `403`.
  - all roles: global read routes do not return authorization `403`.
- HTTP/controller tests for Stage 1: incoherent submission returns `400`; coherent input reaches normal processing; brand-ID model filtering returns the expected rows; create/update share validation.
- A database integration test must fail on the current obsolete imports before it is replaced with current SQL/HTTP behavior.

### Minimal implementation

1. Make cookie decoding total: catch decoding errors at the parser boundary and route them through the existing invalid/missing token JSON contract.
2. Add one terminal Express error middleware after routes that logs server-side and returns `{ sucesso: false, mensagem: 'Erro interno do servidor.' }` with `500` unless headers were sent.
3. Split app construction/listening only as far as needed so tests can call `app.listen(0)` and `npm start` still starts the configured server. Do not introduce a dependency-injection framework.
4. Use Node’s built-in `fetch`/`http` and existing `jsonwebtoken`; do not add Supertest.
5. Replace obsolete service imports/factory calls in `database.integration.test.js` with current database/controller contract checks. Keep the valid migration baseline coverage.
6. Update the integration runner to discover/run both integration files and propagate failures while retaining cleanup.
7. Cover route groups table-first to avoid repetitive test code, but keep assertions explicit about `403` versus non-`403`.

### Required validation

```bash
cd backend && npm run test:unit
cd backend && npm run test:integration
cd backend && npm run test:all
cd frontend && npm test -- --run
cd frontend && npm run build
```

Also run `node --check` for every changed backend JavaScript file. Verify integration teardown with `docker compose -f backend/docker-compose.db-test.yml ps` and ensure no disposable test container/volume remains beyond runner policy.

### Code review

Use Luna High for a dedicated security/HTTP review and another independent final test-harness review only if the files do not overlap during implementation. Review route inventory completeness, middleware order, information leakage, JWT/profile setup realism, false positives where controller `400` is mistaken for authorization success, teardown on failure, and preservation of global reads. Escalate to Terra only if a documented Express lifecycle or database-isolation problem remains unresolved after Luna High analysis.

### Risks

- Catching every auth error as “invalid token” can hide database outages; only token/cookie failures should map there, while unexpected DB errors should reach JSON `500`.
- Module-load environment capture (`JWT_SECRET`) can make tests order-dependent.
- A non-403 admin test without proving the controller was reached can be weak; use a valid minimal request or a test spy at the boundary.
- Docker integration tests must never target a production connection string.

### Objective completion criterion

Stage 4 is complete when `npm run test:integration` no longer has obsolete imports, disposable DB and HTTP suites pass from a clean run, malformed-cookie and unexpected-error responses are JSON, the complete administrative route inventory is denied to both non-admin roles and available to admin, global reads pass for all three roles, all checks pass, and review has no unresolved P0/P1 issue.

### Suggested commits

1. `test: cover malformed cookies and JSON server errors`
2. `fix: normalize authentication and server error responses`
3. `test: replace obsolete database integration coverage`
4. `test: cover administrative and global-read HTTP authorization`

---

## Stage 5 — Report-flow consolidation and final branch review

### Findings treated

- #13 — evaluate overlap between report/submission controllers and HTTP envelope divergence.
- Full branch regression, security, data-compatibility, and maintainability review.

### Likely files

- Inspect: `backend/controllers/RelatoriosController.js`
- Inspect: `backend/controllers/SubmissoesController.js`
- Inspect: `backend/routes/RelatoriosRoutes.js`, `backend/routes/SubmissoesRoutes.js`
- Inspect: `frontend/src/views/RelatorioView.vue`, `frontend/src/views/DetalheRelatorioView.vue`, `frontend/src/views/ConsultarView.vue`
- Modify only if tests prove shared duplicated transformation: the smallest of the two controllers or one existing utility such as `backend/utils/scoring.js`
- Modify/add tests only for proven contract changes: `backend/test/integration/http.integration.test.js`
- Update this plan and SDD ledger with final status/evidence.

### Dependencies between tasks

- Perform #13 after Stages 1–4 so the comparison uses final contracts and HTTP tests protect callers.
- First inventory each endpoint’s consumers, selected fields, scoring/transformation logic, error/status envelope, and evidence payload.
- Apply this decision rule:
  - If endpoints serve distinct read models, retain both and document the intentional contract difference—no refactor.
  - If the same database/scoring transformation is duplicated and can be shared without changing either public envelope, extract only that pure transformation/query fragment.
  - Do not merge routes or standardize envelopes unless all callers are migrated under failing contract tests and the change directly fixes a demonstrated defect.

### Expected behavior

- Existing report/detail screens retain their fields, status handling, photos/evidence, and global visibility.
- Any shared logic has one tested source without forcing unrelated endpoints into one envelope.
- The final branch contains only finding-related changes, no accidental generated files, secrets, broad refactors, or read-access restrictions.

### Tests that must fail first when applicable

- If a real divergence is found, add a contract test demonstrating the defect at both relevant endpoints before extracting/fixing shared logic.
- If the controllers are intentionally distinct and no defect is demonstrated, add no speculative test or production abstraction; record the evidence and mark #13 evaluated/no code change.

### Minimal implementation

1. Produce a concise comparison table in the ledger: endpoint, callers, purpose, query/transform overlap, envelope, and decision.
2. Make no production change unless the decision rule proves a concrete duplicate defect.
3. If change is justified, extract the smallest pure shared function or query builder into an already appropriate module, preserve both response envelopes, and update only direct callers/tests.
4. Run a complete diff review against the base commit and remove only branch-introduced dead code or accidental complexity.

### Required validation

```bash
git diff --check
cd backend && npm run test:all
cd frontend && npm test -- --run
cd frontend && npm run build
```

Then run changed-backend `node --check`, inspect `git status --short`, review migration ordering/status in the disposable database, and rerun the manual delayed-response scenarios from Stages 2–3. Record exact command results and any unverified environment-dependent behavior.

### Code review

Generate the SDD final review package and use a fresh Luna High reviewer for the whole branch, including base-to-head diff, business-rule compliance, authorization matrix, migration safety, stale async writes, error envelopes, tests, and scope control. Permit one focused fix wave, rerun affected tests, then request a final re-review. Escalate to Terra only for a concrete unresolved cross-layer correctness/security issue.

### Risks

- Treating different read models as duplication can break frontend contracts for no functional gain.
- Envelope standardization has a wide regression surface and is out of scope without a demonstrated bug.
- Green unit tests alone do not validate migration, HTTP authorization, or async browser races.
- Final cleanup can accidentally become cosmetic refactoring; limit it to branch-introduced defects.

### Objective completion criterion

Stage 5 is complete when #13 has an evidence-backed keep/extract decision, any justified change is contract-tested, the final SDD reviewer has no unresolved P0/P1 issue, all required automated checks pass, manual concurrency scenarios are recorded, the plan/ledger list every commit and open risk, and no implementation remains falsely marked complete. Do not push.

### Suggested commits

1. Only if justified: `refactor: share proven report transformation`
2. Only for review-discovered defects: `fix: address final hardening review findings`
3. `docs: record hardening validation and completion status`

---

## Stage transition checklist

Before starting each stage:

- [ ] Read this entire plan and the SDD `progress.md`.
- [ ] Confirm current branch/worktree, clean expected state, and previous-stage commits.
- [ ] Reconcile the “Persistent execution status” section with the ledger.
- [ ] Confirm business-decision gates needed by the stage.
- [ ] Generate the SDD task brief and run its preflight conflict/self-consistency scan.
- [ ] Assign the cheapest adequate explicit subagent model and non-overlapping file ownership.

Before completing each stage:

- [ ] Confirm relevant tests failed for the expected reason before production changes where TDD applies.
- [ ] Run the stage validation commands and record exact results.
- [ ] Run independent code review and resolve all P0/P1 findings.
- [ ] Update current/completed/pending tasks, decisions, commits, validations, and open risks here and in the ledger.
- [ ] Confirm no global-read restriction, unconfirmed uniqueness constraint, unrelated refactor, secret, or generated artifact entered the diff.

## Final handoff record

Fill this only during execution, never from memory:

| Item | Recorded outcome |
|---|---|
| Final stage/status | Not started |
| Completed findings | None implemented |
| Blocked findings and decisions needed | #2 exact coherence rule; #7 uniqueness rule |
| Discarded findings | #1 global read — expected behavior |
| Commits | None |
| Backend unit validation | Baseline only: passed 2026-08-26 |
| Backend integration validation | Not run; suite currently incompatible |
| Frontend test validation | Baseline only: passed 2026-08-26 |
| Frontend build validation | Not run during planning |
| Manual concurrency validation | Not run |
| Final code review | Not run |
| Open risks | Legacy brand mapping; #2/#7 decisions; #13 evaluation |

