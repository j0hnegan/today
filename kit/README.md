# Build-loop kit — recreate this system elsewhere

This folder packages the autonomous build-loop (the `/backlog` + `/standup` skills, the
builder + steward loop playbooks, the `backlog/` structure, and the scheduled routines)
so you can stand it up in another project. **No plugin to install.**

Two prompts, pick by situation:

- **`recreate-local.md`** — run inside a Claude session in another project **on this
  machine** (where the Hush repo is also checked out). It reads the kit files straight
  from the Hush repo and recreates them in the target project. Fastest; uses real files.

- **`recreate-from-scratch.md`** — run on a machine that has **no access to the Hush
  repo** (e.g. your work laptop). It's fully self-contained: it describes the system's
  intention, structure, and logic, and the exact files to create, so Claude rebuilds the
  whole thing from the description. Nothing is copied.

Both finish by parameterizing the project-specific bits (CI commands, deploy/preview
provider, notification channel) and offering to create the two scheduled routines.
