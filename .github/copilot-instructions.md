# Copilot Instructions — SDKGenerator

> **Code generator** that emits PlayFab client SDKs for many platforms (C++, C#, Java, JS, Python, PHP, Unity, ObjC, ActionScript, Postman, etc.) from JSON API specs. Node.js + EJS templates.

## Stack

- **Node.js** (≥ 18 recommended)
- **TypeScript** (lightweight — entrypoints are `.js`)
- **EJS** templating (`ejs ^3.1.10`) — only runtime dep
- **No bundler** — direct execution

## Sibling-folder convention (critical)

This generator **expects to live as a sibling** of the API specs and the SDK output dirs:

```
<your-parent-folder>/
├── SdkGenerator/                # <— this repo (clone here)
├── API_Specs/                   # JSON API specs (separate repo)
├── sdks/                        # Output SDKs (separate repos, one per language typically)
│   ├── PlayFabClientSdkCSharp/
│   ├── PlayFabSDK/
│   └── ...
└── (other tooling, optional)
```

Many scripts assume this sibling layout. Don't clone this repo standalone into a deeply-nested path.

## Repo layout

```
SDKGenerator/
├── package.json                  # ejs dep only
├── generate.js                   # Main entrypoint
├── tsconfig.json
├── targets/                      # One folder per generator target
│   ├── PlayStation/              # NDA — gated
│   ├── actionscript/
│   ├── cpp-cocos2dx/
│   ├── csharp/
│   ├── java/
│   ├── javascript/
│   ├── js-node/
│   ├── LuaSdk/
│   ├── newTarget/                # Template for adding a new target
│   ├── objc/
│   ├── PhpSdk/
│   ├── postman/
│   ├── PythonSdk/
│   ├── SdkTestingCloudScript/
│   └── unity-v2/
├── SDKBuildScripts/              # Per-language build helpers
├── SetupScripts/                 # Environment setup
├── JenkinsConsoleUtility/        # Console SDK build/test orchestration
└── (other tooling, e.g. snapshot tests)
```

## Day-1 setup

```bash
# Clone alongside API_Specs and sdks/ (not standalone!)
cd <your-parent-folder>
git clone <SDKGenerator-url> SdkGenerator
git clone <API_Specs-url> API_Specs
# clone target SDK output repos as needed under sdks/

cd SdkGenerator
npm install   # only `ejs` is pulled
```

## Generating an SDK

```bash
node generate.js <target>=<output-relative-path>

# Example: regenerate the C# client SDK
node generate.js csharp=../sdks/PlayFabClientSdkCSharp/

# Multiple targets in one invocation
node generate.js csharp=../sdks/PlayFabClientSdkCSharp/ unity-v2=../sdks/PlayFabSDK/
```

## Adding a new target

Use `targets/newTarget/` as the template:

1. Copy `targets/newTarget/` → `targets/<your-target-name>/`.
2. Implement `make.js` (entrypoint per target).
3. Add EJS templates under `templates/`.
4. Wire build scripts under `SDKBuildScripts/<your-target-name>/` if compilation is needed.
5. Test against API_Specs.
6. Document in README.

## Conventions

- **Indent**: 2 spaces (Node convention).
- **API_Specs** are versioned in a separate repo; don't fork them inline.
- Target isolation, re-entrant drivers, template responsibility split, output discipline, snapshot-diff validation, new-target scaffolds, and NDA carve-out rules are defined in the shared `partycore-codegen-conventions.md` (footer link). This repo is the canonical consumer of that topic.

## Test / validation

- `JenkinsConsoleUtility/` runs end-to-end builds-and-tests for console targets.
- Per-target test apps usually live under `sdks/<target-name>/PlayFab*TestApp/`.
- Snapshot diffs against the previous SDK output are the standard sanity check.

## Out of scope

- API specs themselves → `API_Specs` (separate repo).
- The output SDKs → `sdks/*` (each is its own repo).
- The aggregator-monorepo → `PlayFab.SDKs.All` (different beast).

See also: [`AGENTS.md`](../AGENTS.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md), `README.md`.

Cross-cutting conventions (code-generator authoring patterns, PlayFab C/C++ source conventions for the emitted SDKs, and NDA-boundary policy for the `targets/PlayStation/` carve-out) are documented in the shared instructions repos linked in the footer below.

---

## Shared Instructions

This repo loads cross-cutting team instructions from one or both of:

- [copilot-instructions-partycore](https://dev.azure.com/PlayFabInternal/Main/_git/copilot-instructions-partycore) — non-NDA team conventions.
- [copilot-instructions-partycore-nda](https://dev.azure.com/PlayFabInternal/Main/_git/copilot-instructions-partycore-nda) — NDA-only additions (NDA-tented engineers).

Topics most relevant to this repo:

- `partycore-codegen-conventions.md` — target isolation, re-entrant drivers, template responsibility split, output discipline, snapshot-diff validation, new-target scaffolds, and NDA carve-out rules. This repo is the canonical consumer; the L2 instruction files (`targets.instructions.md`, `templates.instructions.md`) layer repo-specific details on top.
- `partycore-cpp-source-conventions.md` — SDKGenerator emits PlayFab C/C++ client SDK code (e.g. `cpp-cocos2dx`, console targets). The generator templates encode the PF prefix, XAsync pattern, handle lifecycle, and generated-code discipline defined in this shared topic; template authors and generator changes must stay aligned with it so emitted SDKs remain consistent with hand-authored PlayFab C/C++ code.
- `partycore-nda-boundary.md` — `targets/PlayStation/` is NDA-scoped content inside an otherwise non-NDA public GitHub repo. This shared topic defines what may live in this repo, what must be excluded from external AI prompts, and where NDA-tented sibling repos sit.

To check what's currently loaded:
`echo $env:COPILOT_CUSTOM_INSTRUCTIONS_DIRS` (PowerShell) or
`echo $COPILOT_CUSTOM_INSTRUCTIONS_DIRS` (bash/zsh). For setup
instructions, see the shared repos' READMEs.
