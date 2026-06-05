/* 757tech.org — page sections */
const { useState: useStateS, useMemo: useMemoS } = React;

/* ---------- Events explorer: filters + list + calendar ---------- */
function EventCard({ ev, now }) {
  const c = window.catColor(ev.category);
  const rel = window.relativeLabel(ev.date, now);
  return (
    <a className="event-card" href={ev.url} target="_blank" rel="noreferrer">
      <div className="ec-date">
        <span className="ec-dow">{window.DOW[ev.date.getDay()]}</span>
        <span className="ec-day">{ev.date.getDate()}</span>
        <span className="ec-mon">{window.MON[ev.date.getMonth()]}</span>
      </div>
      <div className="ec-body">
        <div className="ec-top">
          <window.CatBadge cat={ev.category} />
          <span className="ec-rel">{rel}</span>
        </div>
        <div className="ec-group">{ev.group}</div>
        <div className="ec-title">{ev.title}</div>
        <div className="ec-meta">
          <span>🕒 {window.fmtTime(ev.date)}</span>
          <span>📍 {ev.venue}, {ev.city}</span>
        </div>
        <div className="ec-tags">
          {ev.tags.map((t) => <span key={t} className="ec-tag">{t}</span>)}
        </div>
      </div>
      <span className="ec-arrow">→</span>
    </a>
  );
}

