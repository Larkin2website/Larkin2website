---
name: CLI config module context
description: CLI-transpiled configuration files may not execute as native Node ESM.
---

Do not assume that a pinned modern Node version makes `import.meta.dirname`
available inside every tool-loaded configuration file. Drizzle Kit's config
loader can transpile the configuration into a CommonJS context.

**Why:** Offline schema generation failed with an undefined path when a config
used `import.meta.dirname`, despite running on Node 24.

**How to apply:** Use the tool-supported configuration module context for path
resolution (CommonJS `__dirname` for this Drizzle config). Do not rewrite native
ESM/Vite modules that already support `import.meta`.

Drizzle Kit's migration output directory must be relative to its working
directory when reading existing snapshots.

**Why:** Its snapshot loader prepends `./` to an absolute output path, so the
first baseline can generate successfully while the next diff fails to find it.

**How to apply:** Keep `out: "./migrations"` and execute generation through the
filtered database package command. Keep schema resolution anchored to the
configuration's supported module context.
