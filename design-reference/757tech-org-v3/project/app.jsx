/* 757tech.org — app root */
const { useState: useStateA, useMemo: useMemoA } = React;

const NOW = new Date(2026, 5, 5, 12, 0, 0); // June 5, 2026

const ACCENTS = {
  coral: "#FF6F59",
  tide: "#0AB6D6",
  seafoam: "#5FD0BE",
};
const HEAD_FONTS = {
  "Baloo 2": "'Baloo 2', system-ui, sans-serif",
  "Fredoka": "'Fredoka', system-ui, sans-serif",
  "Outfit": "'Outfit', system-ui, sans-serif",
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroStyle": "split",
  "accent": "coral",
  "headFont": "Baloo 2",
  "showCalendar": true,
  "showGroups": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const events = useMemoA(() => window.buildEvents(NOW, 8), []);
  const nextEvent = events[0];

  function onNav(id) {
    if (id === "top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (id === "subscribe") { document.getElementById("subscribe")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  const accentVal = ACCENTS[t.accent] || ACCENTS.coral;
  const headFontVal = HEAD_FONTS[t.headFont] || HEAD_FONTS["Baloo 2"];

  return (
    <div className="app" style={{ "--accent": accentVal, "--font-head": headFontVal }}>
      <window.Header onNav={onNav} />
      <main>
        <window.Hero style={t.heroStyle} nextEvent={nextEvent} onNav={onNav} />
        <window.EventsExplorer events={events} now={NOW} showCalendar={t.showCalendar} />
        <window.Conferences />
        {t.showGroups && <window.Groups />}
        <window.SubmitCTA />
        <window.Newsletter />
      </main>
      <window.Footer onNav={onNav} />

      <TweaksPanel>
        <TweakSection label="Hero" />
        <TweakRadio
          label="Layout"
          value={t.heroStyle}
          options={["wave", "split", "spotlight"]}
          onChange={(v) => setTweak("heroStyle", v)}
        />
        <TweakSection label="Brand" />
        <TweakColor
          label="Accent / CTA"
          value={accentVal}
          options={[ACCENTS.coral, ACCENTS.tide, ACCENTS.seafoam]}
          onChange={(v) => {
            const key = Object.keys(ACCENTS).find((k) => ACCENTS[k].toLowerCase() === v.toLowerCase()) || "coral";
            setTweak("accent", key);
          }}
        />
        <TweakSelect
          label="Headline font"
          value={t.headFont}
          options={Object.keys(HEAD_FONTS)}
          onChange={(v) => setTweak("headFont", v)}
        />
        <TweakSection label="Sections" />
        <TweakToggle label="Calendar view" value={t.showCalendar} onChange={(v) => setTweak("showCalendar", v)} />
        <TweakToggle label="Groups directory" value={t.showGroups} onChange={(v) => setTweak("showGroups", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
