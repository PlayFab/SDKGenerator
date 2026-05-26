---
applyTo: "**/templates/**"
---

# EJS templates — SDKGenerator

Each target has its own `templates/` directory consumed by that target's `make.js`.

## Rules

- **EJS only.** No other templating engine.
- **Logic stays in `make.js`.** Templates should focus on rendering. Avoid heavy `<% if %>` chains.
- **Output formatting**: emit code that already follows the target language's conventions (indent, brace style). The generator is the only place these conventions live for that target.
- **No cross-target template imports.** Each target owns its own template tree.
- **Newlines / trailing whitespace**: be deliberate — generated files often go straight to a public SDK repo.
- **Localization / translations**: kept under the target's templates if the SDK has them.

## Authoring tips

- Pre-compute everything you need on the JS side in `make.js` (e.g. sorted lists, sanitized names, language-keyword escaping). Pass a clean view-model into the EJS template.
- Test by regenerating a known-good output SDK and snapshot-diffing.
- Keep templates small and focused — one concern per template (e.g. one for the model class, one for the API surface).

## Don't

- Don't put complex logic in templates (`<% if (...) { for (...) { switch (...) { ... } } } %>`).
- Don't reach into other targets' templates.
- Don't bypass EJS by string-concatenating in `make.js` for the bulk of output (defeats the point).
