## 2026-08-31 · default — Git repo set up, consolidated, committed and pushed

> **Snapshot note.** This file is a committed *copy* of the coverage inbox, not the live one.
> Live inbox: `<mycodebuddy>/projects/preempty/memory/_inbox/default.md`.
> An earlier revision of this file (committed in `5959a11`) was captured mid-session and said
> "the repo has zero commits and no backup", and recorded pre-final locations for
> `documents/healthcare/` and `.claude/`. All of that is corrected below.

**Remote:** `origin` → `git@personaldev:jplarida/preemptly.git` → https://github.com/jplarida/preemptly
(**Private**, `main` @ `5959a11`, 383 files — created and pushed 2026-08-31).

- **`personaldev`** = ssh alias in `C:\Users\User\.ssh\config` → github.com via `~/.ssh/id_rsa_jong`.
  Verified `ssh -T` lands on account **jplarida**. Note: `id_rsa_jong` and `id_ed25519` are the
  **same key** (identical fingerprint `SHA256:R3GWPNLVOvM4TvhN8sEm5hIq+gEaN1mNe+FMvNXTBgc`, RSA-4096);
  `id_ed25519` is misnamed — it is not an Ed25519 key. So the missing `IdentitiesOnly yes` on the
  `personaldev` block is harmless, unlike the `github-sevron` case its comment warns about.
- **Identity:** set **repo-local only** (`jplarida` / `jonglarida@gmail.com`). Global stays unset on purpose.
- **Branch:** unborn `master` → `main` via `git symbolic-ref HEAD refs/heads/main`
  (`git branch -m` does not work with zero commits).

**Repo scope — final state (verified on disk):**
- `docs/plans/` — **33 files**, the api-core planning set, copied in from `D:\work\preempty\docs\`.
  Versioned, kept separate from the older `documents/` tree.
- `docs/memory/` — **12 files**, copied in from the filesystem-memory dir. Includes this snapshot.
- `documents/healthcare/` — **moved OUT to `D:\Personal\projects\hsc-platform\documents\healthcare\`**
  (18 files), its own private repo: https://github.com/jplarida/hsc-platform (`main` @ `631f1db`).
  Separate product, separate stack. Split happened *before* any commit, so no history surgery.
- `.claude/` — **present in the monorepo and gitignored** (`.gitignore:26`). On disk, never committed.
  All **9 `project-session-*` / `task-*` slash commands are here**, plus the session notes.

**Sibling repo:** `hsc-platform` at `D:\Personal\projects\hsc-platform` — Private, `main` @ `631f1db`,
19 files. Same identity and `personaldev` alias.

**Safe to delete:** `D:\work\preempty` (byte-for-byte redundant) and `D:\work\documents\preempty`
(stale PRE-RENAME copy — `preempty.*` vs the repo's `preemptly.*`).

Full handoff: `.claude/sessions/2026-08-31-git-repo-setup-and-consolidation.md`.
