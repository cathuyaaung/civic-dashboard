# Deployment plan (not yet set up)

This app is a static site (no backend/database), so hosting is lightweight
and mostly free. This doc captures the plan for when there's real content
worth deploying — not needed while it's still a placeholder page.

## Hosting — pick one

| Option | Why it fits | Notes |
| --- | --- | --- |
| **GitHub Pages** | Free, lives right next to the repo | Simplest CI, but custom domain setup is more manual; no server-side anything |
| **Netlify** | Free tier, simple GitHub integration, auto-deploys on push, preview URLs per PR | Recommended — least friction for a solo project |
| **Vercel** | Same idea as Netlify, strong Angular support, free tier | Equally good; pick whichever UI you prefer |
| **Cloudflare Pages** | Free, fast, pairs well if the domain is also bought through Cloudflare | Good if you want one account for domain + hosting |

**Recommendation: Netlify or Vercel.** Connect the GitHub repo once, it runs
`ng build` and deploys automatically on every push to `main`. Free
`*.netlify.app` / `*.vercel.app` URL immediately, zero config.

## Domain (optional)

Not required — the free subdomain is fine for a portfolio piece and can be
linked from a resume/GitHub profile as-is.

If a custom domain is wanted later:
- **Cloudflare Registrar** — sold at cost, no markup
- **Namecheap** — good value, typically $10–15/year for `.com`, more for `.ca`

Either way: point the domain at Netlify/Vercel/Pages via a couple of DNS
records — each provider has a short guide for this.

## When to actually do this

Hold off until the three pillars have real content. Once there's something
worth looking at, hooking up Netlify takes about 5 minutes (sign in with
GitHub, pick the repo, click deploy), and it's useful at that point to watch
it auto-update as the app is built rather than set it up for an empty shell.
