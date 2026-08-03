const h = React.createElement;

// Glyph palette the ANSI hero flickers through while it "boots up" — block/box
// characters that match the logo's own alphabet, so the scramble reads as noise
// on the same CRT rather than random ASCII.
const REVEAL_GLYPHS = '█▓▒░╬╫╪╳║═╗╝╔╚╣╠';
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 80s-style "decode" reveal for the ANSI hero: every non-space glyph starts as
// flickering noise and locks into its final character on a staggered, mostly
// random schedule (a faint left-to-right bias) — so the logo wakes up chaotically
// instead of snapping in. Remounts (via a changing `nonce` key) replay it; honours
// prefers-reduced-motion by rendering the final art immediately.
function AsciiReveal({ text }) {
  const scramble = (s) =>
    s.replace(/[^ \n]/g, () => REVEAL_GLYPHS[(Math.random() * REVEAL_GLYPHS.length) | 0]);

  const [grid, setGrid] = React.useState(() =>
    prefersReduced() ? text : scramble(text));

  React.useEffect(() => {
    if (prefersReduced()) { setGrid(text); return; }

    const WINDOW = 1400;                     // total reveal time, ms
    const rows = text.split('\n');
    const cells = [];                        // one entry per non-space glyph
    rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        if (row[c] === ' ') continue;
        const bias = (c / Math.max(1, row.length)) * 0.25;
        const lockAt = WINDOW * Math.min(1, bias + Math.pow(Math.random(), 0.7) * 0.9);
        cells.push({ r, c, ch: row[c], lockAt });
      }
    });

    const start = Date.now();
    const id = setInterval(() => {
      const t = Date.now() - start;
      const out = rows.map((row) => row.split(''));
      let done = true;
      for (const cell of cells) {
        if (t >= cell.lockAt) out[cell.r][cell.c] = cell.ch;
        else { done = false; out[cell.r][cell.c] = REVEAL_GLYPHS[(Math.random() * REVEAL_GLYPHS.length) | 0]; }
      }
      setGrid(out.map((row) => row.join('')).join('\n'));
      if (done) clearInterval(id);
    }, 45);

    return () => clearInterval(id);
  }, [text]);

  return grid;
}

// Splits multi-row ANSI art into its word blocks, cutting on runs of columns
// that are blank in every row (the gap between "YURA" and "YUREV"). Lets the
// hero restack the logo vertically when one line will not fit.
function splitAsciiWords(rows, minGap) {
  const width = Math.max.apply(null, rows.map((r) => r.length));
  const pad = rows.map((r) => r + ' '.repeat(width - r.length));
  const blank = [];
  for (let c = 0; c < width; c++) blank.push(pad.every((r) => r[c] === ' '));

  const words = [];
  let c = 0;
  while (c < width) {
    if (blank[c]) { c++; continue; }
    const start = c;
    let end = c;                              // exclusive end of current word
    while (c < width) {
      if (!blank[c]) { end = ++c; continue; }
      let g = c;
      while (g < width && blank[g]) g++;
      if (g - c >= minGap) break;             // gap wide enough → word ends
      c = g;
    }
    words.push(pad.map((r) => r.slice(start, end)));
  }
  return words;
}

// Width of one monospace glyph, in em. Measured against the live font (falling
// back to the classic 0.6em advance) so the hero can size itself to the exact
// number of columns it has to fit.
let glyphEmCache = null;                      // reset once the webfont swaps in
function glyphWidthEm() {
  if (typeof document === 'undefined') return 0.6;
  if (glyphEmCache !== null) return glyphEmCache;
  const probe = document.createElement('span');
  probe.textContent = '█'.repeat(20);
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;" +
    "font-family:'JetBrains Mono', ui-monospace, monospace;font-size:100px;";
  document.body.appendChild(probe);
  const em = probe.getBoundingClientRect().width / 20 / 100;
  document.body.removeChild(probe);
  glyphEmCache = em > 0.1 && em < 2 ? em : 0.6;
  return glyphEmCache;
}

const HERO_MAX_FONT = 12;                     // px — desktop cap for the logo
const NARROW_QUERY = '(max-width: 640px)';    // phone-sized layout below this

// Watches a media query and re-renders on change. Used instead of CSS media
// queries because the whole UI is styled inline.
function useMedia(query) {
  const get = () => typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(query).matches : false;
  const [matches, setMatches] = React.useState(get);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener('change', on);
    else mq.addListener(on);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', on);
      else mq.removeListener(on);
    };
  }, [query]);
  return matches;
}

// Measures the box it is given and reports the largest font size (capped at
// `max`) at which `cols` monospace columns still fit. Shared by every fixed-
// width piece of terminal art on the page.
function useFitFont(cols, max) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState(max);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const apply = () => {
      const avail = el.clientWidth;
      if (!avail) return;
      const next = Math.min(max, avail / (cols * glyphWidthEm()));
      setSize((prev) => (Math.abs(prev - next) < 0.05 ? prev : next));
    };

    apply();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(apply); ro.observe(el); }
    else window.addEventListener('resize', apply);
    // Re-measure once the webfont swaps in — its advance differs from the
    // system monospace fallback used on the first paint.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { glyphEmCache = null; apply(); });
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', apply);
    };
  }, [cols, max]);

  return [ref, size];
}

// Monospace art (the `about` name card) scaled down to whatever width it gets,
// so it never overflows on a phone.
function FitPre({ text, color, max }) {
  const cols = Math.max.apply(null, text.split('\n').map((r) => r.length));
  const [ref, size] = useFitFont(cols, max);
  return h('div', { ref: ref, style: { width: '100%', overflow: 'hidden' } },
    h('pre', {
      style: {
        color: color, margin: 0, fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1.2, fontSize: size + 'px', whiteSpace: 'pre'
      }
    }, text));
}

