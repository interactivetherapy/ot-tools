# ITS OT Tools — Interactive Therapy Solutions

One installable, offline web app for pediatric occupational therapy:

- Home: choose **Screener** or **Evaluation**
- `/screener/`: OT Developmental Screener
- `/eval/`: OT Evaluation

Install it once from the home page (`/ot-tools/`). The Home / Screener / Evaluation switcher at the top of each tool saves first and then switches.

These are static files only. There's no server code, no analytics, and no outside requests (a Content-Security-Policy limits everything to this site). Anything entered is saved only in the browser on that device (localStorage) and is never uploaded. Pages are marked noindex.

One service worker (`sw.js`) at the app root caches the app for offline use. The old per-tool workers (`screener/service-worker.js`, `eval/service-worker.js`) are retired: they remove only their own old caches and unregister themselves. Saved data is never touched.
