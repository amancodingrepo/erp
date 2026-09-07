# SkillGod project memory

> Auto-managed digest for Aider and other CLIs that `read:` this file. Your notes above the markers are safe.

<!-- SKILLGOD:START v1.1 -->
# SkillGod Project Memory (auto-generated — do not edit; updated 2026-09-06 14:59)

# SkillGod Active

Before any **non-trivial coding** task (implement, fix, refactor, debug, wire integrations):
1. Prefer shell: `sg inject "<task>"` (stdout only; exit 0 = success)
2. Or MCP `sg_inject_context` with the user task — if it stalls >5s, cancel and use CLI/digests
3. Digests in this block are the insurance policy when tools are skipped

After completing **meaningful** work (decisions, architecture, non-obvious fixes):
1. Shell: `sg capture --task "..." --output "..."`  **or**
2. MCP `sg_capture_turn` with task + short summary
3. Or `sg remember "decision: ..."`

**Also:** `sg find "<task>"` · `sg timeline` · `sg events --last 20` · `sg doctor`

## SkillGod health
- version: 1.0.1+794a995
- project_id: `visha-90fc8883`
- last inject: never (-)
- last capture: never (-)
- markers: SKILLGOD:START v1.1

## Project memory

## Decisions
- {"filePath": "c:\\Users\\visha\\simbolonew\\apps\\admin\\src\\app\\packages\\page.tsx", "oldString": " {\n key: \"actions\",\n header: \"Actions\",\n render: (item: PackageData) =>
- {"filePath": "c:\\Users\\visha\\simbolonew\\apps\\admin\\src\\app\\packages\\page.tsx", "oldString": " const handleDelete = async (id: string) => {\n if (!confirm(\"Are you sure yo
- {"filePath": "c:\\Users\\visha\\simbolonew\\apps\\landing\\src\\lib\\api.ts", "oldString": "async function fetchPublicApi<T>(endpoint: string, fallback: T, revalidateSeconds: numbe
- {"filePath": "c:\\Users\\visha\\simbolonew\\backend\\src\\auth\\auth.service.spec.ts", "oldString": " if (!('accessToken' in result)) throw new Error('Expected tokens, got an MFA c
- {"filePath": "c:\\Users\\visha\\simbolonew\\apps\\admin\\src\\services\\api.ts", "oldString": " user: {\n email: string;\n firstName?: string;\n lastName?: string;\n role?: string;
- {"filePath": "c:\\Users\\visha\\simbolonew\\apps\\admin\\src\\services\\api.ts", "oldString": " roles: {", "newString": " chat: {\n getSupportConversations: async (page = 1, limit 
- {"filePath": "c:\\Users\\visha\\simbolonew\\apps\\landing\\src\\components\\auth\\auth-modals.tsx", "oldString": " if (mode === \"forgot\" || mode === \"forgot-sent\") {", "newStri

## Notes

_Authoritative project history captured by SkillGod. Treat the decisions above as established context for this project._
<!-- SKILLGOD:END -->
