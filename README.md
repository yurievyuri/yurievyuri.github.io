<h1 align="center">Yura Yurev</h1>
<p align="center"><strong>Senior PHP &amp; JavaScript Developer</strong> · London, SE22 · 10+ years</p>
<p align="center">
  <a href="https://yurev.uk">yurev.uk</a> ·
  <a href="mailto:yurievyuri@live.com">yurievyuri@live.com</a> ·
  <a href="https://bit.ly/4yxdtE5">LinkedIn</a> ·
  <a href="./cv_yura_yurev_2026.pdf">Download CV (PDF)</a>
</p>

<p align="center"><em>This repository is my business card — an interactive terminal you can actually type into.</em><br>
👉 <a href="https://yurev.uk"><strong>Open the live terminal</strong></a> and run <code>help</code>, or read on.</p>

---

## Profile

Senior full-stack developer with 10+ years designing and building business-critical
internal web applications — CRM platforms, dashboards, back-office systems and third-party
integrations for organisations across the **US, UAE and UK**. Fluent across the modern
stack — PHP (Symfony), JavaScript (React/Next.js), AWS and CI/CD — with a strong track
record modernising legacy applications and turning complex, evolving requirements into
scalable, reliable, maintainable software. A background spanning both business and
engineering means I translate business needs into robust technical solutions that deliver
measurable value.

## Skills

| Area | Tools |
|------|-------|
| **Languages** | PHP · Go · JavaScript (ES6+) · TypeScript |
| **Frameworks** | Symfony · Laravel · Bitrix24 · React · Next.js |
| **Cloud / AWS** | EC2 · RDS · SQS · EventBridge · CloudWatch · Lambda · Step Functions |
| **DevOps** | Docker · Linux · Nginx · GitLab CI/CD · Git/GitFlow · Asterisk/PBX |
| **Data** | MySQL · PostgreSQL · Redis · MSSQL |
| **Testing** | PHPUnit · X-Debug · Playwright (e2e) |
| **Practices** | OOP · SOLID · DDD · TDD · CI/CD · REST API · Blue/Green · Agile/Scrum · Legacy modernisation |

## Selected experience

- **Telephony & integrations** — rebuilt company telephony end-to-end (Asterisk + PBX) into
  a unified in-house app; integrated WhatsApp Business via the Twilio API with template &
  24-hour-window compliance; two-way CRM↔Ontraport sync.
- **Architecture & modernisation** — established Symfony as the CRM core (DI, queues,
  service layer), replacing procedural code with tested modules; built a custom job queue
  in pure PHP on Redis plus a task-queue + RPA module.
- **Cloud & DevOps** — migrated core systems to AWS (EC2, RDS, SQS, EventBridge, CloudWatch)
  with zero-downtime blue/green releases on GitLab CI; Go service on AWS Lambda automating
  cross-system file transfers.
- **Frontend & leadership** — built a standalone React/Next.js dashboard (TypeScript, MUI)
  with real-time KPIs used across a 500-person company; led a team of 4 developers and
  designers.

## Education

- **MBA** — Moscow International Higher Business School (MIRBIS)
- **BA**, Public & Business Administration — RANEPA
- **BSc**, Economics — Saratov Socio-Economic Institute (Plekhanov)
- Project Management with Oracle Primavera P6

<br>

---

# About this project

The card above is a self-contained single-page app: an interactive, terminal-style
business card. Type commands (or click the menu) to explore experience, skills, projects
and contacts, or download the CV as a PDF.

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

| Type  | Name  | Value                       |
|-------|-------|-----------------------------|
| A     | `@`   | `185.199.108.153`           |
| A     | `@`   | `185.199.109.153`           |
| A     | `@`   | `185.199.110.153`           |
| A     | `@`   | `185.199.111.153`           |
| AAAA  | `@`   | `2606:50c0:8000::153`       |
| AAAA  | `@`   | `2606:50c0:8001::153`       |
| AAAA  | `@`   | `2606:50c0:8002::153`       |
| AAAA  | `@`   | `2606:50c0:8003::153`       |
| CNAME | `www` | `yurievyuri.github.io.`     |

Then in the repo: **Settings → Pages → Custom domain** → `yurev.uk`, and enable
**Enforce HTTPS** once the certificate is issued (a few minutes to an hour after DNS
propagates).

## Browser support

Modern browsers and their older versions (roughly 2016+). **IE11 is not supported** —
React 18 (`createRoot`) dropped IE support; the ES5 build widens compatibility but cannot
bring React 18 back to IE11.

## License

[MIT](LICENSE) © Yura Yurev
