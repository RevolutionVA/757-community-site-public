/* 757tech.org — data layer
   GROUPS are the real Hampton Roads tech community groups provided by the user.
   EVENTS are realistic upcoming instances generated from each group's typical cadence
   (illustrative dates — real dates come from each group's Meetup RSS feed at runtime).
   CONFERENCES are real/regional events near the 757; dates illustrative. */

const GROUPS = [
  { name: "The AI Collective • Hampton Roads", url: "https://linktr.ee/aicollectivehr", category: "AI", tags: ["AI", "No-code", "Automation"] },
  { name: "757 Artificial Intelligence Collective", url: "https://www.meetup.com/757-artificial-intelligence", category: "AI", tags: ["AI", "Open source", "Cloud"] },
  { name: "757 Developers", url: "https://www.meetup.com/757dev/", category: "Development", tags: ["General"] },
  { name: "757 Python Users Group", url: "https://www.meetup.com/757-python-users-group/", category: "Development", tags: ["Python", "Programming"] },
  { name: "757ColorCoded", url: "https://www.meetup.com/757colorcoded/", category: "Development", tags: ["DEI", "Learning"] },
  { name: "Blacks United in Leading Technology — Hampton Roads", url: "https://www.meetup.com/blacks-united-in-leading-technology-hampton-roads/", category: "Community", tags: ["DEI", "General"] },
  { name: "Crypto Over Coffee", url: "https://www.meetup.com/crypto-over-coffee/", category: "Web3", tags: ["Crypto", "Blockchain"] },
  { name: "Hampton Roads .NET User Group", url: "https://www.meetup.com/hampton-roads-net-users-group/", category: "Development", tags: [".NET", "Microsoft"] },
  { name: "Hampton Roads AWS User Group", url: "https://www.meetup.com/hampton-roads-amazon-web-services-user-group/", category: "Cloud", tags: ["AWS", "Cloud"] },
  { name: "Hampton Roads Azure Users Group", url: "https://www.meetup.com/hampton-roads-azure-users-group/", category: "Cloud", tags: ["Azure", "Cloud"] },
  { name: "Hampton Roads Cyber Security for Control Systems", url: "https://www.meetup.com/norfolk-cyber-security-for-control-systems/", category: "Security", tags: ["Cybersecurity", "ICS/SCADA"] },
  { name: "Hampton Roads Designer Collective", url: "https://www.meetup.com/hampton-roads-designer-collective/", category: "Design", tags: ["Graphic design", "Game design"] },
  { name: "Hampton Roads Java Users Group", url: "https://www.meetup.com/hampton-roads-java-users-group", category: "Development", tags: ["Java", "Kotlin", "JVM"] },
  { name: "Hampton Roads SQL Server User Group", url: "https://www.meetup.com/Hampton-Roads-SQL-Server-User-Group/", category: "Development", tags: ["SQL", "Data"] },
  { name: "Hampton Roads Unity User Group", url: "https://www.meetup.com/Hampton-Roads-Unity-User-Group/", category: "Development", tags: ["Unity", "Game dev"] },
  { name: "ISSA Hampton Roads", url: "https://www.meetup.com/issa-hampton-roads/", category: "Security", tags: ["Infosec", "Security"] },
  { name: "IxDA Hampton Roads (UX/UI)", url: "https://www.linkedin.com/company/ixdahr/", category: "Design", tags: ["UX", "UI", "Research"] },
  { name: "Norfolk.js", url: "https://www.meetup.com/NorfolkJS/", category: "Development", tags: ["JavaScript", "Web dev"] },
  { name: "Platform Engineering & DevOps — Hampton Roads", url: "https://www.meetup.com/platform-eng-and-devops/", category: "Cloud", tags: ["DevOps", "Automation"] },
  { name: "Williamsburg Software Developers Group", url: "https://www.meetup.com/the-williamsburg-software-developers-group/", category: "Development", tags: ["Software", "Programming"] },
  { name: "Virginia Beach Bitcoin", url: "https://www.meetup.com/virginia-beach-bitcoin/", category: "Web3", tags: ["Bitcoin", "Crypto"] },
  { name: "Virginia Beach Wix Studio Community", url: "https://www.meetup.com/virginia-beach-wix-studio-community/", category: "Design", tags: ["Wix", "No-code"] },
  { name: "WordPress Hampton Roads", url: "https://www.meetup.com/WordPresshr/", category: "Development", tags: ["WordPress", "Web dev"] },
];

