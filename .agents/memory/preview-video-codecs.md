---
name: Preview video codecs
description: Browser codec support can cause false-positive media playback failures despite healthy serving.
---

Check explicit codec support when a video stays at readyState 0 with networkState 3 despite a successful media response.

**Why:** The Linux Chrome preview test browser reported no H.264 High Profile support, although it returned “maybe” for plain video/mp4. The original clip served correctly with both HTTP 200 and byte-range 206, but could not decode. VP9 was supported.

**How to apply:** Check canPlayType with the actual codec rather than the container MIME alone. Keep the original source, with an alternate encoding of the same footage when needed, and verify actual currentTime advancement. Network state 3 means NO_SOURCE, not LOADING.