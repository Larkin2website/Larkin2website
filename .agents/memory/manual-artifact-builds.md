---
name: Manual artifact builds
description: Why command-line builds of routed artifacts can fail despite a healthy managed workflow
---

When building a routed artifact manually from the shell, do not assume it receives the same service environment that the managed workflow injects. Supply the expected port and base path for an isolated build check; use the configured managed workflow for the live preview.

**Why:** A shell build failed on one missing service setting, then failed on the next setting after only the first was supplied, even though the managed website preview was healthy. That is an execution-context difference, not an application defect.

**How to apply:** If a manual artifact build reports a missing runtime routing or service variable, inspect its configuration and supply the required development values together for the check. Do not create a replacement workflow or change the artifact’s routing to work around the shell environment.