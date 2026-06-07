# Agentic task research loop

## What
A scheduled Claude loop that reads my `today` + `upcoming` tasks (via the Hush MCP),
researches each one using the tools available (email, web), and stages the results so
each task is "ready for me to approve" — without ever contacting anyone.

## Detail
- Pull tasks from `today` + `upcoming` (Hush MCP `list_today` / `list_tasks`).
- For each task, research based on its title/description:
  - Search my Gmail (Gmail MCP) to figure out status / where we left off.
  - Find phone numbers, links, facts via web search.
  - **Draft** emails where useful — as drafts only.
- Write findings back onto the task (description / notes / subtasks) so when I open it,
  the legwork is done and I just review/approve/send.
- **Multi-step tasks:** break a big task into an ordered plan of sub-steps and surface
  it for approval. Example: "look into mom's hospital experience → lawsuit?" becomes
  (1) research medical-malpractice law, (2) find malpractice lawyers in the area,
  (3) RI Medical Board complaint process, etc.
- **HARD RULE (matches how the loops already operate):** never send an email, message,
  or place a call autonomously. Research + draft + stage only. I approve and send.

## Definition of done
TBD after discussion — this is large. Likely a first slice = "email-status research on
today/upcoming tasks, written back as notes on each task," then expand to drafting and
multi-step decomposition.

## Notes
- Needs Gmail + web tools available in the run context.
- Builds on the loop infrastructure already in `.claude/loops/`.
- A first slice writes into existing task fields (no schema migration expected); deeper
  versions (real subtasks) may need a data change — flag if so.
