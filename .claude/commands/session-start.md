Load HobbyForge project context for a new work session. Give me a clear picture of where things stand and what to work on next.

## Steps

1. **Read planning state**:
   - `.planning/STATE.md` — current development state snapshot
   - `.planning/PROJECT.md` — milestone overview and active feature list
   - `.planning/ROADMAP.md` — phase timeline

2. **Check GSD phase status** by reading the most recent phase plan files in `.planning/`:
   - Look for files like `phase-XX/PLAN.md` or `phase-XX/VERIFICATION.md`
   - Identify: which phases are complete, which is active, what's next

3. **Check the test suite health**:
   - Run `pnpm test` (single pass, non-interactive)
   - Report: N passing, N failing, any skipped

4. **Check TypeScript health**:
   - Run `pnpm build` quickly — just report pass/fail and error count, not full details
   - (Use `/project:type-check` if a full breakdown is needed)

5. **Report a session brief** in this format:

   ```
   ## HobbyForge Session Brief — <today's date>

   **Milestone**: v2.2 Full Circle
   **Current phase**: Phase XX — <phase name>
   **Phase status**: <In progress / Complete / Not started>

   ### Done (this milestone)
   - ...

   ### In Progress
   - ...

   ### Up Next
   - ...

   ### Health
   - Tests: N passing / N failing
   - TypeScript: Clean / N errors

   ### Suggested first action
   <One concrete recommendation — e.g. "Continue Phase 19 analytics stubs" or "Fix 3 TS errors in spending.ts before resuming feature work">
   ```

6. **Remind** about the GSD workflow:
   - All work should follow GSD phases: `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:verify-work`
   - Bugs → `/investigate`, Ship/PR → `/ship`, QA → `/qa`, Design → `/design-consultation`
   - Never edit existing SQL migration files — add new ones instead
