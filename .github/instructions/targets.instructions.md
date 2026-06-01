---
applyTo: "targets/**"
---

# `targets/` — SDKGenerator

Each subfolder is one **generator target** (one output language/platform).

## Layout per target

```
targets/<name>/
├── make.js                # Entrypoint: invoked by ../../generate.js
├── templates/             # EJS templates (consumed by make.js)
└── (optional) testTitleData.json, etc.
```

## Rules

- **`make.js`** must export a function `makeClientApi(apis, sourceDir, apiOutputDir)` (or sibling variants — see existing targets).
- **Indent**: 2 spaces.
- **`targets/PlayStation/`**: NDA-scoped content; see `partycore-nda-boundary.md` (referenced from the L1 footer) for the team-wide NDA-boundary policy. Do not paste source into external AI prompts.
- Target isolation, re-entrancy, template responsibility split, output discipline, and other cross-target rules are defined in the shared `partycore-codegen-conventions.md` (L1 footer link).

## Adding a new target

1. Copy `targets/newTarget/` → `targets/<your-name>/`.
2. Implement `make.js`.
3. Author EJS templates under `templates/`.
4. Add a test invocation: `node ../../generate.js <your-name>=<test-output>`.
5. Snapshot-diff vs prior runs to catch regressions.
6. If the SDK needs compiling/testing, wire under `SDKBuildScripts/<your-name>/`.
7. Update README + add to CI if applicable.

## Don't

- Don't commit real credentials or Title IDs in `testTitleData.json` and `unityTestTitleData.json` — use placeholder values only. The file template should be safe to push to the public repo.
- Additional "don't" rules (no cross-target imports, no writes outside `apiOutputDir`, no hardcoded absolute paths, no generated output committed back) are in the shared `partycore-codegen-conventions.md`.
