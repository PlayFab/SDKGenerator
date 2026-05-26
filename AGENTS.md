# AGENTS.md — SDKGenerator

> Primary agent context: [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

## TL;DR

Node.js + EJS code generator that emits PlayFab client SDKs for many platforms. Lives as a **sibling** of `API_Specs/` and `sdks/`. Run via `node generate.js <target>=<output>`.

## Quick rules

- **Sibling-folder layout** is required — see copilot-instructions.md.
- One target = one folder under `targets/<name>/`. Don't share code across targets.
- EJS templates: logic out, data prep in `make.js`.
- Indent = 2 spaces (Node).
- `targets/PlayStation/` is NDA-scoped; see `partycore-nda-boundary.md` via the L1 footer and do not paste PS content into external AI prompts.
- API specs live in `API_Specs` (separate repo) — don't fork inline.

## Where to look

| You need... | Read |
|---|---|
| What this is, layout, run flow, conventions | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) |
| Adding a new target | [`.github/instructions/targets.instructions.md`](.github/instructions/targets.instructions.md) |
| Template authoring | [`.github/instructions/templates.instructions.md`](.github/instructions/templates.instructions.md) |
| Branching, PR | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

## Useful refs

- API specs: `API_Specs` (sibling repo)
- Output SDK repos: `sdks/*` (sibling repos)
- Console build tooling: `JenkinsConsoleUtility/`
- [EJS docs](https://ejs.co/)
