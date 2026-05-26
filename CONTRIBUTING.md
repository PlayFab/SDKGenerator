# Contributing to SDKGenerator

Code generator that emits PlayFab client SDKs from JSON API specs.

> 🤖 **AI agents:** read [`.github/copilot-instructions.md`](.github/copilot-instructions.md), [`AGENTS.md`](AGENTS.md), and the README first.

## Setup

```bash
# Sibling-folder layout (required):
mkdir playfab-sdks && cd playfab-sdks
git clone <SDKGenerator-url> SdkGenerator
git clone <API_Specs-url> API_Specs
# (clone target SDK repos under sdks/ as needed)

cd SdkGenerator
npm install
```

## Branching

| Prefix | Use For |
|---|---|
| `feature/` | New target, new generator feature |
| `fix/` | Bug fix |
| `chore/` | Dependency / template updates |
| `docs/` | Documentation only |

## Generating SDKs (smoke test)

```bash
node generate.js csharp=../sdks/PlayFabClientSdkCSharp/
node generate.js unity-v2=../sdks/PlayFabSDK/
```

Diff the output against the prior commit to spot regressions.

## Adding a new target

See [`.github/instructions/targets.instructions.md`](.github/instructions/targets.instructions.md).

## Coding style

- Node.js + JS + EJS templates.
- 2-space indent everywhere (`.editorconfig` enforces).
- Logic in `make.js`, rendering in `templates/`.
- One target = one folder under `targets/`.
- No cross-target imports.

## NDA reminder

`targets/PlayStation/` is NDA-scoped content inside this otherwise non-NDA repo. See `partycore-nda-boundary.md` from the L1 footer for the team-wide policy; do not paste its source into external AI prompts.

## PR Process

1. Branch.
2. Implement; regenerate affected SDK(s); diff and verify.
3. Update README / target docs as appropriate.
4. Open PR ([template](.github/PULL_REQUEST_TEMPLATE.md)).
5. CI passes; review; merge.

## Code of Conduct

[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
