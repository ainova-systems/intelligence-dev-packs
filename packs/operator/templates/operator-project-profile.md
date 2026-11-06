---
description: Project profile keys the operator pack's skills read, with their defaults
---

# Operator profile keys (schema)

> The one definition of every project profile key the operator pack reads. A project adds the keys
> it sets to its project profile - the always-on rule its other skills read their profile from
> (with the core pack installed, its `dev-project-profile.md`); a key left out takes the default
> below. Keep entries as plain `key: value` lines so both humans and agents parse them reliably.

## Operator

- operator_config: none              <!-- the operator configuration JSON: milestone and label roles, owner author associations, slots, QA admission, CI workflows, markers and send-back routes; schema and defaults operator-contract > references/operator-config.md, example references/operator-config.example.json -->
- operator_discover: none            <!-- the project's discovery command: --standalone names the next skill per PR, --request <n> the request for one PR, --steps-digest <n>, --body-digest <n>, --owner-input <n>, and its runtime pass; contract operator-contract > references/discovery-contract.md -->
- forge_cli: none                    <!-- the forge contract command every code-host call goes through (operator-contract > references/forge-contract.md); on GitHub: OPERATOR_CONFIG=<operator_config> node <operator pack>/skills/operator-contract/scripts/forge-github.mjs -->
- qa_status: none                    <!-- how to read whether a QA deployment serves a head, and its address; none = no QA environment -->
- qa_feedback: none                  <!-- command listing QA tickets for a PR; none = no tickets -->
- qa_feedback_status: none           <!-- command moving one QA ticket to in progress or completed with a note for its submitter; none = tickets stay as their submitter left them -->
- merge_gates: none                  <!-- project rules that block a merge besides checks and factors -->
- clarify_priority: none             <!-- the business priority operator-clarify weighs among discovery's top candidates -->
- clarify_branch_prefix: docs/       <!-- branch prefix for a clarification pull request, which changes documents only -->
- direct_lane: **/*.md               <!-- comma-separated path globs of the documents that need no pull request: operator-intake and operator-clarify commit queue records matching them straight to the integration branch, and operator-clarify merges a clarification pull request only while every path it changes matches; unset = every Markdown file (**/*.md) -->
- flow_plan: none                    <!-- the skill that writes a feature-sized plan; none = the plan goes on the queue item -->
- judge_runner: none                 <!-- where review_skill and verify_skill run: none = in the session | <skill> that runs them read-only in another engine -->

## Delegated steps

> The skill each step runs (operator-contract > Delegated steps states each one's input, output and
> what a replacement must do). Unset, a key names the core pack's skill; a project without core
> points every key it uses at its own equivalent.

- commit_skill: none                 <!-- commit and push; none = git-commit-push -->
- open_pr_skill: none                <!-- open a pull request (operator-intake, operator-clarify); none = git-open-pr -->
- review_skill: none                 <!-- the review stage; none = git-review-pr -->
- verify_skill: none                 <!-- the verification stage; none = git-verify-pr -->
- threads_skill: none                <!-- answer and resolve review threads; none = the Threads procedure of git-complete-pr -->
- outcome_skill: none                <!-- write a run's terminal state label; none = git-complete-pr -->
- merge_skill: none                  <!-- the merge behind its guards; none = git-merge-pr -->
- sync_base_skill: none              <!-- return a slot to the integration branch; none = git-sync-base -->

## Shared with core

> Keys the core pack's profile schema also defines, with the same default and meaning; they are
> stated here so this pack runs without core.

- integration_branch: none           <!-- the base every pipeline branch starts from and returns to; none = the default branch -->
- branch_prefixes: feature/, bugfix/, hotfix/   <!-- the prefix of a pipeline branch, which also names its slot -->
- update_strategy: merge             <!-- how the integration branch comes into a pull request's branch: merge | rebase -->
- conflict_skill: git-resolve-conflicts   <!-- the skill a conflict with the integration branch goes to -->
- verify_section: Manual Verification     <!-- the verification heading, and the section the steps digest covers -->
- pr_risk_size: off                  <!-- whether the body carries a Risk/Size line to recompute: off | on -->
- pr_success_factors: ai:verified, ai:reviewed   <!-- the factors accept-ready requires fresh at head -->
- merge_method: squash               <!-- how merge_skill merges: squash | merge | rebase -->
- flow_intake: auto                  <!-- the capture step operator-plan runs: auto = the project's intake skill, else the core pack's dev-deliver Phase A interview | <skill name> -->
- flow_implement: auto               <!-- the implementation: auto = the project's own execution skill when one is installed, else one subagent working to the plan's slices | <skill name> -->
- flow_queue: none                   <!-- where the work queue's pick order, eligibility, grouping and leave-the-queue rules are written -->
