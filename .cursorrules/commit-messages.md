# Commit Message Rules

Always generate messages in this exact format:
[branch-name] type(scope): subject

## Title Format Rules

- **REQUIRED**: `[branch-name] type(scope): subject`
- **Max length**: 72 characters for the entire title
- **Branch name**: Include actual git current branch name in square brackets at the start
- **Type**: Required, lowercase, no spaces
- **Scope**: Optional, lowercase, in parentheses immediately after type
- **Subject**: Brief description, lowercase, no period at end

## Body (optional)

- Explain the **what** and **why**, not the **how**
- Wrap lines at 72 characters
- Separate from title with one blank line
- Use bullet points for multiple changes

## Footer (optional)

- Include the exact current git branch name in square brackets at the start.
- Title max length: 72 chars (including branch).
- type (lowercase, required): feat | fix | docs | style | refactor | test | chore | perf | ci | build | revert
- scope (optional, lowercase): e.g., (auth), (api), (chart), (config), (types), (utils)
- subject: imperative mood, lowercase, no period; keep ≤ 50 chars if possible.
- Body (optional): explain what/why; wrap at 72; blank line after title.
- Footer (optional): issue refs like "Closes #123", "Fixes #456"; add "BREAKING CHANGE: …" if needed.

## Examples

[feature/user-auth] feat(auth): add login validation
[bugfix/chart-render] fix(chart): resolve data rendering issue
[main] docs(readme): update installation guide
[develop] chore(deps): update vue to 3.4.0 