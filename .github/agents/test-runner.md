---
name: test-runner
description: Routes "how do I test this?" for SDKGenerator. Local validation = regenerate a known-good target and snapshot-diff vs prior output. Console targets validated via `JenkinsConsoleUtility/`.
tools: ['*']
---

# test-runner — SDKGenerator

There is **no `npm test` unit-test layer here.** The generator's correctness is judged by the SDK source it emits. Validation is a regenerate-and-diff loop, plus per-target test apps for runtime checks.

## Prerequisites (one-time)

- The sibling-folder layout exists: `<parent>/SdkGenerator/`, `<parent>/API_Specs/`, `<parent>/sdks/<target-output>/...`.
- `npm install` has run inside SDKGenerator (only `ejs` is pulled).
- For each target you're going to regenerate, the destination repo (`sdks/<target>/`) is cloned and clean.

## How to "run tests"

### 1. Local snapshot-diff loop (the canonical loop)

```bash
# from SDKGenerator/
node generate.js <target>=<output-relative-path>

# Example: regenerate C# client SDK
node generate.js csharp=../sdks/PlayFabClientSdkCSharp/
```

Then in the **destination** repo:

```bash
cd ../sdks/<output>
git status         # shows everything generate.js wrote
git diff           # the actual snapshot — read it carefully
```

The diff IS the test. Look for:
- Unintended changes to files you didn't touch (cross-target leakage).
- Whitespace/newline drift (templates often regress here).
- Loss of language-specific formatting (indent, brace style, trailing commas).
- Public API surface changes that don't match the API_Specs intent.

### 2. Multi-target regeneration

Regenerate **every target your change might affect**, not just the obvious one:

```bash
node generate.js csharp=../sdks/PlayFabClientSdkCSharp/ unity-v2=../sdks/PlayFabSDK/ java=../sdks/JavaSDK/
```

Generic edits to `generate.js` / `generate.ts` should regenerate a representative sample across language families.

### 3. Per-target runtime tests

Where they exist, run the test app under `sdks/<target>/PlayFab*TestApp/` against generated output. Confirms the emitted code actually compiles and the API surface works.

### 4. Console targets

`JenkinsConsoleUtility/` orchestrates end-to-end build + test for console SDKs (Switch / Sony / NDA platforms). For console-target changes, this is the gate — local snapshot-diff is necessary but not sufficient.

## Before reporting "tests pass"

- Snapshot diff inspected (not just "the script exited 0").
- For interface or `generate.js` changes: regenerated **multiple** representative targets.
- For new target: clean regeneration into a fresh destination repo + snapshot-diff vs `targets/newTarget/` baseline.
- For console-target changes: `JenkinsConsoleUtility/` run is green.

## Don't

- Don't fabricate `npm test` — there's no unit-test runner here.
- Don't approve a change that only regenerated one target if `generate.js` / shared interfaces moved.
- Don't paste PlayStation snapshot diffs into external systems; see `partycore-nda-boundary.md` for the team-wide partial-NDA carve-out policy.
- Don't commit generated SDK output back into `targets/` (it goes to the sibling `sdks/` repos).

## Key references

- L1 `### Generating an SDK`, `### Test / validation` — `.github/copilot-instructions.md`.
- L2 `targets.instructions.md`, `templates.instructions.md`.
- `generate.ts` — `IBuildTarget` / `IGenConfig` shape if you're tracing what gets passed to `make.js`.
