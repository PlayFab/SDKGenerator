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

- **One target = one folder.** Don't share mutable state across targets.
- **`make.js`** must export a function `makeClientApi(apis, sourceDir, apiOutputDir)` (or sibling variants — see existing targets).
- Logic in `make.js`, presentation in `templates/<x>.ejs`.
- **Indent**: 2 spaces.
- Re-entrant: a target's `make.js` may be invoked multiple times in one process — no module-level mutation that would corrupt subsequent calls.
- **`targets/PlayStation/`**: NDA-scoped content; see `partycore-nda-boundary.md` (referenced from the L1 footer) for the team-wide NDA-boundary policy. Do not paste source into external AI prompts.

## Adding a new target

1. Copy `targets/newTarget/` → `targets/<your-name>/`.
2. Implement `make.js`.
3. Author EJS templates under `templates/`.
4. Add a test invocation: `node ../../generate.js <your-name>=<test-output>`.
5. Snapshot-diff vs prior runs to catch regressions.
6. If the SDK needs compiling/testing, wire under `SDKBuildScripts/<your-name>/`.
7. Update README + add to CI if applicable.

## Don't

- Don't reach across targets (`require('../<other-target>/make')`).
- Don't write anywhere except the configured `apiOutputDir`.
- Don't hardcode absolute paths — use `path.resolve(...)` from inputs.
- Don't commit generated SDK output back into `targets/` — it goes to the sibling `sdks/<output>/` repos.
