## Description

<!-- What does this PR change? -->

## Scope

- [ ] New target (`targets/<name>/`)
- [ ] Existing target update (specify which)
- [ ] Shared tooling (`SDKBuildScripts/`, `SetupScripts/`, `JenkinsConsoleUtility/`)
- [ ] Generator core (`generate.js`)
- [ ] Documentation

## Targets touched

<!-- Which target(s)? e.g. csharp, unity-v2, java, PlayStation -->

## Verification

- [ ] Regenerated affected SDK(s) cleanly with `node generate.js <target>=<output>`
- [ ] Snapshot diff against previous output is intentional / reviewed
- [ ] Affected sibling SDK repo(s) (`sdks/*`) still build
- [ ] No unintended changes to unrelated targets
- [ ] No NDA / PlayStation source pasted in PR description (see `partycore-nda-boundary.md`)

## Documentation

- [ ] README updated (if user-facing)
- [ ] Target-level README/notes updated (if applicable)

## Compatibility

- [ ] Public API of generated SDKs is backward-compatible (or major bump justified)
- [ ] `package.json` deps unchanged (or new dep justified)
- [ ] Sibling-folder convention preserved

## References

- [`AGENTS.md`](../AGENTS.md)
- [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
- [`.github/instructions/targets.instructions.md`](../.github/instructions/targets.instructions.md)
- [`.github/instructions/templates.instructions.md`](../.github/instructions/templates.instructions.md)
