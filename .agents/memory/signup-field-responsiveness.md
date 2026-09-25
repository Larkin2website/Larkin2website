---
name: Signup field responsiveness
description: Why HETV signup field stacking should account for the form’s inner width and viewport.
---

The HETV home signup’s paired fields should remain side by side when there is usable room on wide screens, but stack on tablets, phones, and narrow desktop columns. A container query measures the container’s content box, excluding its padding; do not pick its breakpoint from the visible outer card width alone.

**Why:** A threshold chosen from the outer card width caused the fields to stack even at a wide desktop viewport. The card’s inner width was notably smaller due to its padding.

**How to apply:** When revisiting responsive form layout, inspect both a phone and a desktop viewport after adjusting thresholds. Use a viewport condition for tablet/mobile and a container condition for narrow columns when both matter.