function CalendarView({ events, now }) {
  const [weekOffset, setWeekOffset] = useStateS(0);
  // start of the week (Sunday) containing `now`, shifted by weekOffset
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + weekOffset * 7);
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);

  // build the 7 days with their events
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
    const evs = events
      .filter((e) => window.sameDay(e.date, d))
      .sort((a, b) => a.date - b.date);
    days.push({ date: d, events: evs, isToday: window.sameDay(d, now) });
  }
  const weekCount = days.reduce((n, d) => n + d.events.length, 0);

  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${window.MON[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekEnd.getDate()}`
      : `${window.MON[weekStart.getMonth()]} ${weekStart.getDate()} – ${window.MON[weekEnd.getMonth()]} ${weekEnd.getDate()}`;

  return (
    <div className="calendar week">
      <div className="cal-head">
        <button className="cal-nav" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week">‹</button>
        <div className="cal-title">
          {rangeLabel}
          <span className="cal-sub">{weekCount} event{weekCount === 1 ? "" : "s"} · {weekStart.getFullYear()}</span>
        </div>
        <button className="cal-nav" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week">›</button>
        {weekOffset !== 0 && (
          <button className="cal-today-btn" onClick={() => setWeekOffset(0)}>This week</button>
        )}
      </div>

      <div className="week-grid">
        {days.map((day) => (
          <div key={day.date.toISOString()} className={"week-col" + (day.isToday ? " today" : "") + (day.events.length ? "" : " empty")}>
            <div className="week-col-head">
              <span className="wc-dow">{window.DOW[day.date.getDay()]}</span>
              <span className="wc-day">{day.date.getDate()}</span>
              {day.isToday && <span className="wc-today">Today</span>}
            </div>
            <div className="week-col-body">
              {day.events.length ? (
                day.events.map((e) => {
                  const c = window.catColor(e.category);
                  return (
                    <a key={e.id} className="week-ev" href={e.url} target="_blank" rel="noreferrer" style={{ "--c": c.dot }}>
                      <div className="we-time">{window.fmtTime(e.date)}</div>
                      <div className="we-group">{e.group}</div>
                      <div className="we-title">{e.title}</div>
                      <div className="we-loc">{e.city}</div>
                    </a>
                  );
                })
              ) : (
                <div className="week-empty">·</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {weekCount === 0 && (
        <div className="cal-hint">No meetups this week — try the next one →</div>
      )}
    </div>
  );
}

function EventsExplorer({ events, now, showCalendar }) {
  const [cat, setCat] = useStateS("All");
  const [q, setQ] = useStateS("");
  const [view, setView] = useStateS("list");
  const cats = ["All", ...window.CATEGORIES];

  const filtered = useMemoS(() => {
    return events.filter((e) => {
      if (cat !== "All" && e.category !== cat) return false;
      if (q) {
        const hay = (e.group + " " + e.title + " " + e.tags.join(" ") + " " + e.city + " " + e.category).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [events, cat, q]);

  const counts = useMemoS(() => {
    const m = { All: events.length };
    window.CATEGORIES.forEach((c) => (m[c] = events.filter((e) => e.category === c).length));
    return m;
  }, [events]);

  return (
    <section className="section events-section" id="events">
      <div className="section-head">
        <div>
          <span className="kicker">What's happening</span>
          <h2>Upcoming in the 757</h2>
        </div>
        <p className="section-lead">Real meetups from {window.GROUPS.length} community groups across Hampton Roads. Filter, search, or browse the calendar.</p>
      </div>

      <div className="explorer-bar">
        <div className="filter-chips">
          {cats.map((c) => (
            <button
              key={c}
              className={"chip" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c}<span className="chip-count">{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="explorer-tools">
          <div className="search">
            <span className="search-ico">⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search groups, topics, tags…" aria-label="Search events" />
            {q && <button className="search-clear" onClick={() => setQ("")} aria-label="Clear">×</button>}
          </div>
          {showCalendar && (
            <div className="view-toggle">
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List</button>
              <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>Calendar</button>
            </div>
          )}
        </div>
      </div>

      {view === "list" || !showCalendar ? (
        filtered.length ? (
          <div className="event-grid">
            {filtered.map((e) => <EventCard key={e.id} ev={e} now={now} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-emoji">🏝️</div>
            <p>No events match that filter — try another category or clear your search.</p>
            <button className="btn-ghost" onClick={() => { setCat("All"); setQ(""); }}>Reset filters</button>
          </div>
        )
      ) : (
        <CalendarView events={filtered} now={now} />
      )}
    </section>
  );
}

/* ---------- Conferences ---------- */
function Conferences() {
  return (
    <section className="section conf-section" id="conferences">
      <div className="section-head">
        <div>
          <span className="kicker">Worth the drive</span>
          <h2>Regional conferences</h2>
        </div>
        <p className="section-lead">The bigger gatherings — in the 757 and a short hop up the road in Virginia.</p>
      </div>
      <div className="conf-grid">
        {window.CONFERENCES.map((c) => (
          <a key={c.name} className="conf-card" href={c.url}>
            <div className="conf-photo" role="img" aria-label={c.name + " — venue photo placeholder"}>
              <span className="ph-label">conference photo</span>
              <span className="conf-month">{c.month}</span>
            </div>
            <div className="conf-body">
              <h3>{c.name}</h3>
              <div className="conf-loc">📍 {c.venue} · {c.city}</div>
              <p>{c.blurb}</p>
              <div className="conf-tags">
                {c.tags.map((t) => <span key={t} className="conf-tag">{t}</span>)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ---------- Groups directory ---------- */
function Groups() {
  const [cat, setCat] = useStateS("All");
  const cats = ["All", ...window.CATEGORIES];
  const filtered = window.GROUPS.filter((g) => cat === "All" || g.category === cat);
  return (
    <section className="section groups-section" id="groups">
      <div className="section-head">
        <div>
          <span className="kicker">The community</span>
          <h2>{window.GROUPS.length} groups, one tide</h2>
        </div>
        <p className="section-lead">From Python to platform engineering, infosec to UX — find your people.</p>
      </div>
      <div className="filter-chips center">
        {cats.map((c) => (
          <button key={c} className={"chip" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="groups-grid">
        {filtered.map((g) => {
          const col = window.catColor(g.category);
          return (
            <a key={g.name} className="group-card" href={g.url} target="_blank" rel="noreferrer">
              <span className="group-mark" style={{ background: col.bg, color: col.fg }}>{g.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}</span>
              <div className="group-info">
                <div className="group-name">{g.name}</div>
                <div className="group-tags">{g.tags.join(" · ")}</div>
              </div>
              <span className="group-arrow">↗</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Submit CTA ---------- */
function SubmitCTA() {
  return (
    <section className="section submit-section" id="submit">
      <div className="submit-card">
        <div className="submit-copy">
          <h2>Running a group or event?</h2>
          <p>Get it in front of every technologist in Hampton Roads. List your meetup, add a one-off event, or feature a conference — it's free.</p>
          <div className="submit-actions">
            <button className="btn-coral">Submit an event</button>
            <button className="btn-ghost-dark">Add your group</button>
          </div>
        </div>
        <div className="submit-art" aria-hidden="true">
          <div className="art-wave"></div>
          <div className="art-chip">＋</div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Newsletter ---------- */
function Newsletter() {
  return (
    <section className="section news-section" id="subscribe">
      <div className="news-inner">
        <span className="kicker light">The 757 digest</span>
        <h2>One email. Every Monday.<br />All of 757 tech.</h2>
        <p>A short, scannable rundown of the week's meetups, new groups, job leads, and conferences — written for people who'd rather be building.</p>
        <div className="news-capture">
          <window.EmailCapture variant="onDeep" cta="Subscribe free" />
        </div>
        <div className="news-mini">Join the wave · no spam · unsubscribe anytime</div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer({ onNav }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="assets/757tech-logo.png" alt="757tech" />
          <p>The front door for technologists in the 757 — Norfolk, Virginia Beach, Chesapeake, Newport News, Hampton, Suffolk, Portsmouth & Williamsburg.</p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>Explore</h4>
            <a href="#events" onClick={(e) => { e.preventDefault(); onNav("events"); }}>Events</a>
            <a href="#conferences" onClick={(e) => { e.preventDefault(); onNav("conferences"); }}>Conferences</a>
            <a href="#groups" onClick={(e) => { e.preventDefault(); onNav("groups"); }}>Groups</a>
          </div>
          <div className="footer-col">
            <h4>Get involved</h4>
            <a href="#submit" onClick={(e) => { e.preventDefault(); onNav("submit"); }}>Submit an event</a>
            <a href="#submit" onClick={(e) => { e.preventDefault(); onNav("submit"); }}>Add your group</a>
            <a href="#subscribe" onClick={(e) => { e.preventDefault(); onNav("subscribe"); }}>Newsletter</a>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <a href="#">Discord</a>
            <a href="#">LinkedIn</a>
            <a href="#">GitHub</a>
          </div>
        </div>
      </div>
      <div className="footer-base">
        <span>© 2026 757tech.org · Built by the community, for the community.</span>
        <span className="footer-tag">Made in Hampton Roads 🌊</span>
      </div>
    </footer>
  );
}

Object.assign(window, { EventsExplorer, EventCard, CalendarView, Conferences, Groups, SubmitCTA, Newsletter, Footer });
