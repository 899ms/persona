---
"@runtypelabs/persona": patch
---

Keep the standalone typing indicator visible while tool calls or reasoning run when `features.showToolCalls` / `features.showReasoning` is `false`. Hidden rows no longer count as the assistant "already responding", so the transcript no longer goes blank for the whole tool phase.
