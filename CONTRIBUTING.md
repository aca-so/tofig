# Contributing to tofig

Thanks for your interest in contributing! This document explains the branching
model, commit conventions, and the pull request process. Please read it before
opening your first PR.

## Code of Conduct

This project adheres to a [Code of Conduct](./CODE_OF_CONDUCT.md). By
participating, you are expected to uphold it.

## Branching model (Git Flow)

We follow the [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
branching model. There are two long-lived branches:

| Branch     | Purpose                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| `main`     | Production-ready code. Every commit is a tagged, releasable state.      |
| `develop`  | Integration branch. All feature work merges here first.                 |

And several kinds of short-lived support branches, always branched off and
merged back per the table below:

| Prefix       | Branches from | Merges into          | Use for                                  |
| ------------ | ------------- | -------------------- | ---------------------------------------- |
| `feature/`   | `develop`     | `develop`            | New features and enhancements            |
| `bugfix/`    | `develop`     | `develop`            | Non-urgent fixes for unreleased work     |
| `release/`   | `develop`     | `main` **and** `develop` | Preparing a versioned release        |
| `hotfix/`    | `main`        | `main` **and** `develop` | Urgent fixes to production            |
| `chore/`     | `develop`     | `develop`            | Tooling, CI, docs, repo maintenance      |

### Branch naming

Use a short, kebab-case description after the prefix:

```
feature/figma-export
bugfix/html-parser-edge-case
hotfix/crash-on-empty-doc
chore/project-setup
```

## Workflow

1. **Sync** your local `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. **Branch** off `develop` (or `main` for hotfixes):
   ```bash
   git checkout -b feature/my-thing
   ```
3. **Commit** using [Conventional Commits](#commit-messages).
4. **Push** and **open a Pull Request** targeting `develop`
   (hotfixes/releases target `main`).
5. Make sure **CI is green** and address review feedback.
6. A maintainer merges once approved.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Format:

```
<type>(<optional scope>): <description>
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

Examples:

```
feat(export): support exporting nested frames to Figma
fix(html): handle self-closing tags without attributes
docs: document the git flow branching model
chore(ci): add baseline CI workflow
```

## Pull requests

- Keep PRs focused and reasonably small.
- Fill out the PR template.
- Reference related issues (`Closes #123`).
- Ensure CI passes and the diff is self-reviewed.
- Squash trivial fixups before requesting review when practical.

## Reporting issues

Use the [issue templates](https://github.com/tiagomoraes/tofig/issues/new/choose)
for bug reports and feature requests. For security concerns, see
[SECURITY.md](./SECURITY.md) — please do **not** open a public issue.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](./LICENSE) that covers this project.
