---
name: Animated hero layout
description: Keep the video crop and document flow coordinated when changing the public hero.
---

The shrinking video must release its reserved layout space as it shrinks. Keep its visual crop, sticky stage and scroll-completion point derived from the same geometry rather than compensating with offsets on a later content section.

**Why:** Moving signup immediately after the video exposed a large blank region that an older content overlap had concealed. Section-specific negative margins make the animation depend on page order.

**How to apply:** When adjusting the hero or moving the following section, check the visible video bottom against the next section throughout the scroll, including reverse scrolling, resize and reduced motion. Preserve the original footage and animation.

For browser measurements, verify the actual scroll position and animation progress after scrolling settles. A requested endpoint is not the actual endpoint during CSS smooth scrolling, and a shrinking sticky stage must be measured at its final height, not the viewport height.