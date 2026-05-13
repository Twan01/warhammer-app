Run the TypeScript compiler for HobbyForge and report errors in a scannable format.

## Steps

1. **Run the build** (which includes `tsc` before Vite):
   ```
   pnpm build
   ```
   Capture all output including stderr.

2. **If the build succeeds** (exit code 0):
   - Report: "No TypeScript errors. Build succeeded."
   - Include the Vite output summary (chunk sizes, build time).

3. **If there are TypeScript errors**, group and display them like this:

   ```
   TypeScript Errors — N total

   src/features/someFeature/SomeComponent.tsx (3 errors)
     L42  TS2345  Argument of type 'string' is not assignable to parameter of type 'number'
     L67  TS2339  Property 'foo' does not exist on type 'Bar'
     L89  TS7006  Parameter 'x' implicitly has an 'any' type

   src/hooks/useSomething.ts (1 error)
     L15  TS2304  Cannot find name 'SomeType'
   ```

4. **Categorize errors by type** so quick wins are visible:

   **noUnusedLocals / noUnusedParameters** (TS6133, TS6196) — safe to delete:
   List these separately as they are usually trivial fixes.

   **Type mismatches** (TS2345, TS2322) — usually a missing cast or wrong type.

   **Missing properties / names** (TS2339, TS2304) — often a missing import or stale type definition.

   **Implicit any** (TS7006, TS7031) — add explicit types.

5. **Offer to fix** the errors. Prioritize:
   - Unused locals/params first (safe deletions)
   - Missing imports second
   - Type mismatches last (need more care)

   Fix errors file by file, re-reading each file before editing. After fixes, run `pnpm build` again to confirm clean.
