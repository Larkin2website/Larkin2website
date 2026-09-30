---
name: Responsive CSS assertions
description: Avoid false failures when testing responsive layout and theme contrast by inspecting raw CSS
---

When a static test checks CSS source instead of computed browser styles, compare base rules and media-query overrides separately. Resolve theme color variables before feeding them to numeric contrast checks.

**Why:** A layout check merged a narrow-screen override into the desktop rule, then a contrast assertion compared an unresolved CSS variable as though it were a hex color. Both looked like visual regressions despite the rendered page being correct.

**How to apply:** For responsive source-level checks, assert the first/base declaration and each relevant breakpoint independently. For contrast, substitute token values or measure browser-computed colors. Prefer a browser check when verifying sticky or scroll-dependent behavior.