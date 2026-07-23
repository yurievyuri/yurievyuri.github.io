# Terminal Business Card

An interactive terminal-style business card / CV for **Yura Yurev** — Senior PHP &
JavaScript Developer. Type commands (or click the menu) to explore experience, skills,
projects and contacts, or download the CV as a PDF.

🔗 **Live:** [yurev.uk](https://yurev.uk) · [yurievyuri.github.io](https://yurievyuri.github.io)

## Features

- ⌨️ Real terminal UX — command input, boot sequence, blinking cursor
- 🧭 Commands: `about`, `skills`, `experience`, `projects`, `education`, `contacts`, `cv`, `help`, `home`, `clear`
- 🔢 Shortcuts — `0` home, `1`–`8` run menu items, `↑`/`↓` history, `Tab` autocomplete
- 📄 One-command CV download (PDF)
- 🖥️ `<noscript>` fallback — a static card shown when JavaScript is disabled
- ♻️ ES5 build with polyfills for broad browser support

## Tech stack

- **UI:** React 18 (loaded as a UMD global, no JSX — `React.createElement`)
- **Build:** Rollup + Babel (`@babel/preset-env`) + core-js
- **Output:** minified & obfuscated ES5 bundle

## Project structure

```
index.html                 Shell: fonts, React UMD, styles, <noscript> fallback, bundle
styles.css                 App + fallback styles
src/app.js                 Source of truth — edit here
dist/app.js                Built bundle (ES5 + polyfills, minified, obfuscated) — generated
cv_yura_yurev_2026.pdf      CV served by the `cv` command
CNAME                      Custom domain for GitHub Pages (yurev.uk)
.nojekyll                  Serve files as-is (disable Jekyll processing)
rollup.config.mjs          Build pipeline
babel.config.json          ES5 transpile + core-js usage
```

## Getting started

```bash
npm install        # install build tooling (once)
npm run build      # src/app.js -> dist/app.js
npm run watch      # rebuild on change
```

Serve the static files with any HTTP server:

```bash
python3 -m http.server 8731
# open http://localhost:8731/
```

> **Note:** after editing `src/app.js`, always rebuild — `index.html` loads `dist/app.js`.

## Build pipeline

`npm run build` runs Rollup over `src/app.js`:

1. **`@babel/preset-env`** — transpiles to ES5 and injects only the core-js polyfills
   actually used (`useBuiltIns: "usage"`).
2. **`rollup-plugin-obfuscator`** — obfuscates **our code only** (`src/**`): base64 string
   array + identifier renaming. core-js is left untouched; heavy transforms
   (control-flow flattening, dead-code injection) are off to keep the boot animation fast.
3. **`@rollup/plugin-terser`** — minifies the final bundle (`ecma: 5`).

React and ReactDOM stay external — they are provided as UMD globals in `index.html`.

## Deployment (GitHub Pages)

The site is served from the default branch root of the `yurievyuri.github.io` repo.
`dist/` is committed so no build runs on GitHub. The custom domain is configured via the
`CNAME` file.

### Custom domain (`yurev.uk`) — DNS on Hetzner

Add these records in the Hetzner DNS console for the `yurev.uk` zone:

| Type  | Name  | Value                                                        |
|-------|-------|--------------------------------------------------------------|
| A     | `@`   | `185.199.108.153`                                            |
| A     | `@`   | `185.199.109.153`                                            |
| A     | `@`   | `185.199.110.153`                                            |
| A     | `@`   | `185.199.111.153`                                            |
| AAAA  | `@`   | `2606:50c0:8000::153`                                        |
| AAAA  | `@`   | `2606:50c0:8001::153`                                        |
| AAAA  | `@`   | `2606:50c0:8002::153`                                        |
| AAAA  | `@`   | `2606:50c0:8003::153`                                        |
| CNAME | `www` | `yurievyuri.github.io.`                                      |

Then in the repo: **Settings → Pages → Custom domain** → `yurev.uk`, and enable
**Enforce HTTPS** once the certificate is issued (may take a few minutes to an hour).

## Browser support

Modern browsers and their older versions (roughly 2016+). **IE11 is not supported** —
React 18 (`createRoot`) dropped IE support; the ES5 build widens compatibility but cannot
bring React 18 back to IE11.

## License

[MIT](LICENSE) © Yura Yurev
