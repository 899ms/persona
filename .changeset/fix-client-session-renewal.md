---
"@runtypelabs/persona": patch
---

Renew expiring client-token sessions before sending chat messages and retry one explicit expired-session rejection. Preserve the visitor-owned conversation and message IDs, and stop recovery when the turn is cancelled or superseded.
