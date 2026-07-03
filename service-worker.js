# BP Log — installable PWA

A blood pressure + pulse tracker for Tep and Jeng. No backend, no build step,
no dependency on Claude's artifact storage. All data lives in your phone's
browser storage (`localStorage`), and the app installs to your home screen
with offline support via a service worker.

## Why this exists

The Claude artifact version depends on Anthropic's artifact storage backend,
which had an outage. This version has no such dependency — it's a fully
standalone static site you host and control.

## Files

```
bp-pwa/
  index.html         the app shell
  app.js              all app logic (vanilla JS, no framework)
  manifest.json        PWA manifest (name, icons, install behavior)
  service-worker.js    offline caching
  icons/                app icons (192px, 512px)
```

## Important: service workers require HTTPS (or localhost)

You cannot just double-click `index.html` and get install/offline support —
browsers block service worker registration on the `file://` protocol. You
need to serve it over `http://localhost` (for local testing) or a real
`https://` URL (for installing on your phone). Two easy paths below.

## Option A — GitHub Pages (recommended, since you already use GitHub)

1. Create a new repo, e.g. `bp-log-pwa` (can be private or public — Pages
   works either way on a paid GitHub plan; public repos get Pages free).
2. Push these files to the repo root (or a `/docs` folder — your choice).
3. Repo → **Settings → Pages** → set source to the branch/folder above.
4. GitHub gives you a URL like `https://<username>.github.io/bp-log-pwa/`.
5. Open that URL on your phone → browser menu → **Add to Home Screen** /
   **Install app**. It now behaves like a real installed app: own icon,
   full-screen, works offline after the first load.

```bash
cd bp-pwa
git init
git add .
git commit -m "BP Log PWA v1"
git branch -M main
git remote add origin https://github.com/<you>/bp-log-pwa.git
git push -u origin main
```

## Option B — quick local test before deploying

```bash
cd bp-pwa
python3 -m http.server 8080
```

Then visit `http://localhost:8080` on the same machine. (Service workers
treat `localhost` as secure, so install/offline works here too — but only
on that machine, not from your phone unless it's the same device.)

## Data & storage notes

- Data is stored per **browser/app instance**, under keys `bp:entries:tep` and
  `bp:entries:jeng` — both profiles live together since you're logging both
  from the same phone.
- **⚠️ iOS-specific gotcha, learned the hard way:** when you "Add to Home
  Screen," iOS gives that installed icon its own isolated storage container,
  separate from Safari. **Deleting the home-screen icon deletes that
  container and everything in it.** Reinstalling from the same URL does
  *not* reconnect to the old data — it starts empty. Reopening the *same*
  icon (force-quit + relaunch) is completely safe; it's specifically
  *deleting* the icon that wipes data.
- **Rule: never delete the home-screen icon without backing up first.**
- Use **Backup** (top-right, disk icon) regularly — downloads a JSON file
  with both profiles' full raw data. Use **Restore from backup** (link under
  the Log/Weekly tabs) to reload a JSON backup back into the app — this is
  your recovery path if the icon ever does get deleted, the phone is reset,
  or you move to a new phone.
- **Export** (the other button, doctor-facing) is a separate, human-readable
  HTML report — good for appointments, not meant for restoring data.
- If you outgrow single-device logging later (e.g. want Jeng logging from
  her own phone with shared data), that needs a small backend — similar to
  how SalaryFlow works on your home WiFi. Worth a separate build if that day
  comes.

## Updating the app later

Edit `app.js` / `index.html` / `styles`, bump `CACHE_NAME` in
`service-worker.js` (e.g. `bp-log-v2`) so installed devices pick up the new
version, then redeploy (push to GitHub if using Pages).
