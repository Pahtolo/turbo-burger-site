# Deploying the Turbo Burger Website

The site is a static bundle: `index.html`, `styles.css`, `main.js`, `arm-scene.js`, and assets in `assets/`. There is no build step. GitHub Pages serves the files directly.

## One-time setup (5 minutes)

1. **Push the static site files to the repo.** Add the HTML, CSS, JavaScript, and `assets/` folder at the repo root on the `main` branch:

   ```bash
   git add index.html styles.css main.js arm-scene.js assets README.md DEPLOY.md
   git commit -m "Add project website and README"
   git push origin main
   ```

2. **Enable GitHub Pages.**
   - Go to `https://github.com/Pahtolo/turbo-burger-site`
   - Click **Settings** → **Pages** (left sidebar)
   - Under **Source**, select `Deploy from a branch`
   - Under **Branch**, pick `main` and folder `/ (root)`
   - Click **Save**

3. **Wait ~1 minute.** GitHub Pages will build and publish the site. The URL will appear at the top of the Settings → Pages panel, typically:

   ```
   https://pahtolo.github.io/turbo-burger-site/
   ```

4. **Link it from the README.** Once the site is live, update the `[→ Project website]` link at the top of `README.md` if the URL is different from the default.

## Making changes

Any time you edit the static files and push to `main`, GitHub Pages automatically republishes:

```bash
# edit index.html, styles.css, main.js, arm-scene.js, or assets/*
git add index.html styles.css main.js arm-scene.js assets
git commit -m "Update site content"
git push origin main
# ~30 seconds later the site is live
```

## Alternatives

### Option A — `/docs` folder instead of root

If you'd rather not have the site files at the repo root:

1. Move `index.html`, `styles.css`, `main.js`, `arm-scene.js`, and `assets/` into a `/docs` folder.
2. In **Settings → Pages**, pick folder `/docs` instead of `/ (root)`.

### Option B — `gh-pages` branch

Classic GitHub Pages pattern. Push the static site bundle to a `gh-pages` branch and set the source to that branch. Good if you want to keep the root branch free of web files.

## Custom domain (optional)

To use a custom domain (for example `turboburger.com`):

1. Add a `CNAME` file at the site root with the domain name inside.
2. Point the domain's DNS at GitHub Pages (instructions: [docs.github.com → custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).

Not needed for the senior project — the default `*.github.io` URL is fine.

## Adding media later

The demo section in `index.html` currently has placeholder tiles. To replace a tile with a real screenshot or GIF:

1. Drop the file into an `/assets/` folder at the repo root.
2. In `index.html`, find the relevant `<div class="tile">` block and replace the placeholder SVG + text with:

   ```html
   <img src="assets/workcell-overview.png" alt="Workcell overview" />
   ```

3. Commit and push — the site updates on the next build.

For video, use `<video controls src="assets/full-cycle.mp4"></video>` or embed a YouTube iframe.

## Troubleshooting

- **Site shows 404.** Give it 60–90 seconds; the first deploy can be slow. Confirm **Settings → Pages** shows a green check and the expected URL.
- **Styles look broken.** `index.html` uses Google Fonts over HTTPS. If your network blocks them, the system font fallback still reads cleanly.
- **3D scene is blank.** Confirm `assets/ur5e.glb` is present and that `arm-scene.js` is served from the same folder as `index.html`.
- **Content changes don't appear.** Hard-refresh (Cmd/Ctrl+Shift+R) or wait a minute for CDN caches to invalidate.