const CATEGORIES = ["AI", "Development", "Cloud", "Security", "Design", "Web3", "Community"];

// Venues across the region
const VENUES = [
  { v: "Slover Library", city: "Norfolk" },
  { v: "DOMA Technologies", city: "Virginia Beach" },
  { v: "Assembly", city: "Norfolk" },
  { v: "1701 / Assembly", city: "Norfolk" },
  { v: "Gather Coworking", city: "Norfolk" },
  { v: "TowneBank", city: "Suffolk" },
  { v: "Old Dominion University", city: "Norfolk" },
  { v: "Christopher Newport University", city: "Newport News" },
  { v: "Three Notch'd Brewing", city: "Virginia Beach" },
  { v: "Smartmouth Brewing", city: "Norfolk" },
  { v: "Online via Discord", city: "Virtual" },
];

// Each group keyed by a recurring pattern; we synthesize the next ~6 weeks of events.
// pattern: { dow: 0-6, nth: 1-4 (nth weekday of month) | "weekly", hour, topic }
const SCHEDULE = {
  "757 Python Users Group": { nth: 2, dow: 3, hour: 18, venue: 0, topic: "Pythonic patterns & a lightning-talk night" },
  "Norfolk.js": { nth: 3, dow: 2, hour: 18, venue: 2, topic: "Modern JS: signals, edge rendering & live demos" },
  "Hampton Roads AWS User Group": { nth: 1, dow: 2, hour: 18, venue: 1, topic: "Serverless at the shore: Lambda + EventBridge" },
  "Hampton Roads Azure Users Group": { nth: 2, dow: 4, hour: 18, venue: 6, topic: "Azure AI Foundry & landing zones" },
  "757 Artificial Intelligence Collective": { nth: 4, dow: 3, hour: 18, venue: 4, topic: "Open-weights models & local inference" },
  "The AI Collective • Hampton Roads": { nth: 2, dow: 1, hour: 18, venue: 4, topic: "The human side of AI: building responsibly" },
  "Hampton Roads .NET User Group": { nth: 3, dow: 4, hour: 18, venue: 1, topic: ".NET 9, Blazor & minimal APIs" },
  "Hampton Roads Java Users Group": { nth: 2, dow: 2, hour: 18, venue: 0, topic: "Virtual threads & the modern JVM" },
  "757 Developers": { nth: 1, dow: 4, hour: 18, venue: 3, topic: "Cross-group dev social + show & tell" },
  "757ColorCoded": { nth: 3, dow: 6, hour: 11, venue: 4, topic: "Code, coffee & community study hall" },
  "ISSA Hampton Roads": { nth: 2, dow: 3, hour: 11, venue: 6, topic: "Threat landscape briefing & lunch" },
  "Hampton Roads Cyber Security for Control Systems": { nth: 4, dow: 2, hour: 18, venue: 6, topic: "Securing OT, ICS & SCADA systems" },
  "Crypto Over Coffee": { nth: 1, dow: 6, hour: 9, venue: 8, topic: "Blockchain use-cases over a morning brew" },
  "Virginia Beach Bitcoin": { nth: 2, dow: 4, hour: 18, venue: 8, topic: "How Bitcoin is reshaping money" },
  "Hampton Roads Designer Collective": { nth: 3, dow: 3, hour: 18, venue: 9, topic: "Portfolio night & design critique" },
  "IxDA Hampton Roads (UX/UI)": { nth: 1, dow: 3, hour: 18, venue: 2, topic: "Research-driven product design" },
  "Platform Engineering & DevOps — Hampton Roads": { nth: 2, dow: 2, hour: 18, venue: 1, topic: "Platform engineering & golden paths" },
  "Hampton Roads SQL Server User Group": { nth: 4, dow: 4, hour: 18, venue: 6, topic: "Query tuning & the data platform" },
  "Hampton Roads Unity User Group": { nth: 2, dow: 5, hour: 18, venue: 7, topic: "Game jam prep & Unity deep-dive" },
  "Williamsburg Software Developers Group": { nth: 3, dow: 1, hour: 18, venue: 5, topic: "Architecture patterns & local builds" },
  "WordPress Hampton Roads": { nth: 1, dow: 1, hour: 18, venue: 10, topic: "Blocks, themes & site speed" },
  "Virginia Beach Wix Studio Community": { nth: 3, dow: 5, hour: 17, venue: 10, topic: "Wix Studio build night" },
  "Blacks United in Leading Technology — Hampton Roads": { nth: 4, dow: 4, hour: 18, venue: 4, topic: "Leadership in tech: panel & networking" },
};

