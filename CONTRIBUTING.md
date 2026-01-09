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

Thanks — keeping the checks green helps everyone! 🎯
