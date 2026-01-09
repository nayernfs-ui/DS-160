# Contributing

Thanks for helping improve this project! A few quick guidelines to keep commits clean and ensure tests pass for everyone.

## ✅ Quick pre-commit checks

- **Run the project's main verification script before committing to `main`:**

  ```bash
  npm run check:main
  ```

  This runs the CI-style checks locally (lint with `--max-warnings=0` and the test suite). Please fix any failures locally before pushing.

- Small, safe changes that are purely cosmetic or test fixes may be committed directly to `main` **provided** they pass `npm run check:main` locally and include a short, clear commit message.

## ⚠️ Notes

- If a pre-commit hook blocks your commit due to lint-staged configuration, address the reported issues or run lint fixes (e.g., `npm run lint:fix`) and re-run `npm run check:main` before pushing.
- CI will also run checks; pushing failing changes may cause the PR or branch to be blocked.

## 🐞 CI troubleshooting (quick tips)

- If `npm run check:main` fails locally, try these steps in order:
  1. Run `npm run lint:fix` to auto-fix lintable issues.
  2. Run a single unit test to reproduce faster, e.g. `node tests/unit/visits.test.js`.
  3. If a test fails due to a timing/race in JSDOM, try running the test directly and inspect debug logs; many tests include helpful console output.
  4. If lint reports warnings, fix them (ESLint is run with `--max-warnings=0` in `check:main`).
  5. If you can't fix a CI failure, open a draft PR or issue with the failing logs and a short note so maintainers can triage.

Thanks — keeping the checks green helps everyone! 🎯
