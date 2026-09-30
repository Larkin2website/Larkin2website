---
name: Animated menu focus timing
description: Focus behavior when the public site's mobile navigation opens with keyboard activation
---

When opening an animated panel that was hidden and inert, do not assume an effect or a single animation frame can focus its first control. Wait until the panel's control computes as visible, then focus it; restore the trigger on close.

**Why:** In the Chromium preview, opening the public mobile menu with Enter changed its DOM state immediately but its close button computed as hidden during the entrance transition. Immediate focus, a requestAnimationFrame, and a zero-delay timer left keyboard focus on the opener despite the menu appearing open. A browser keyboard check caught this; a DOM-only component test did not.

**How to apply:** For changes to animated menus or dialogs, test opening via both Enter and pointer in a real browser, then check focus after the transition starts, Tab trapping, Escape, and focus restoration.