# @vehicleos/ui-tokens

Shared design tokens for VehicleOS surfaces.

## Exports

| Import | Use |
|--------|-----|
| `@vehicleos/ui-tokens/tokens.css` | **Marketing site only** (`apps/marketing` → vehicleos.app) |

**Do not** import `tokens.css` from `apps/web`. The owner app theme is defined in `apps/web/app/globals.css` (Tailwind / shadcn).

## Owner console patterns (implemented in `apps/web`)

These patterns are the reference implementation for **5× category-defining** console UX:

- **Data grid toolbar** — filter, sort, CSV export (`components/data-grid-toolbar.tsx`)
- **Console split** — master–detail layout (`components/console-split.tsx`)
- **Vehicle context bar** — sticky mileage / pending / pipeline (`components/vehicle-context-bar.tsx`)
- **Keyboard** — `j`/`k` rows, `/` command, `⌘1–5` sections

Promote into this package in a follow-up when `packages/ui` gains a TS build step.
