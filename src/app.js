const h = React.createElement;

class TerminalCard extends React.Component {
  state = { lines: [], input: '', bootDone: false, history: [], hi: null };

  C = {
    text:'#cdd6e4', dim:'#5c6a7a', green:'#57d9a3', dimg:'#3d7a63',
    cyan:'#5cc8ff', blue:'#5cc8ff', amber:'#f0c674', red:'#ff6b6b',
    border:'#1c2530', chip:'#0e141b', chipH:'#131b24'
  };

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

  scrollRef = React.createRef();
  inputRef = React.createRef();

  componentDidMount() { this.runBoot(); }
  componentDidUpdate() { const el = this.scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }
  componentWillUnmount() { clearTimeout(this.bt); }

  focusInput = () => { const el = this.inputRef.current; if (el) el.focus(); };
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
    else if (m.length > 1) this.setState(s => ({ lines: [...s.lines, { kind:'cmd', text:s.input }, { kind:'dim', text: m.join('   ') }, { kind:'blank' }] }));
  }

  runBoot() {
    const seq = [
      { t:'yuraOS 10.4.0 — booting developer profile …', c:'dimg' },
      { t:'[  ok  ] mounting /dev/experience  (10+ years)', c:'dimg' },
      { t:'[  ok  ] loading kernel modules  php · go · js · aws', c:'dimg' },
      { t:'[  ok  ] starting network interface  london.se22', c:'dimg' },
      { t:'[  ok  ] authentication: guest access granted', c:'dimg' },
    ];
    let i = 0;
    const typeLine = () => {
      if (i >= seq.length) {
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
        if (j < line.t.length) this.bt = setTimeout(tick, 9);
        else { i++; this.bt = setTimeout(typeLine, 130); }
      };
      tick();
    };
    typeLine();
  }

  print(arr) { this.setState(s => ({ lines: [...s.lines, ...arr] })); }

  run(raw) {
    const cmd = (raw || '').trim();
    const c = cmd.toLowerCase();
    if (cmd) this.setState(s => ({ history: [...s.history.filter(x => x !== cmd), cmd] }));
    const map = { '0':'home','1':'about','2':'skills','3':'experience','4':'projects','5':'education','6':'contacts','7':'cv','8':'clear' };
    const key = map[c] || c;
    if (key === 'clear') { this.setState({ lines: [] }); return; }
    let out;
    switch (key) {
      case '': out = []; break;
      case 'home': out = this.welcomeLines(); break;
      case 'help': out = this.helpLines(); break;
      case 'menu': case 'ls': out = [{ kind:'menu' }]; break;
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
      default: out = [{ kind:'error', text:`command not found: ${cmd}` }, { kind:'dim', text:"type `help` to see available commands." }];
    }
    this.print([{ kind:'cmd', text: cmd }, ...out, { kind:'blank' }]);
  }

  welcomeLines() {
    return [
      ...this.banner(),
      { kind:'blank' },
      { kind:'text', text:"Senior full-stack developer — CRM platforms, dashboards & integrations across the US, UAE and UK." },
      { kind:'dim', text:"Select a command below, click it, or type it and press Enter." },
      { kind:'blank' },
      { kind:'menu' },
    ];
  }

  banner() {
    const w = 46;
    const top = '╭' + '─'.repeat(w) + '╮';
    const bot = '╰' + '─'.repeat(w) + '╯';
    const row = (t) => '│ ' + t.padEnd(w - 2) + ' │';
    return [{ kind:'banner', text: [top, row('YURA  YUREV'), row('Senior PHP & JavaScript Developer'), row('London · 10+ years · full-stack'), bot].join('\n') }];
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
      { kind:'head', text:'selected projects' },
      p('telephony-platform', 'Asterisk + PBX unified with an in-house app', '[PHP · Asterisk]'),
      p('whatsapp-crm', 'WhatsApp Business via Twilio, template & window compliance', '[PHP · JS · Twilio]'),
      p('aws-migration', 'DigitalOcean → AWS, blue/green CI/CD, custom metrics', '[AWS · GitLab CI]'),
      p('lambda-filesync', 'Go service automating cross-system file transfers', '[Go · Lambda]'),
      p('kpi-dashboard', 'real-time KPIs for 500 users, modular widgets', '[React · Next.js · TS]'),
      p('redis-job-queue', 'background jobs in pure PHP on Redis', '[PHP · Redis]'),
      p('viewing-tracker', 'apartment-viewing tracker + PDF/SVG price lists', '[PHP · SVG]'),
    ];
  }

  educationLines() {
    const b = (t) => ({ kind:'bullet', text: t });
    return [
      { kind:'head', text:'education' },
      b("MBA — Moscow International Higher Business School (MIRBIS)"),
      b("BA, Public & Business Administration — RANEPA (Russian Presidential Academy)"),
      b("BSc, Economics — Saratov Socio-Economic Institute (Plekhanov Russian University of Economics)"),
      b("Project Management with Oracle Primavera P6 — professional course"),
      { kind:'blank' },
      { kind:'head', text:'languages' },
      { kind:'kv', label:'English', value:'full working proficiency' },
      { kind:'kv', label:'Russian', value:'native' },
    ];
  }

  contactsLines() {
    return [
      { kind:'head', text:'contacts' },
      { kind:'kv', label:'mobile', value:'+44 7933 838037', href:'tel:+447933838037' },
      { kind:'kv', label:'email', value:'yurievyuri@live.com', href:'mailto:yurievyuri@live.com' },
      { kind:'kv', label:'linkedin', value:'bit.ly/4yxdtE5', href:'https://bit.ly/4yxdtE5' },
      { kind:'kv', label:'location', value:'London, SE22' },
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
    switch (l.kind) {
      case 'blank': return h('div', { key:k, style:{ height:10 } });
      case 'boot': return h('div', { key:k, style:{ color:C.dimg, whiteSpace:'pre-wrap', lineHeight:1.95 } }, l.text);
      case 'banner': return h('pre', { key:k, style:{ color:C.green, margin:0, fontFamily:"'JetBrains Mono', monospace", lineHeight:1.2, fontSize:13.5, whiteSpace:'pre' } }, l.text);
      case 'cmd': return h('div', { key:k, style:{ whiteSpace:'pre-wrap', lineHeight:1.95, marginTop:2 } },
        h('span', { style:{ color:C.green } }, 'guest@yura'), h('span', { style:{ color:C.dim } }, ':'),
        h('span', { style:{ color:C.blue } }, '~'), h('span', { style:{ color:C.dim } }, '$ '),
        h('span', { style:{ color:C.text } }, l.text));
      case 'head': return h('div', { key:k, style:{ color:C.amber, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', fontSize:12.5, margin:'16px 0 8px' } }, '// ' + l.text);
      case 'text': return h('div', { key:k, style:{ color:C.text, lineHeight:2.05, maxWidth:770, margin:'2px 0', textWrap:'pretty' } }, l.text);
      case 'dim': return h('div', { key:k, style:{ color:C.dim, lineHeight:1.95, margin:'4px 0', maxWidth:770 } }, l.text);
      case 'bullet': return h('div', { key:k, style:{ display:'flex', gap:10, lineHeight:1.95, maxWidth:820, margin:'4px 0' } },
        h('span', { style:{ color:C.green } }, '▸'), h('span', { style:{ color:C.text, textWrap:'pretty' } }, l.text));
      case 'kv': return h('div', { key:k, style:{ display:'flex', gap:14, lineHeight:1.95 } },
        h('span', { style:{ color:C.dim, minWidth:112, display:'inline-block' } }, l.label),
        l.href ? h('a', { href:l.href, target:'_blank', rel:'noreferrer', onClick:(e)=>e.stopPropagation(), style:{ color:C.blue } }, l.value) : h('span', { style:{ color:C.text } }, l.value));
      case 'skill': return h('div', { key:k, style:{ display:'flex', gap:14, margin:'7px 0', flexWrap:'wrap', alignItems:'baseline' } },
        h('span', { style:{ color:C.cyan, minWidth:118, display:'inline-block', fontWeight:500 } }, l.label),
        h('div', { style:{ display:'flex', gap:7, flexWrap:'wrap' } }, l.items.map((it,i) => h('span', { key:i, style:{ color:C.text, border:`1px solid ${C.border}`, borderRadius:5, padding:'2px 9px', fontSize:12.5, background:C.chip } }, it))));
      case 'proj': return h('div', { key:k, style:{ display:'flex', gap:12, lineHeight:1.85, flexWrap:'wrap', margin:'7px 0' } },
        h('span', { style:{ color:C.green, minWidth:168, display:'inline-block' } }, l.name),
        h('span', { style:{ color:C.text, flex:1, minWidth:210 } }, l.desc),
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
    return h('div', { key:k, style:{ margin:'8px 0 4px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(216px, 1fr))', gap:8, maxWidth:730 } },
      this.menu.map((m, i) => h('button', {
        key:i,
        onClick: (e) => { e.stopPropagation(); this.run(m.name); },
        onMouseEnter: (e) => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = C.chipH; },
        onMouseLeave: (e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.chip; },
        style:{ textAlign:'left', cursor:'pointer', background:C.chip, border:`1px solid ${C.border}`, borderRadius:7, padding:'10px 13px', color:C.text, font:'inherit', display:'flex', gap:11, alignItems:'baseline', transition:'border-color .12s, background .12s' }
      },
        h('span', { style:{ color:C.dim, fontWeight:700, width:12, display:'inline-block' } }, String(i + 1)),
        h('span', { style:{ color:C.cyan, minWidth:80, fontWeight:500 } }, m.name),
        h('span', { style:{ color:C.dim, fontSize:12.5 } }, m.desc))));
  }

  render() {
    const C = this.C;
    const feedNode = h('div', {}, this.state.lines.map((l, i) => this.line(l, i)));

    const promptRow = this.state.bootDone ? h('div', { style:{ position:'relative', display:'flex', alignItems:'center', marginTop:6, lineHeight:1.7 } },
      h('span', { style:{ color:C.green, whiteSpace:'pre' } }, 'guest@yura'),
      h('span', { style:{ color:C.dim } }, ':'),
      h('span', { style:{ color:C.blue } }, '~'),
      h('span', { style:{ color:C.dim, whiteSpace:'pre' } }, '$ '),
      h('span', { style:{ color:C.text, whiteSpace:'pre' } }, this.state.input),
      h('span', { style:{ display:'inline-block', width:9, height:'1.15em', background:C.green, marginLeft:2, verticalAlign:'text-bottom', animation:'blink 1.05s step-end infinite' } }),
      h('input', { ref:this.inputRef, className:'term-input', value:this.state.input, onChange:this.onInput, onKeyDown:this.onKeyDown, spellCheck:false, autoComplete:'off', autoCapitalize:'off', style:{ position:'absolute', inset:0, width:'100%', fontFamily:'inherit', fontSize:'inherit', padding:0, margin:0 } })
    ) : null;

    return h('div', { style:{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, boxSizing:'border-box', fontFamily:"'JetBrains Mono', ui-monospace, monospace", background:'radial-gradient(1200px 800px at 70% -10%, #0c141d 0%, #05070a 60%)' } },
      h('div', { style:{ width:'min(1120px, 100%)', height:'min(780px, 92vh)', display:'flex', flexDirection:'column', background:'#0a0e13', border:'1px solid #1c2530', borderRadius:12, boxShadow:'0 40px 120px -30px rgba(0,0,0,.8), 0 0 0 1px rgba(87,217,163,.04) inset', overflow:'hidden', position:'relative' } },
        h('div', { style:{ display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'#0b1016', borderBottom:'1px solid #161d26', flexShrink:0 } },
          h('span', { style:{ width:12, height:12, borderRadius:'50%', background:'#ff5f57' } }),
          h('span', { style:{ width:12, height:12, borderRadius:'50%', background:'#febc2e' } }),
          h('span', { style:{ width:12, height:12, borderRadius:'50%', background:'#28c840' } }),
          h('span', { style:{ flex:1, textAlign:'center', color:'#5c6a7a', fontSize:12.5, letterSpacing:'.04em' } }, 'guest@yura — zsh — 1120×780'),
          h('span', { style:{ width:52 } })
        ),
        h('div', { ref:this.scrollRef, onClick:this.focusInput, className:'term-scroll', style:{ flex:1, overflowY:'auto', padding:'26px 30px 10px', fontSize:14, color:'#cdd6e4', cursor:'text' } },
          feedNode,
          promptRow
        ),
        h('div', { style:{ flexShrink:0, padding:'9px 18px', background:'#0b1016', borderTop:'1px solid #161d26', color:'#5c6a7a', fontSize:11.5, letterSpacing:'.02em', display:'flex', gap:18, flexWrap:'wrap' } },
          h('span', {}, h('span', { style:{ color:'#57d9a3' } }, '↑↓'), ' history'),
          h('span', {}, h('span', { style:{ color:'#57d9a3' } }, 'Tab'), ' autocomplete'),
          h('span', {}, h('span', { style:{ color:'#57d9a3' } }, 'help'), ' list commands'),
          h('span', {}, h('span', { style:{ color:'#57d9a3' } }, 'clear'), ' reset')
        )
      )
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(h(TerminalCard));
