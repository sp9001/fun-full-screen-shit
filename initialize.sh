#!/bin/bash

# =============================================================================
# initialize.sh — Project initializer for UserSpice sites
# Asks what the site is for, then launches Claude Code with a
# fully-assembled context prompt based on your CLAUDE.md conventions.
# =============================================================================

echo ""
echo "=============================================="
echo "  🚀  UserSpice Project Initializer"
echo "=============================================="
echo ""
echo "Describe the purpose of this site."
echo "(Who it's for, what it does, key features, tone/style — as much detail as you like.)"
echo "Press ENTER twice when done."
echo ""

PURPOSE=""
PREV_EMPTY=false
while IFS= read -r line; do
    if [[ -z "$line" ]]; then
        if $PREV_EMPTY; then break; fi
        PREV_EMPTY=true
    else
        PREV_EMPTY=false
    fi
    PURPOSE="${PURPOSE}${line}\n"
done

# --- Assemble the prompt ------------------------------------------------------

PROMPT="You are starting a new UserSpice project. Here is the project brief:

$(echo -e "$PURPOSE")

---

Using the conventions defined in CLAUDE.md, please do the following to kick off this project:

1. ORIENT — Summarize back the project purpose in 2-3 sentences to confirm you understand it, then outline which CLAUDE.md conventions are most relevant to this project.

2. FOLDER STRUCTURE — Propose the initial folder and file structure for this project (assets/css, assets/js, db/, api/webhook/, etc.).

3. TEMPLATE SETUP — Outline the steps to copy the customizer template to usersc/templates/ and what files to update first (navigation.php, header.php, users/head.php).

4. DATABASE PATCH — Create the initial db/patch.php file bootstrapped with UserSpice DB conventions, including any tables mentioned in the brief above, with standard timestamp and soft-delete columns.

5. AGENT PLAN — Using the two-agent orchestration model (UI Designer + Back-End Engineer), propose what each agent should tackle first for this specific project.

6. QUESTIONS — Ask me anything you need clarified before we start writing code.

Do not write any code yet beyond the db/patch.php skeleton — I want to review and confirm the plan first."

# --- Launch -------------------------------------------------------------------

echo ""
echo "Launching Claude Code with your project brief..."
echo ""

claude "$PROMPT"