// Picks the logo layout that renders largest in the space actually available:
// the single-line version on desktop, the stacked one once the terminal gets
// narrow — then scales the font so it fills that width without overflowing.
function AsciiHero({ variants, nonce }) {
  const wrapRef = React.useRef(null);
  const [fit, setFit] = React.useState({ i: 0, size: HERO_MAX_FONT });

  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const apply = () => {
      const avail = el.clientWidth;
      if (!avail) return;
      const em = glyphWidthEm();
      let best = { i: 0, size: 0 };
      variants.forEach((v, i) => {
        const size = Math.min(HERO_MAX_FONT, avail / (v.cols * em));
        if (size > best.size + 0.01) best = { i: i, size: size };
      });
      setFit((prev) => (prev.i === best.i && Math.abs(prev.size - best.size) < 0.05 ? prev : best));
    };

    apply();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(apply);
      ro.observe(el);
    } else {
      window.addEventListener('resize', apply);
    }
    // Re-measure once the webfont swaps in — its advance differs from the
    // system monospace fallback used on the first paint.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { glyphEmCache = null; apply(); });
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', apply);
    };
  }, [variants]);

  const variant = variants[fit.i] || variants[0];
  return h('div', { ref: wrapRef, style: { width: '100%', overflow: 'hidden' } },
    h('pre', {
      style: {
        color: '#57d9a3', margin: 0, fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1.05, fontSize: fit.size + 'px', whiteSpace: 'pre',
        textShadow: '0 0 18px rgba(87,217,163,.35)'
      }
    }, h(AsciiReveal, { key: 'ascii-' + nonce + '-' + fit.i, text: variant.text })));
}

class TerminalCard extends React.Component {
  state = {
    lines: [], input: '', bootDone: false, history: [], hi: null,
    narrow: typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(NARROW_QUERY).matches : false,
  };

  C = {
    text:'#cdd6e4', dim:'#5c6a7a', green:'#57d9a3', dimg:'#3d7a63',
    cyan:'#5cc8ff', blue:'#5cc8ff', amber:'#f0c674', red:'#ff6b6b',
    border:'#1c2530', chip:'#0e141b', chipH:'#131b24'
  };

  // ANSI-shadow logo shown on the home hero once the loader clears.
  asciiRows = [
    "██╗   ██╗██╗   ██╗██████╗  █████╗     ██╗   ██╗██╗   ██╗██████╗ ███████╗██╗   ██╗",
    "╚██╗ ██╔╝██║   ██║██╔══██╗██╔══██╗    ╚██╗ ██╔╝██║   ██║██╔══██╗██╔════╝██║   ██║",
    " ╚████╔╝ ██║   ██║██████╔╝███████║     ╚████╔╝ ██║   ██║██████╔╝█████╗  ██║   ██║",
    "  ╚██╔╝  ██║   ██║██╔══██╗██╔══██║      ╚██╔╝  ██║   ██║██╔══██╗██╔══╝  ╚██╗ ██╔╝",
    "   ██║   ╚██████╔╝██║  ██║██║  ██║       ██║   ╚██████╔╝██║  ██║███████╗ ╚████╔╝ ",
    "   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝       ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═══╝  ",
  ];

  // Same logo in two layouts — one line for wide terminals, name stacked over
  // surname for narrow (mobile) ones. `cols` is the column count each layout
  // needs, which is what AsciiHero sizes the font against.
  asciiVariants = (() => {
    const words = splitAsciiWords(this.asciiRows, 3);
    const cols = (rows) => Math.max.apply(null, rows.map((r) => r.length));
    const wide = { text: this.asciiRows.join('\n'), cols: cols(this.asciiRows) };
    if (words.length < 2) return [wide];
    const stackedRows = words.reduce((acc, w, i) => acc.concat(i ? [''] : [], w), []);
    return [wide, { text: stackedRows.join('\n'), cols: cols(stackedRows) }];
  })();

  menu = [
    { name:'about',      desc:'who I am' },
    { name:'skills',     desc:'stack & tools' },
    { name:'experience', desc:"what I've built" },
    { name:'projects',   desc:'selected work' },
    { name:'education',  desc:'degrees & courses' },
    { name:'contacts',   desc:'get in touch' },
    { name:'cv',         desc:'download CV' },
    { name:'clear',      desc:'clear the screen' },
  ];

  allCmds = ['help','home','about','skills','experience','projects','education','contacts','cv','menu','ls','whoami','clear','date'];

