# Vidhan — Engineering Guidelines

Hackathon codebase. Reliability and consistency matter more than speed. Type everything.

## 1. Type first

- Define types before writing logic. No `any`, no implicit `unknown` leaking into public surfaces.
- `strict` mode is on (`tsconfig.base.json`). Do not weaken it.
- Prefer `z.infer` over hand-written types where a Zod schema already exists — single source of truth.

## 2. Naming conventions

- Types are prefixed with `T`: `TLawyer`, `TLawyerCreate`, `TChatMessage`.
- Zod schemas are prefixed with `Z`: `ZLawyer`, `ZLawyerCreate`.
- Derive the type from the schema: `export type TLawyer = z.infer<typeof ZLawyer>`.

## 3. Shared types

- If a type is used in more than one app/package, it belongs in `packages/schema` (`@vidhan/schema`), not duplicated locally.
- Export it from `packages/schema/src/index.ts`. Import via `@vidhan/schema`.
- App-local types stay in the app's `src` under the feature that owns them.

## 4. Modules

- Write in modules. Think in terms of a module's contract, not the immediate line.
- Before writing a new module, check whether an existing one already does the job — reuse or extend, don't duplicate.

## 5. Feature-based structure

- Organize code by feature, not by file type. A feature owns its types, schemas, logic, and routes together.
- Example: `src/routes/admin/lawyers.ts` groups the lawyer feature's route; its schema lives in `@vidhan/schema`.

## 6. Comments

- Comment sparsely. Never comment what the code already says.
- Comment only anomalies — a workaround, a non-obvious constraint, a reason the code is unnatural.
- Prefer one note at the top of a file for a real gotcha over scattered inline comments.

## 7. Decisions go to docs

- When a non-obvious decision is made, record it in `docs/` as a markdown file.
- At the end of each session, recommend the user create/update their `.md` file in `docs/` capturing the decisions taken.