// Returns the date of the nth given weekday in a month
function nthWeekday(year, month, dow, nth) {
  const first = new Date(year, month, 1);
  let day = 1 + ((dow - first.getDay() + 7) % 7) + (nth - 1) * 7;
  const d = new Date(year, month, day);
  return d.getMonth() === month ? d : null;
}

function buildEvents(fromDate, weeks = 7) {
  const groupByName = Object.fromEntries(GROUPS.map((g) => [g.name, g]));
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + weeks * 7);
  const events = [];
  let id = 1;
  // iterate this month and next two months
  for (let mOff = 0; mOff <= 2; mOff++) {
    const probe = new Date(start.getFullYear(), start.getMonth() + mOff, 1);
    const yr = probe.getFullYear();
    const mo = probe.getMonth();
    for (const [gname, s] of Object.entries(SCHEDULE)) {
      const g = groupByName[gname];
      if (!g) continue;
      const d = nthWeekday(yr, mo, s.dow, s.nth);
      if (!d) continue;
      d.setHours(s.hour, 0, 0, 0);
      if (d >= start && d <= end) {
        const venue = VENUES[s.venue];
        events.push({
          id: id++,
          group: g.name,
          url: g.url,
          category: g.category,
          tags: g.tags,
          title: s.topic,
          date: d,
          venue: venue.v,
          city: venue.city,
        });
      }
    }
  }
  events.sort((a, b) => a.date - b.date);
  return events;
}

const CONFERENCES = [
  {
    name: "RevolutionConf",
    city: "Virginia Beach, VA",
    venue: "Virginia Beach Convention Center",
    month: "Sep 2026",
    sort: new Date(2026, 8, 18),
    blurb: "The region's flagship multi-track developer conference — web, cloud, mobile & more.",
    tags: ["Development", "Cloud", "Multi-track"],
    url: "#",
  },
  {
    name: "BSides 757",
    city: "Newport News, VA",
    venue: "Christopher Newport University",
    month: "Oct 2026",
    sort: new Date(2026, 9, 10),
    blurb: "Community-run security conference with hands-on villages, CTF & local researchers.",
    tags: ["Security", "Infosec", "CTF"],
    url: "#",
  },
  {
    name: "RVASec",
    city: "Richmond, VA",
    venue: "Dominion Energy Center",
    month: "Jun 2026",
    sort: new Date(2026, 5, 25),
    blurb: "Virginia's largest security conference — a short drive up I-64 from the 757.",
    tags: ["Security", "Regional"],
    url: "#",
  },
  {
    name: "MODSIM World",
    city: "Norfolk, VA",
    venue: "Norfolk Waterside Marriott",
    month: "May 2026",
    sort: new Date(2026, 4, 12),
    blurb: "Modeling, simulation & training research — a Hampton Roads specialty industry.",
    tags: ["Simulation", "Research", "Defense"],
    url: "#",
  },
];

const STATS = [
  { value: GROUPS.length, label: "Community groups" },
  { value: "7", label: "Cities & counties" },
  { value: "40+", label: "Events each month" },
  { value: "1", label: "Front door" },
];

const CATEGORY_META = {
  AI: { hue: 192 },
  Development: { hue: 168 },
  Cloud: { hue: 200 },
  Security: { hue: 12 },
  Design: { hue: 280 },
  Web3: { hue: 40 },
  Community: { hue: 150 },
};

Object.assign(window, { GROUPS, CATEGORIES, CONFERENCES, STATS, CATEGORY_META, buildEvents });