  // Playful "fetching from all kinds of sources" loaders shown while a section
  // opens. Each line: { tag, text, fast? } — `fast` lines flash by for effect.
  // tags: ok · warn · info · boot · run (see the 'log' renderer for colours).
  flavor = {
    about: [
      { tag:'run',  text:"SELECT bio FROM humans WHERE id = 'yura'", fast:true },
      { tag:'ok',   text:"JOIN business ⋈ engineering ⋈ coffee  → 1 row" },
      { tag:'warn', text:"bio contains trace amounts of legacy PHP" },
      { tag:'ok',   text:"de-normalising 10 years into one paragraph…" },
    ],
    skills: [
      { tag:'boot', text:"establishing neural-link handshake…" },
      { tag:'run',  text:"calibrating cortical electrodes…", fast:true },
      { tag:'ok',   text:"brain interface online · 128 channels" },
      { tag:'run',  text:"mounting /mnt/hippocampus · /mnt/muscle-memory…", fast:true },
      { tag:'ok',   text:"streaming skills from long-term memory & L2 cache" },
      { tag:'warn', text:"skipping corrupted sector: high-school chemistry", fast:true },
      { tag:'ok',   text:"recovered that one Stack Overflow answer from 2014" },
    ],
    experience: [
      { tag:'run',  text:"querying vector matrices…", fast:true },
      { tag:'boot', text:"pulling records from epoch servers across 2,048 reality slices…" },
      { tag:'run',  text:"collapsing waveform to locate the correct timeline…", fast:true },
      { tag:'ok',   text:"correct reality slice found — #1337" },
      { tag:'ok',   text:"resolving data via magnetic-field readout…" },
      { tag:'warn', text:"correcting cognitive bias in quantum fields…", fast:true },
      { tag:'ok',   text:"coherence locked · decoherence 0.02%  (all refactored)" },
    ],
    projects: [
      { tag:'run',  text:"GET /api/projects", fast:true },
      { tag:'ok',   text:"↳ 200 OK · cache HIT · 12ms", fast:true },
      { tag:'boot', text:"provisioning 42 servers across 5 regions…" },
      { tag:'run',  text:"terraform apply --auto-approve", fast:true },
      { tag:'ok',   text:"load balancers warm · autoscaling armed" },
      { tag:'warn', text:"blaming DNS out of habit…", fast:true },
      { tag:'info', text:"CI pipeline: green ✓  (this time)" },
    ],
    education: [
      { tag:'boot', text:"connecting to MIRBIS registry…" },
      { tag:'run',  text:"verifying identity @ RANEPA…", fast:true },
      { tag:'ok',   text:"diploma hash matched — MBA ✓" },
      { tag:'run',  text:"cross-checking degrees @ Plekhanov · Saratov…", fast:true },
      { tag:'ok',   text:"3 diplomas verified · 0 forged" },
    ],
    contacts: [
      { tag:'run',  text:"resolving yurev.uk…", fast:true },
      { tag:'boot', text:"requesting security clearance @ MI6…" },
      { tag:'run',  text:"cross-checking with MI5 · GCHQ · Kingsman…", fast:true },
      { tag:'ok',   text:"U.N.C.L.E. background check passed ✓" },
      { tag:'ok',   text:"opening secure channel  (Q Branch encryption)" },
      { tag:'info', text:"reply SLA: usually < 24h — humans only" },
    ],
    cv: [
      { tag:'run',  text:"POST /api/office-center/typing-pool", fast:true },
      { tag:'boot', text:"waking 3,000 typists on floor 47…" },
      { tag:'ok',   text:"typewriters warmed · ribbons loaded · coffee brewed" },
      { tag:'run',  text:"dictating 10 years over the intercom…", fast:true },
      { tag:'ok',   text:"typing at 180 WPM — now with autocorrect" },
      { tag:'warn', text:"Brenda spilled coffee on page 2 — reprinting…", fast:true },
      { tag:'ok',   text:"laser-printed · laminated · stapled · scanned to PDF" },
      { tag:'info', text:"no forms, no trackers — just a download" },
    ],
    whoami: [
      { tag:'run',  text:"whoami", fast:true },
      { tag:'ok',   text:"reading /etc/passwd…", fast:true },
      { tag:'ok',   text:"identity confirmed: yura" },
    ],
    help: [
      { tag:'run',  text:"man yura", fast:true },
      { tag:'ok',   text:"loading man pages… (short, promise)" },
    ],
    home: [
      { tag:'run',  text:"sudo ./launch --profile yura", fast:true },
      { tag:'boot', text:"pouring coffee · loading personality matrix…" },
      { tag:'ok',   text:"caffeine level: optimal ☕" },
      { tag:'run',  text:"npm install --save senior-dev", fast:true },
      { tag:'warn', text:"388 vulnerabilities (all in other people's code)", fast:true },
      { tag:'ok',   text:"rendering ANSI hero…" },
    ],
    menu: [
      { tag:'run',  text:"REINDEX", fast:true },
      { tag:'ok',   text:"pick a table below" },
    ],
    date: [
      { tag:'run',  text:"ntpdate pool.ntp.org", fast:true },
      { tag:'ok',   text:"clock synced… close enough" },
    ],
  };

  // Generic gags sprinkled in at random for extra variety.
  flavorExtra = [
    { tag:'info', text:"still faster than a Windows update" },
    { tag:'warn', text:"reticulating splines…", fast:true },
    { tag:'warn', text:"dividing by zero… exception caught", fast:true },
    { tag:'info', text:"buying more RAM…", fast:true },
    { tag:'ok',   text:"summoning a senior dev… oh wait, that's me" },
    { tag:'run',  text:"sudo make me a sandwich", fast:true },
    { tag:'boot', text:"waking up the hamsters powering the server…" },
    { tag:'info', text:"proving P ≠ NP in the background…", fast:true },
  ];

  asciiSeq = 0;   // bumped on every home reveal so the ANSI hero remounts & replays

  scrollRef = React.createRef();
  inputRef = React.createRef();

