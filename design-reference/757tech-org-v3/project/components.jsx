/* 757tech.org — UI components */
const { useState, useMemo, useEffect, useRef } = React;

/* ---------- helpers ---------- */
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtTime(d) {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}${m ? ":" + String(m).padStart(2, "0") : ""} ${ap}`;
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function catColor(cat) {
  const h = (window.CATEGORY_META[cat] || { hue: 195 }).hue;
  return { bg: `oklch(0.94 0.06 ${h})`, fg: `oklch(0.42 0.12 ${h})`, dot: `oklch(0.62 0.15 ${h})` };
}
function relativeLabel(d, now) {
  const days = Math.round((d.setHours ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : d - 0) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000;
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return DOW[d.getDay()];
  return `${MON[d.getMonth()]} ${d.getDate()}`;
}

/* ---------- small atoms ---------- */
function CatBadge({ cat, small }) {
  const c = catColor(cat);
  return (
    <span className="cat-badge" style={{ background: c.bg, color: c.fg, fontSize: small ? 11 : 12 }}>
      <span className="cat-dot" style={{ background: c.dot }}></span>
      {cat}
    </span>
  );
}

function EmailCapture({ variant = "light", placeholder = "you@email.com", cta = "Get the digest" }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const dark = variant === "dark";
  function submit(e) {
    e.preventDefault();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) setDone(true);
  }
  if (done) {
    return (
      <div className={"capture-done " + variant}>
        <span className="check">✓</span> You're on the list — see you in the inbox, 757.
      </div>
    );
  }
  return (
    <form className={"capture " + variant} onSubmit={submit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        aria-label="Email address"
        required
      />
      <button type="submit">{cta}</button>
    </form>
  );
}

/* ---------- header ---------- */
function Header({ onNav }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    ["Events", "events"],
    ["Conferences", "conferences"],
    ["Groups", "groups"],
    ["Submit", "submit"],
  ];
  return (
    <header className={"site-header" + (scrolled ? " scrolled" : "")}>
      <div className="header-inner">
        <a className="brand" href="#top" onClick={(e) => { e.preventDefault(); onNav("top"); }}>
          <img src="assets/757tech-logo.png" alt="757tech — tech community" />
        </a>
        <nav className="nav">
          {links.map(([label, id]) => (
            <a key={id} href={"#" + id} onClick={(e) => { e.preventDefault(); onNav(id); }}>{label}</a>
          ))}
        </nav>
        <div className="header-social">
          <a className="social-ico slack" href="#" aria-label="Join us on Slack" title="Join us on Slack">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
            </svg>
          </a>
          <a className="social-ico discord" href="#" aria-label="Join us on Discord" title="Join us on Discord">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </a>
        </div>
        <button className="btn-coral header-cta" onClick={() => onNav("subscribe")}>Subscribe</button>
      </div>
    </header>
  );
}

/* ---------- hero (3 directions) ---------- */
function WaveDivider({ fill = "#F2E6CE" }) {
  return (
    <svg className="wave-divider" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <path fill={fill} d="M0,64 C180,112 340,16 540,40 C760,66 900,118 1120,92 C1280,73 1380,40 1440,30 L1440,120 L0,120 Z" />
    </svg>
  );
}

function HeroStat({ value, label }) {
  return (
    <div className="hero-stat">
      <div className="hero-stat-v">{value}</div>
      <div className="hero-stat-l">{label}</div>
    </div>
  );
}

function Hero({ style, nextEvent, onNav }) {
  const eyebrow = "Hampton Roads · 757";
  const head = (
    <>
      The front door to tech<br />in the <span className="hl">757</span>
    </>
  );
  const sub = "Every meetup, user group, and regional conference in the 757 — in one tide. Get the weekly digest and never miss what's happening.";

  if (style === "split") {
    return (
      <section className="hero hero-split" id="top">
        <div className="hero-split-grid">
          <div className="hero-copy">
            <h1>{head}</h1>
            <p className="hero-sub">{sub}</p>
            <EmailCapture variant="light" />
            <div className="hero-mini">Free · weekly · unsubscribe anytime</div>
          </div>
          <div className="hero-peek">
            <div className="peek-label">Next up this week</div>
            {nextEvent && <NextEventCard ev={nextEvent} />}
            <button className="peek-all" onClick={() => onNav("events")}>See all upcoming events →</button>
          </div>
        </div>
        <WaveDivider />
      </section>
    );
  }

  if (style === "spotlight") {
    return (
      <section className="hero hero-spotlight" id="top">
        <div className="spotlight-chips" aria-hidden="true">
          {window.CATEGORIES.map((c, i) => (
            <span key={c} className={"float-chip fc" + (i % 6)} style={{ "--h": (window.CATEGORY_META[c] || {}).hue }}>{c}</span>
          ))}
        </div>
        <div className="hero-center">
          <span className="eyebrow dark">{eyebrow}</span>
          <h1>{head}</h1>
          <p className="hero-sub">{sub}</p>
          <div className="center-capture">
            <EmailCapture variant="coral" />
          </div>
          <div className="hero-mini">Free · weekly · unsubscribe anytime</div>
        </div>
        <WaveDivider fill="#ffffff" />
      </section>
    );
  }

  // default: wave banner (deep-sea gradient)
  return (
    <section className="hero hero-wave" id="top">
      <div className="hero-wave-inner">
        <span className="eyebrow dark">{eyebrow}</span>
        <h1>{head}</h1>
        <p className="hero-sub">{sub}</p>
        <div className="center-capture">
          <EmailCapture variant="coral" />
        </div>
        <div className="hero-mini">Free · weekly · unsubscribe anytime</div>
        <div className="hero-stats">
          {window.STATS.map((s) => <HeroStat key={s.label} {...s} />)}
        </div>
      </div>
      <WaveDivider />
    </section>
  );
}

function NextEventCard({ ev }) {
  const c = catColor(ev.category);
  return (
    <a className="next-card" href={ev.url} target="_blank" rel="noreferrer">
      <div className="next-date" style={{ background: c.bg, color: c.fg }}>
        <span className="nd-dow">{DOW[ev.date.getDay()]}</span>
        <span className="nd-day">{ev.date.getDate()}</span>
        <span className="nd-mon">{MON[ev.date.getMonth()]}</span>
      </div>
      <div className="next-body">
        <CatBadge cat={ev.category} small />
        <div className="next-group">{ev.group}</div>
        <div className="next-title">{ev.title}</div>
        <div className="next-meta">{fmtTime(ev.date)} · {ev.venue}, {ev.city}</div>
      </div>
    </a>
  );
}

Object.assign(window, { Header, Hero, EmailCapture, CatBadge, NextEventCard, WaveDivider, fmtTime, sameDay, catColor, relativeLabel, DOW, MON });
