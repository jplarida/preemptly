## 2026-08-31 · default — Git remote set up (repo still uncommitted)

Monorepo `D:\Personal\projects\preempty` wired to GitHub for the first time.

- **Remote:** `origin` → `git@personaldev:jplarida/preemptly.git`
- **`personaldev`** = ssh alias in `C:\Users\User\.ssh\config` → github.com via `~/.ssh/id_rsa_jong`.
  Verified `ssh -T` lands on account **jplarida**. Note: `id_rsa_jong` and `id_ed25519` are the
  **same key** (identical fingerprint `SHA256:R3GWPNLVOvM4TvhN8sEm5hIq+gEaN1mNe+FMvNXTBgc`, RSA-4096);
  `id_ed25519` is misnamed — it is not an Ed25519 key. So the missing `IdentitiesOnly yes` on the
  `personaldev` block is harmless, unlike the `github-sevron` case its comment warns about.
- **Identity:** set **repo-local only** (`jplarida` / `jonglarida@gmail.com`). Global stays unset on purpose.
- **Branch:** unborn `master` → `main` via `git symbolic-ref HEAD refs/heads/main`
  (`git branch -m` does not work with zero commits).

**Repo scope decided this session:**
- `docs/plans/` (33 files, the api-core planning set) **copied in** from `D:\work\preempty\docs\` —
  now versioned, kept separate from the older `documents/` tree. Launcher-stub copy left in place.
- `documents/healthcare/` (18 files, separate product line) **moved out** → `D:\work\preempty\documents\healthcare\`.
- `.claude/` **moved out** → merged into `D:\work\preempty\.claude\`, and added to `.gitignore`.
  Collisions preserved, not overwritten: monorepo copies landed as `settings.local.monorepo.json`
  and `sessions/.current-session.monorepo`. **The 9 `project-session-*`/`task-*` slash commands now
  live only in the launcher stub** — they are no longer in the monorepo.

**STILL PENDING — the repo has zero commits and no backup.**
GitHub repo `jplarida/preemptly` must be created (empty) before any push; `gh` CLI is not installed
on this machine. Nothing was committed or pushed this session.