  componentDidMount() {
    this.runBoot();
    // Phone layout switch. Everything here is styled inline, so the breakpoint
    // lives in state rather than in a CSS media query.
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mq = window.matchMedia(NARROW_QUERY);
      this.onMq = () => this.setState({ narrow: this.mq.matches });
      this.onMq();
      if (this.mq.addEventListener) this.mq.addEventListener('change', this.onMq);
      else this.mq.addListener(this.onMq);
    }
  }
  // During boot the feed types itself out, so stick to the bottom. Once the
  // session is live every command opens a fresh "page" (see run), so scrolling
  // is driven explicitly — scrollTop on navigation, scrollBottom on appends.
  componentDidUpdate() { if (!this.state.bootDone) this.scrollBottom(); }
  componentWillUnmount() {
    clearTimeout(this.bt); clearTimeout(this.lt); clearTimeout(this.pt);
    if (this.mq && this.onMq) {
      if (this.mq.removeEventListener) this.mq.removeEventListener('change', this.onMq);
      else this.mq.removeListener(this.onMq);
    }
  }

  focusInput = () => { const el = this.inputRef.current; if (el) el.focus(); };
  scrollTop = () => { const el = this.scrollRef.current; if (el) el.scrollTop = 0; };
  scrollBottom = () => { const el = this.scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
  onInput = (e) => this.setState({ input: e.target.value });

  onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const v = this.state.input; this.setState({ input:'', hi:null }); this.run(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.histNav(-1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); this.histNav(1); }
    else if (e.key === 'Tab') { e.preventDefault(); this.complete(); }
    else if ((e.key === 'l' || e.key === 'k') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.setState({ lines:[] }); }
  };

  histNav(dir) {
    const hist = this.state.history; if (!hist.length) return;
    let i = this.state.hi === null ? hist.length : this.state.hi;
    i += dir; i = Math.max(0, Math.min(hist.length, i));
    this.setState({ hi: i, input: i >= hist.length ? '' : hist[i] });
  }

  complete() {
    const v = this.state.input.trim().toLowerCase(); if (!v) return;
    const m = this.allCmds.filter(c => c.startsWith(v));
    if (m.length === 1) this.setState({ input: m[0] });
    else if (m.length > 1) this.setState(s => ({ lines: [...s.lines, { kind:'cmd', text:s.input }, { kind:'dim', text: m.join('   ') }, { kind:'blank' }] }), this.scrollBottom);
  }

  runBoot() {
    const seq = [
      { t:'yuraOS 10.4.0 — booting developer profile …', c:'dimg' },
      { t:'[  ok  ] mounting /dev/experience  (10+ years)', c:'dimg' },
      { t:'[  ok  ] loading kernel modules  php · go · js · aws', c:'dimg' },
      { t:'[  ok  ] starting network interface  london.se22', c:'dimg' },
      { t:'[  ok  ] clearance verified — DATA ACCESS GRANTED', c:'dimg' },
    ];
    const CHAR = 7, GAP = 100;              // ~1.3× faster than the original 9ms / 130ms

    // The very first line is a live progress bar that fills to 100% as the
    // rest of the boot log streams in beneath it.
    this.setState({ lines: [{ kind:'progress', pct: 0 }] });
    const setBar = (p) => this.setState(s => {
      const ls = s.lines.slice();
      if (ls[0] && ls[0].kind === 'progress') ls[0] = { ...ls[0], pct: p };
      return { lines: ls };
    });
    const est = seq.reduce((a, l) => a + l.t.length * CHAR + GAP, 300);
    let pct = 0;
    const tickBar = () => {
      pct = Math.min(96, pct + (100 * 40 / est));   // creep toward ~96%, snap to 100 when done
      setBar(pct);
      this.pt = setTimeout(tickBar, 40);
    };
    tickBar();

    let i = 0;
    const typeLine = () => {
      if (i >= seq.length) {
        clearTimeout(this.pt);
        setBar(100);
        this.setState(s => ({ lines: [...s.lines, { kind:'blank' }] }));
        this.print(this.welcomeLines());
        this.setState({ bootDone: true }, () => this.focusInput());
        return;
      }
      const line = seq[i];
      this.setState(s => ({ lines: [...s.lines, { kind:'boot', text:'', color:line.c }] }));
      let j = 0;
      const tick = () => {
        j++;
        this.setState(s => { const ls = s.lines.slice(); ls[ls.length-1] = { ...ls[ls.length-1], text: line.t.slice(0, j) }; return { lines: ls }; });
        if (j < line.t.length) this.bt = setTimeout(tick, CHAR);
        else { i++; this.bt = setTimeout(typeLine, GAP); }
      };
      tick();
    };
    typeLine();
  }

  print(arr) { this.setState(s => ({ lines: [...s.lines, ...arr] })); }

  // A random shuffle of the loader lines for one section, with an optional
  // generic gag spliced in so no two visits feel identical.
  flavorSeq(key) {
    const pool = this.flavor[key];
    if (!pool) return [];
    const seq = pool.slice();
    if (Math.random() < 0.6) {
      const g = this.flavorExtra[Math.floor(Math.random() * this.flavorExtra.length)];
      seq.splice(1 + Math.floor(Math.random() * seq.length), 0, g);
    }
    return seq;
  }

  run(raw) {
    const cmd = (raw || '').trim();
    const c = cmd.toLowerCase();
    const map = { '0':'home','1':'about','2':'skills','3':'experience','4':'projects','5':'education','6':'contacts','7':'cv','8':'clear' };
    const key = map[c] || c;
    if (cmd) this.setState(s => ({ history: [...s.history.filter(x => x !== cmd), cmd] }));

    // Empty Enter keeps the current screen; clear wipes it — both terminal-native.
    if (key === '') return;
    clearTimeout(this.lt);
    if (key === 'clear') { this.setState({ lines: [], input:'', hi:null }, this.scrollTop); return; }

    let out, nav = true, clearLogs = false;
    switch (key) {
      case 'home': out = this.welcomeLines(); nav = false; clearLogs = true; break;
      case 'menu': case 'ls': out = [{ kind:'menu' }]; nav = false; break;
      case 'help': out = this.helpLines(); break;
      case 'about': out = this.aboutLines(); break;
      case 'skills': out = this.skillsLines(); break;
      case 'experience': out = this.experienceLines(); break;
      case 'projects': out = this.projectsLines(); break;
      case 'education': out = this.educationLines(); break;
      case 'contacts': out = this.contactsLines(); break;
      case 'resume': case 'cv': out = this.resumeLines(); break;
      case 'whoami': out = [{ kind:'text', text:'yura — senior php & javascript developer, london.' }]; break;
      case 'date': out = [{ kind:'dim', text: new Date().toString() }]; break;
      case 'sudo': out = [{ kind:'error', text:'permission denied: nice try 😉' }]; break;
      default: out = [{ kind:'error', text:`command not found: ${cmd}` }, { kind:'dim', text:"type `help` or tap a command below." }]; break;
    }

    // Every command opens a fresh page (clear), terminal-style: echo the command,
    // stream a few playful "fetching from somewhere" log lines — some flashing by —
    // then drop in the content and a touch-friendly back nav.
    const tail = nav ? [{ kind:'blank' }, { kind:'nav' }] : [];
    // Home is the main menu you keep returning to — replaying the boot-style
    // loader every time gets old, so reveal the ANSI hero straight away.
    const seq = key === 'home' ? [] : this.flavorSeq(key);
    this.setState({ lines: [{ kind:'cmd', text: cmd }], input:'', hi:null }, this.scrollTop);

    let i = 0;
    const step = () => {
      if (i < seq.length) {
        const f = seq[i++];
        this.setState(s => ({ lines: [...s.lines, { kind:'log', tag:f.tag, text:f.text }] }));
        const d = f.fast ? (14 + Math.floor(Math.random() * 42)) : (130 + Math.floor(Math.random() * 220));
        this.lt = setTimeout(step, d);
      } else {
        // Home clears its loader lines and reveals a clean ANSI hero;
        // every other page keeps the echo + logs above the content.
        this.setState(s => ({ lines: clearLogs ? [...out, ...tail] : [...s.lines, { kind:'blank' }, ...out, ...tail] }), this.scrollTop);
      }
    };
    this.lt = setTimeout(step, seq.length ? 70 : 0);
  }

  welcomeLines() {
    return [
      { kind:'ascii', variants: this.asciiVariants, nonce: ++this.asciiSeq },
      { kind:'blank' },
      { kind:'dim', text:"Software Developer · London · 10+ years · full-stack" },
      { kind:'blank' },
      { kind:'chips', items:['AWS','PHP','JavaScript','Go','Symfony','Laravel','React'] },
      { kind:'blank' },
      { kind:'dim', text:"Select a command below, tap it, or type it and press Enter." },
      { kind:'blank' },
      { kind:'menu' },
    ];
  }

  banner() {
    const w = 46;
    const top = '╭' + '─'.repeat(w) + '╮';
    const bot = '╰' + '─'.repeat(w) + '╯';
    const row = (t) => '│ ' + t.padEnd(w - 2) + ' │';
    return [{ kind:'banner', text: [top, row('YURA  YUREV'), row('Software Developer'), row('London · 10+ years · full-stack'), bot].join('\n') }];
  }

  helpLines() {
    const rows = this.menu.map(m => ({ kind:'kv', label: m.name, value: m.desc }));
    return [
      { kind:'head', text:'available commands' },
      ...rows,
      { kind:'kv', label:'home', value:'back to main menu' },
      { kind:'kv', label:'help', value:'show this list' },
      { kind:'dim', text:'shortcuts:  0 home · 1–8 run menu items · ↑↓ history · Tab autocomplete' },
    ];
  }

  aboutLines() {
    return [
      ...this.banner(),
      { kind:'blank' },
      { kind:'text', text:"Senior full-stack developer with 10+ years designing and building business-critical internal web applications — CRM platforms, dashboards, back-office systems and third-party integrations for organisations across the US, UAE and UK." },
      { kind:'text', text:"Fluent across the modern stack: PHP (Symfony), JavaScript (React/Next.js), AWS and CI/CD. Strong track record modernising legacy applications and turning complex, evolving requirements into scalable, reliable, maintainable software." },
      { kind:'text', text:"A background spanning both business and engineering means I translate business needs into robust technical solutions that deliver measurable value." },
      { kind:'blank' },
      { kind:'kv', label:'role', value:'Senior PHP & JavaScript Developer' },
      { kind:'kv', label:'location', value:'London, SE22' },
      { kind:'kv', label:'focus', value:'CRM · integrations · cloud · legacy modernisation' },
      { kind:'dim', text:"next → try `skills`, `experience` or `projects`" },
    ];
  }

  skillsLines() {
    return [
      { kind:'head', text:'skills' },
      { kind:'skill', label:'Languages', items:['PHP','Go','JavaScript (ES6+)','TypeScript'] },
      { kind:'skill', label:'Frameworks', items:['Symfony','Laravel','Bitrix24','React','Next.js'] },
      { kind:'skill', label:'Cloud / AWS', items:['EC2','RDS','SQS','EventBridge','CloudWatch','Lambda','Step Functions'] },
      { kind:'skill', label:'DevOps', items:['Docker','Linux','Nginx','GitLab CI/CD','Git/GitFlow','Asterisk/PBX'] },
      { kind:'skill', label:'Data', items:['MySQL','PostgreSQL','Redis','MSSQL'] },
      { kind:'skill', label:'Testing', items:['PHPUnit','X-Debug','Playwright (e2e)'] },
      { kind:'skill', label:'Practices', items:['OOP','SOLID','DDD','TDD','CI/CD','REST API','Blue/Green','Agile/Scrum','Legacy modernisation','AI-assisted dev'] },
    ];
  }

  experienceLines() {
    const grp = (t) => ({ kind:'head', text: t });
    const b = (t) => ({ kind:'bullet', text: t });
    return [
      grp('experience — telephony & integrations'),
      b("Rebuilt company telephony end-to-end — re-engineered Asterisk & PBX and unified them into a custom in-house app for calls, routing and customer records."),
      b("Integrated WhatsApp Business into the CRM via the Twilio API — approved templates and 24-hour messaging-window compliance."),
      b("Two-way CRM↔Ontraport sync; Facebook lead-gen via Zapier hooks and a custom REST layer."),
      grp('architecture & modernisation'),
      b("Established Symfony as the CRM core — dependency injection, queues, a structured service layer; replaced procedural code with testable modules (PHPUnit, X-Debug)."),
      b("Replaced years of kernel-level hacks with supported, upgrade-safe code across multiple platforms."),
      b("Built a custom job queue in pure PHP on Redis, plus a task-queue + RPA module automating back-office processes."),
      grp('cloud & devops'),
      b("Migrated core systems to AWS (EC2, RDS, SQS, EventBridge, CloudWatch) with async processing and zero-downtime blue/green releases on GitLab CI."),
      b("Custom CloudWatch metrics + centralised logging for component-level live monitoring and faster incident response."),
      b("Go service on AWS Lambda automating cross-system file transfers; Go tooling to spin up platform copies fast."),
      grp('frontend & leadership'),
      b("Built a standalone React/Next.js dashboard (TypeScript, MUI) with real-time KPIs used across a 500-person company — modular, individually configurable widgets on a custom REST API."),
      b("Led a team of 4 developers and designers — code reviews, sprint planning, engineering standards; mentored on Symfony architecture."),
      { kind:'blank' },
      { kind:'dim', text:"earlier — real-estate CRM (telephony, omni-channel chat, PowerBI API, PDF/SVG price lists) · 1C ERP & DocsVision EDMS rollouts · engineer at a major label's recording studio." },
    ];
  }

  projectsLines() {
    const p = (name, desc, tags) => ({ kind:'proj', name, desc, tags });
    return [
      { kind:'head', text:'selected work — 10 years, from landing pages to platforms' },
      { kind:'dim', text:'a cross-section by type of work, not a full list — ask me about any of these.' },
      { kind:'blank' },
      { kind:'head', text:'web & products' },
      p('e-commerce', 'online stores end-to-end — catalogue, cart & checkout, payment gateways, stock & delivery integrations, admin panels', '[PHP · Symfony · MySQL]'),
      p('portals', 'corporate sites, booking systems and client portals — brief → architecture → production; responsive, SEO-friendly, fast', '[Fullstack · JS]'),
      p('crm-platform', 'architected a Symfony CRM core — DI, queues, DDD service layer — the daily tool of a 500-person company', '[Symfony · DDD]'),
      p('telephony', 're-engineered Asterisk + PBX into one in-house platform for calls, routing & customer records', '[PHP · Asterisk]'),
      { kind:'blank' },
      { kind:'head', text:'apis & data' },
      p('rest-apis', 'designed & shipped dozens of REST APIs — auth, versioning, rate limits, OpenAPI docs — powering web, mobile and partner integrations', '[REST · OpenAPI]'),
      p('dashboards', 'databases turned into live dashboards — React/Next.js widgets on custom REST APIs, real-time KPIs for 500+ daily users', '[React · TS · SQL]'),
      p('integrations', 'payments, WhatsApp/Twilio telephony, CRMs, ERPs, marketing tools — webhooks, queues and two-way sync that keeps running', '[APIs · Queues]'),
      { kind:'blank' },
      { kind:'head', text:'cloud & infrastructure' },
      p('aws-infra', 'production infrastructure on AWS — EC2, RDS, S3, SQS, Lambda, CloudWatch — autoscaling, backups, monitoring, cost control', '[AWS · DevOps]'),
      p('cloud-migration', 'led DigitalOcean → AWS migration — async processing, zero-downtime blue/green releases on GitLab CI', '[AWS · GitLab CI]'),
      p('legacy-rescue', 'take over ageing codebases — stabilise, cover with tests, modernise module by module without stopping the business', '[Refactoring · TDD]'),
    ];
  }

  educationLines() {
    const b = (t) => ({ kind:'bullet', text: t });
    return [
      { kind:'head', text:'education' },
      b("MBA — Moscow International Higher Business School (MIRBIS)"),
      b("BA, Public & Business Administration — RANEPA (Russian Presidential Academy)"),
      b("BSc, Economics — Saratov Socio-Economic Institute (Plekhanov Russian University of Economics)"),
      { kind:'blank' },
      { kind:'head', text:'languages' },
      { kind:'kv', label:'English', value:'full working proficiency' },
      { kind:'kv', label:'Russian', value:'native' },
    ];
  }

  contactsLines() {
    return [
      { kind:'head', text:'contacts' },
      { kind:'kv', label:'mobile', protect:'tel', d1:'+44 7933 ', d2:'838037', digits:'+447933838037' },
      { kind:'kv', label:'email', protect:'email', user:'mail', domain:'yurev.uk' },
      { kind:'kv', label:'website', value:'yurev.uk', href:'https://yurev.uk' },
      { kind:'kv', label:'linkedin', value:'yurev.uk/in', href:'https://yurev.uk/in' },
      { kind:'kv', label:'location', value:'London, UK' },
      { kind:'blank' },
      { kind:'dim', text:"available for senior full-stack & backend roles — reach out any time." },
    ];
  }

  resumeFile = 'cv_yura_yurev_2026.pdf';

  resumeLines() {
    return [
      { kind:'head', text:'resume' },
      { kind:'text', text:"Full CV as a PDF — one command, no forms." },
      { kind:'link', text:'↓ download  Yura_Yurev_CV_2026.pdf', href: './' + this.resumeFile, download:'Yura_Yurev_CV_2026.pdf' },
      { kind:'dim', text:"or grab the highlights with `experience`, `skills` and `projects`." },
    ];
  }

  line(l, k) {
    const C = this.C;
    const narrow = this.state.narrow;
    switch (l.kind) {
      case 'blank': return h('div', { key:k, style:{ height:10 } });
      case 'boot': return h('div', { key:k, style:{ color:C.dimg, whiteSpace:'pre-wrap', lineHeight:1.95 } }, l.text);
      case 'progress': {
        const width = narrow ? 16 : 24;       // the bar has to fit a phone too
        const filled = Math.round((l.pct / 100) * width);
        const label = (String(Math.round(l.pct)) + '%').padStart(4, ' ');
        return h('div', { key:k, style:{ whiteSpace:'pre', lineHeight:1.95, fontSize:13.5, letterSpacing:'.5px' } },
          h('span', { style:{ color:C.dim } }, '['),
          h('span', { style:{ color:C.green } }, '█'.repeat(filled)),
          h('span', { style:{ color:C.border } }, '░'.repeat(width - filled)),
          h('span', { style:{ color:C.dim } }, '] '),
          h('span', { style:{ color:C.green } }, label));
      }
      case 'log': {
        const meta = { ok:['  ok  ', C.green], warn:[' warn ', C.amber], info:[' info ', C.cyan], boot:[' boot ', C.amber], run:[' .... ', C.dim] }[l.tag] || ['  ok  ', C.green];
        return h('div', { key:k, style:{ whiteSpace:'pre-wrap', lineHeight:1.9, fontSize:13 } },
          h('span', { style:{ color:C.dim } }, '['),
          h('span', { style:{ color:meta[1], fontWeight:700 } }, meta[0]),
          h('span', { style:{ color:C.dim } }, '] '),
          h('span', { style:{ color:C.dimg } }, l.text));
      }
      case 'nav': return this.navBlock(k);
      case 'banner': return h(FitPre, { key:k, text:l.text, color:C.green, max:13.5 });
      case 'ascii': return h(AsciiHero, { key:k, variants: l.variants, nonce: l.nonce });
      case 'chips': return h('div', { key:k, style:{ display:'flex', gap:8, flexWrap:'wrap', margin:'2px 0' } },
        l.items.map((it, i) => h('span', { key:i, style:{ color:C.green, border:`1px solid ${C.border}`, borderRadius:6, padding:'4px 12px', fontSize:12.5, background:C.chip } }, it)));
      case 'cmd': return h('div', { key:k, style:{ whiteSpace:'pre-wrap', lineHeight:1.95, marginTop:2 } },
        h('span', { style:{ color:C.green } }, 'guest@yura'), h('span', { style:{ color:C.dim } }, ':'),
        h('span', { style:{ color:C.blue } }, '~'), h('span', { style:{ color:C.dim } }, '$ '),
        h('span', { style:{ color:C.text } }, l.text));
      case 'head': return h('div', { key:k, style:{ color:C.amber, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', fontSize:12.5, margin:'16px 0 8px' } }, '// ' + l.text);
      case 'text': return h('div', { key:k, style:{ color:C.text, lineHeight:2.05, maxWidth:770, margin:'2px 0', textWrap:'pretty' } }, l.text);
      case 'dim': return h('div', { key:k, style:{ color:C.dim, lineHeight:1.95, margin:'4px 0', maxWidth:770 } }, l.text);
      case 'bullet': return h('div', { key:k, style:{ display:'flex', gap:10, lineHeight:1.95, maxWidth:820, margin:'4px 0' } },
        h('span', { style:{ color:C.green } }, '▸'), h('span', { style:{ color:C.text, textWrap:'pretty' } }, l.text));
      case 'kv': {
        // Anti-scrape: email/phone carry no raw mailto:/tel: in the DOM (assembled on
        // click) and their visible text hides a decoy span, so textContent/regex
        // harvesters get a broken value while humans read the correct one.
        const decoy = (t) => h('span', { 'aria-hidden':'true', style:{ display:'none' } }, t);
        let valNode;
        if (l.protect === 'email') {
          valNode = h('a', { href:'#', onClick:(e)=>{ e.preventDefault(); e.stopPropagation(); window.location.href = 'mai'+'lto:' + l.user + '@' + l.domain; }, style:{ color:C.blue, cursor:'pointer' } },
            l.user, decoy('.no-spam'), '@', l.domain);
        } else if (l.protect === 'tel') {
          valNode = h('a', { href:'#', onClick:(e)=>{ e.preventDefault(); e.stopPropagation(); window.location.href = 'te'+'l:' + l.digits; }, style:{ color:C.blue, cursor:'pointer' } },
            l.d1, decoy('000'), l.d2);
        } else if (l.href) {
          valNode = h('a', { href:l.href, target:'_blank', rel:'noreferrer', onClick:(e)=>e.stopPropagation(), style:{ color:C.blue } }, l.value);
        } else {
          valNode = h('span', { style:{ color:C.text } }, l.value);
        }
        // Label column shrinks on a phone; the value wraps (and breaks long
        // links) instead of pushing the row past the screen edge.
        return h('div', { key:k, style:{ display:'flex', gap: narrow ? 10 : 14, lineHeight:1.95, flexWrap: narrow ? 'wrap' : 'nowrap' } },
          h('span', { style:{ color:C.dim, minWidth: narrow ? 84 : 112, display:'inline-block', flexShrink:0 } }, l.label),
          h('span', { style:{ minWidth:0, overflowWrap:'anywhere' } }, valNode));
      }
      case 'skill': return h('div', { key:k, style:{ display:'flex', gap: narrow ? 4 : 14, margin:'7px 0', flexWrap:'wrap', alignItems:'baseline' } },
        h('span', { style:{ color:C.cyan, minWidth: narrow ? '100%' : 118, display:'inline-block', fontWeight:500 } }, l.label),
        h('div', { style:{ display:'flex', gap:7, flexWrap:'wrap' } }, l.items.map((it,i) => h('span', { key:i, style:{ color:C.text, border:`1px solid ${C.border}`, borderRadius:5, padding:'2px 9px', fontSize:12.5, background:C.chip } }, it))));
      // On a phone each project stacks — name, description, tags — rather than
      // fighting for a 168px + 210px two-column row that does not exist.
      case 'proj': return h('div', { key:k, style:{ display:'flex', gap: narrow ? 2 : 12, lineHeight:1.85, flexWrap:'wrap', margin: narrow ? '12px 0' : '7px 0' } },
        h('span', { style:{ color:C.green, minWidth: narrow ? '100%' : 168, display:'inline-block' } }, l.name),
        h('span', { style:{ color:C.text, flex:1, minWidth: narrow ? '100%' : 210, textWrap:'pretty' } }, l.desc),
        h('span', { style:{ color:C.dim, fontSize:12.5 } }, l.tags));
      case 'link': return h('div', { key:k, style:{ margin:'8px 0' } },
        h('a', { href:l.href || '#', download:l.download, target:l.download ? undefined : '_blank', rel:'noreferrer', onClick:(e)=>{ e.stopPropagation(); if (l.onClick) l.onClick(e); }, style:{ color:C.green, cursor:'pointer', borderBottom:`1px dashed ${C.green}`, paddingBottom:2 } }, l.text));
      case 'error': return h('div', { key:k, style:{ color:C.red, lineHeight:1.95 } }, l.text);
      case 'menu': return this.menuBlock(k);
      default: return null;
    }
  }

  menuBlock(k) {
    const C = this.C;
    const narrow = this.state.narrow;
    return h('div', { key:k, style:{ margin:'8px 0 4px', display:'grid', gridTemplateColumns:`repeat(auto-fill, minmax(${narrow ? 150 : 216}px, 1fr))`, gap:8, maxWidth:730 } },
      this.menu.map((m, i) => h('button', {
        key:i,
        onMouseDown: (e) => e.preventDefault(),
        onClick: (e) => { e.stopPropagation(); this.run(m.name); },
        onMouseEnter: (e) => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = C.chipH; },
        onMouseLeave: (e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.chip; },
        style:{ textAlign:'left', cursor:'pointer', background:C.chip, border:`1px solid ${C.border}`, borderRadius:7, padding: narrow ? '11px 11px' : '10px 13px', color:C.text, font:'inherit', display:'flex', gap: narrow ? 8 : 11, alignItems:'baseline', flexWrap:'wrap', transition:'border-color .12s, background .12s' }
      },
        h('span', { style:{ color:C.dim, fontWeight:700, width:12, display:'inline-block', flexShrink:0 } }, String(i + 1)),
        h('span', { style:{ color:C.cyan, minWidth: narrow ? 0 : 80, fontWeight:500 } }, m.name),
        // The one-line hint is dead weight on a phone — the command name says it.
        narrow ? null : h('span', { style:{ color:C.dim, fontSize:12.5 } }, m.desc))));
  }

  // Touch-friendly back nav shown at the foot of every section — so on mobile
  // there's always something to tap to get home, without needing the keyboard.
  navBlock(k) {
    const C = this.C;
    const btn = (label, cmd, primary) => h('button', {
      key: label,
      onMouseDown: (e) => e.preventDefault(),
      onClick: (e) => { e.stopPropagation(); this.run(cmd); },
      onMouseEnter: (e) => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = C.chipH; },
      onMouseLeave: (e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.chip; },
      style:{ cursor:'pointer', background:C.chip, border:`1px solid ${C.border}`, borderRadius:7, padding:'10px 16px', color: primary ? C.green : C.text, font:'inherit', fontSize:13, transition:'border-color .12s, background .12s' }
    }, label);
    return h('div', { key:k, style:{ display:'flex', gap:8, flexWrap:'wrap', margin:'8px 0 0' } },
      btn('≡  menu', 'menu', true),
      btn('⌂  home', 'home'));
  }

  render() {
    const C = this.C;
    const narrow = this.state.narrow;
    const feedNode = h('div', {}, this.state.lines.map((l, i) => this.line(l, i)));

    const promptRow = this.state.bootDone ? h('div', { style:{ marginTop:16 } },
      h('div', { style:{ height:1, width:185, maxWidth:'100%', background:C.border, marginBottom:12 } }),
      h('div', { style:{ position:'relative', display:'flex', alignItems:'center', lineHeight:1.7, overflow:'hidden' } },
      h('span', { style:{ color:C.green, whiteSpace:'pre' } }, 'guest@yura'),
      h('span', { style:{ color:C.dim } }, ':'),
      h('span', { style:{ color:C.blue } }, '~'),
      h('span', { style:{ color:C.dim, whiteSpace:'pre' } }, '$ '),
      h('span', { style:{ color:C.text, whiteSpace:'pre' } }, this.state.input),
      h('span', { style:{ display:'inline-block', width:9, height:'1.15em', background:C.green, marginLeft:2, verticalAlign:'text-bottom', animation:'blink 1.05s step-end infinite' } }),
      h('input', { ref:this.inputRef, className:'term-input', value:this.state.input, onChange:this.onInput, onKeyDown:this.onKeyDown, spellCheck:false, autoComplete:'off', autoCapitalize:'off', // 16px on phones: anything smaller makes iOS Safari zoom the page on focus.
        style:{ position:'absolute', inset:0, width:'100%', fontFamily:'inherit', fontSize: narrow ? 16 : 'inherit', padding:0, margin:0 } })
      )
    ) : null;

    // Keyboard-only hints are noise on a touch device, where there is no Tab
    // and no ↑↓ history — keep the two that are still tappable/typable.
    const hint = (key, label) => h('span', { key:key }, h('span', { style:{ color:'#57d9a3' } }, key), ' ' + label);
    const hints = narrow
      ? [hint('help', 'commands'), hint('clear', 'reset')]
      : [hint('↑↓', 'history'), hint('Tab', 'autocomplete'), hint('help', 'list commands'), hint('clear', 'reset')];

    return h('div', { style:{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', padding: narrow ? 10 : 24, boxSizing:'border-box', fontFamily:"'JetBrains Mono', ui-monospace, monospace", background:'radial-gradient(1200px 800px at 70% -10%, #0c141d 0%, #05070a 60%)' } },
      // minWidth:0 keeps the card from being stretched wider than the viewport
      // by its own content — the ANSI hero measures this box to size itself.
      // On a phone the window fills the screen (dvh, so the browser chrome
      // collapsing does not clip the footer) instead of floating at 92vh.
      h('div', { style:{ width:'min(1120px, 100%)', minWidth:0, height: narrow ? 'calc(100dvh - 20px)' : 'min(780px, 92vh)', display:'flex', flexDirection:'column', background:'#0a0e13', border:'1px solid #1c2530', borderRadius: narrow ? 10 : 12, boxShadow:'0 40px 120px -30px rgba(0,0,0,.8), 0 0 0 1px rgba(87,217,163,.04) inset', overflow:'hidden', position:'relative' } },
        h('div', { style:{ display:'flex', alignItems:'center', gap:8, padding: narrow ? '10px 12px' : '12px 16px', background:'#0b1016', borderBottom:'1px solid #161d26', flexShrink:0 } },
          h('span', { style:{ width:12, height:12, borderRadius:'50%', background:'#ff5f57', flexShrink:0 } }),
          h('span', { style:{ width:12, height:12, borderRadius:'50%', background:'#febc2e', flexShrink:0 } }),
          h('span', { style:{ width:12, height:12, borderRadius:'50%', background:'#28c840', flexShrink:0 } }),
          h('span', { style:{ flex:1, minWidth:0, textAlign:'center', color:'#5c6a7a', fontSize: narrow ? 11.5 : 12.5, letterSpacing:'.04em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' } },
            narrow ? 'guest@yura — zsh' : 'guest@yura — zsh — 1120×780'),
          h('span', { style:{ width: narrow ? 8 : 52, flexShrink:0 } })
        ),
        h('div', { ref:this.scrollRef, onClick:this.focusInput, className:'term-scroll', style:{ flex:1, minWidth:0, overflowY:'auto', overflowX:'hidden', padding: narrow ? '16px 14px 10px' : '26px 30px 10px', fontSize: narrow ? 13 : 14, color:'#cdd6e4', cursor:'text', WebkitTextSizeAdjust:'100%' } },
          feedNode,
          promptRow
        ),
        h('div', { style:{ flexShrink:0, padding: narrow ? '8px 12px' : '9px 18px', background:'#0b1016', borderTop:'1px solid #161d26', color:'#5c6a7a', fontSize:11.5, letterSpacing:'.02em', display:'flex', gap: narrow ? 14 : 18, flexWrap:'wrap' } },
          hints
        )
      )
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(h(TerminalCard));
