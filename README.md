# WV DUNA — wvduna.com (draft)

A static marketing and registration site for the West Virginia DUNA (Decentralized
Unincorporated Nonprofit Association). Built as an initial DRAFT, matching the WV DUNA Day
brand: deep indigo ground, gold Cooper-style slab display, accent-bordered cards, and the
West Virginia / mountains / concentric-circles motifs.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home: hero, stat boxes, Featured DUNAs, DUNA of the Week, three build paths |
| `dunas.html` | DUNA registry directory and use-case patterns |
| `founders.html` | For founders & investors: Build/Raise/Bank Here, SAFEs + STAMPs |
| `sponsors.html` | Co-sponsors and the economic-development mission |
| `learn-more.html` | DAO/DUNA primer, the WV DUNA Act, WY/AL/WV comparison, FAQ |
| `start.html` | Register a DUNA (draft preview form) |
| `login.html` | Login / sign up (draft preview form) |
| `assets/` | `styles.css`, `main.js`, and decorative SVGs |

No build step. It is plain HTML/CSS/JS, so it deploys to Vercel as-is.

## Run locally

```bash
cd wvduna-site
python3 -m http.server 8080
# open http://localhost:8080
```

## Push to GitHub (org: mmosh-pit)

Run from inside `wvduna-site/` (git is already initialized with one commit):

```bash
# create the repo on GitHub, then:
git remote add origin git@github.com:mmosh-pit/wvduna-web.git
git branch -M main
git push -u origin main
```

If you use the GitHub CLI:

```bash
gh repo create mmosh-pit/wvduna-web --private --source=. --remote=origin --push
```

## Deploy to Vercel

```bash
npm i -g vercel
cd wvduna-site
vercel            # first run links/creates the project
vercel --prod     # promote to production
```

Or import `mmosh-pit/wvduna-web` in the Vercel dashboard. Framework preset: **Other**.
Root directory: `wvduna-site` (or repo root if you push only this folder). No build command,
no output directory override needed. Point `wvduna.com` at the project in Vercel → Settings → Domains.

## Notes

- This is a DRAFT. Stat counts, featured DUNAs, and treasury figures are illustrative samples.
- Forms are front-end only previews; no backend or auth is wired up.
- Fonts are self-hosted from `assets/fonts/` (Goudy Heavyface display + Avenir body), declared in `assets/colors_and_type.css`.
- The West Virginia outline in `assets/wv.svg` is a stylized approximation; swap in an exact
  outline when one is available.
