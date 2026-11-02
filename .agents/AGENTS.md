<!-- SKILLGOD:START v1.1 -->
# SkillGod Project Memory (auto-generated — do not edit; updated 2026-10-10 13:03)

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
- last inject: 2026-10-10T13:02:44 (runtime)
- last capture: never (-)
- markers: SKILLGOD:START v1.1

## Project memory

## Decisions
- {"stdout": "// Central API client. The backend URL comes from VITE_API_URL (never hard-coded elsewhere).\r\nexport const API_URL = (import.meta.env.VITE_API_URL || 'http://localhos
- {"stdout": "ok\r\n/* ---------- WAYS TO LEARN ----------\n A pale-lime slab between the curriculum (light) and the live section (dark lens), so the page goes\n light -> pale lime -
- {"stdout": "the_curriculum (1600, 1064) (77, 60, 1518, 1064)\r\nthe_platform (1064, 1600) (234, 194, 899, 1600)\r\nways_to_learn (1064, 1600) (68, 165, 963, 1600)\r\n </div>\n );\n
- {"stdout": " 52 TradeBitPage.jsx\n 70 sections/Agenda.jsx\n 29 sections/Audience.jsx\n 29 sections/Authority.jsx\n 34 sections/Compare.jsx\n 35 sections/Course.jsx\n 40 sections/Ev
- {"stdout": "df725f8 shit head\n261fe13 HosrseShit\n7aa2c30 refactor: UI/UX overhaul and placeholder removal per editorial spec\ncf0cee4 Fix global.css encoding and sync updated SVG
- decision: class flags in Setting academics.classFlags (sendAbsentSms, virtualClassroom). Absent attendance queues MessageLog SMS when the class flag is on. Emergency SMS POST /api/
- decision: fee deposit slips live in Setting fees.depositSlips (cash/cheque/DD, each payment id once, amount summed from live Payment rows). PDF via buildSimplePdf. Store vendor mas

## Notes

_Authoritative project history captured by SkillGod. Treat the decisions above as established context for this project._
<!-- SKILLGOD:END -->
