# 🍖 Roast Dinner Planner

Plan and cook the perfect roast dinner with step-by-step guided timing.

> **Status:** In development

## What is this?

A mobile-first web app that guides you through cooking a roast dinner — from choosing your meal, to a scaled shopping list, to a timed cooking guide with notifications. Designed to be **idiot-proof** for anyone, even if you've never cooked a roast before.

## Features (v1)

- 🥩 Choose from chicken, beef, lamb, or pork (multiple cuts each)
- 🥕 Select sides with cooking method variants (steamed, roasted, etc.)
- 🛒 Auto-scaled shopping list grouped by supermarket aisle
- ⏱️ Step-by-step cooking timeline calculated from your serving time
- 🔔 Audio + browser notifications when each step is due
- 📱 Mobile-first PWA — works offline once loaded
- 🔗 Shareable plan URLs via Cloudflare KV
- ♿ WCAG 2.1 AA accessible

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **shadcn/ui** (Tailwind CSS v4)
- **Cloudflare Pages** + **Workers** + **KV**
- **vite-plugin-pwa** for offline support

## Development

```bash
npm install
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run validate   # Validate recipe data against JSON Schema
```

## Recipe Data

All recipe data lives in `data/` as human-readable JSON files validated by a JSON Schema. See `data/recipe.schema.json` for the format. Contributions welcome — just add a JSON file and run `npm run validate`.

## License

TBD
