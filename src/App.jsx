import { useState, useEffect, useCallback, useRef } from "react";
import { getBalances, upsertBalance, deleteBalance, subscribeBalances, getTurns, logTurn as sbLogTurn, deleteTurn as sbDeleteTurn, subscribeTurns } from "./supabase";

const C = { chase: "#5B9BD5", amex: "#D4A840", green: "#5ABF8A", red: "#E07070", purple: "#A07EDB", teal: "#4CC9B0", coral: "#E0826A" };
const UI = { bg: "#0F0F0E", bg2: "#1A1A18", bg3: "#242422", bg4: "#2E2E2B", border: "#333330", text: "#EEEDEA", text2: "#A8A7A2", text3: "#6E6D69" };
const mono = "'JetBrains Mono', monospace";

const SWIPE = [
  { cat: "Groceries", where: "Trader Joe's, Whole Foods", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Dining out", where: "Restaurants, bars, cafes", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Delivery", where: "DoorDash, Uber Eats", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Uber rides", where: "After $10/mo Uber Cash credit", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Travel booking", where: "Chase Travel portal", card: "Sapphire Reserve", who: "Eric", rate: "8x UR", c: "chase" },
  { cat: "Travel booking", where: "Direct with airline/hotel", card: "Sapphire Reserve", who: "Eric", rate: "4x UR", c: "chase" },
  { cat: "Costco", where: "In-store, alternate who pays", card: "CSR or CSP", who: "Take turns", rate: "1x UR", c: "chase" },
  { cat: "Gas", where: "Any gas station", card: "CSR or CSP", who: "Whoever", rate: "1x UR", c: "chase" },
  { cat: "Business spend", where: "Internet, phone, ads, shipping", card: "Biz card", who: "Eric", rate: "3x or 1.5x", c: "teal" },
  { cat: "Personal spend", where: "Amazon, shopping, everything else", card: "CSR or CSP", who: "Eric, Christine", rate: "1-3x UR", c: "chase" },
  { cat: "Dining (no AMEX)", where: "Places that won't accept AMEX", card: "CSR or CSP", who: "Whoever", rate: "3x UR", c: "chase" },
];
const CARDS_ERIC = [
  { name: "Chase Sapphire Reserve", fee: 795, use: "Daily driver, travel, Costco (Visa), lounge access", status: "active", c: C.chase },
  { name: "AMEX Gold", fee: 325, use: "All groceries at TJ's/WF, dining, delivery. Christine has AU card.", status: "active", c: C.amex },
  { name: "Business card (April)", fee: 0, use: "Try Ink Biz Preferred first, then IBU $0 or AMEX BBP $0", status: "pending", c: C.teal },
  { name: "WF Autograph", fee: 0, use: "Keep open for credit history. Do not use.", status: "drawer", c: UI.text3 },
];
const CARDS_CHRISTINE = [
  { name: "Chase Sapphire Preferred", fee: 95, use: "Daily driver, personal spend, Costco (Visa)", status: "active", c: C.chase },
  { name: "Chase Freedom", fee: 0, use: "5% rotating quarterly categories. Check each quarter.", status: "active", c: C.chase },
  { name: "AMEX Gold (authorized user)", fee: 0, use: "Eric's card. Use for groceries and dining.", status: "active", c: C.amex },
  { name: "Marriott Bonvoy Boundless", fee: 95, use: "Keep if using free night + airline credit. Reassess Aug 1.", status: "review", c: UI.text3 },
];
const BOTH_P = [
  { n: "Air Canada Aeroplan", u: "Star Alliance global. Most flexible all-around program.", r: "1:1", s: true },
  { n: "British Airways Avios", u: "Short domestic AA flights 7,500-12,500 pts one-way.", r: "1:1", s: true },
  { n: "Air France/KLM Flying Blue", u: "Europe on AF/KLM + SkyTeam. Monthly promo deals.", r: "1:1" },
  { n: "Virgin Atlantic", u: "Book ANA first class or Delta flights at sweet-spot rates.", r: "1:1" },
  { n: "Singapore KrisFlyer", u: "Premium cabin to/around Asia.", r: "1:1" },
  { n: "Emirates Skywards", u: "Emirates premium cabin. Watch fuel surcharges.", r: "1:1" },
  { n: "JetBlue TrueBlue", u: "Domestic, especially East Coast.", r: "1:1" },
  { n: "Aer Lingus AerClub", u: "Flights to Ireland. ~13K Avios from East Coast.", r: "1:1" },
  { n: "Iberia Plus", u: "Off-peak Spain. Oneworld partners.", r: "1:1" },
];
const CHASE_P = [
  { n: "World of Hyatt", u: "Best hotel transfer in any program. 2-4cpp. Always check first.", r: "1:1 · ~1.8cpp", s: true },
  { n: "United MileagePlus", u: "Direct United + Star Alliance. Big SFO hub.", r: "1:1" },
  { n: "Southwest Rapid Rewards", u: "Flexible domestic. Free changes. Big in LA.", r: "1:1 · ~1.4cpp" },
  { n: "IHG One Rewards", u: "Budget hotels. Large global footprint.", r: "1:1 · ~0.5cpp" },
  { n: "Marriott Bonvoy", u: "Only as top-up. Watch for transfer bonuses.", r: "1:1 · ~0.7cpp" },
  { n: "Wyndham Rewards", u: "Budget/mid-range. Fixed award chart.", r: "1:1 · ~0.9cpp" },
];
const AMEX_P = [
  { n: "ANA Mileage Club", u: "RT biz class Japan 75-88K. Best MR redemption. Must book RT.", r: "1:1", s: true },
  { n: "Delta SkyMiles", u: "Direct Delta. Massive LAX/SFO presence. Dynamic pricing.", r: "1:1 · ~1.2cpp", s: true },
  { n: "Avianca LifeMiles", u: "Star Alliance at lower rates. Great for South America biz.", r: "1:1" },
  { n: "Cathay Pacific Asia Miles", u: "Premium cabin around Asia. Oneworld.", r: "1:1" },
  { n: "Qantas Frequent Flyer", u: "Australia/NZ. Oneworld bookings.", r: "1:1" },
  { n: "Qatar Privilege Club", u: "Qsuites. Oneworld partner awards.", r: "1:1" },
  { n: "Etihad Guest", u: "ANA/AA partner bookings. Strict cancel policy.", r: "1:1" },
  { n: "Hawaiian Airlines", u: "Flights to Hawaii.", r: "1:1" },
  { n: "AeroMexico Club Premier", u: "Mexico + SkyTeam partners.", r: "1:1" },
  { n: "Hilton Honors", u: "Wait for 30-40% transfer bonuses.", r: "1:2 · ~0.5cpp/MR" },
  { n: "Marriott Bonvoy", u: "Poor value. Only as small top-up.", r: "1:1 · ~0.7cpp" },
  { n: "Choice Privileges", u: "Budget hotels. Rarely worth it.", r: "1:1 · ~0.6cpp" },
];
const KEY_DATES = [
  { d: "Apr 2026", w: "Open business card. Popup-test Ink Biz Preferred.", c: C.teal },
  { d: "Aug 1", w: "Marriott Bonvoy renews $95. Downgrade to Bold $0 by Aug 30 if unused.", c: C.coral },
  { d: "~Sep", w: "AMEX Gold SUB deadline ($6K/6mo).", c: C.amex },
  { d: "Sep 2026", w: "CSR renews $795. Tally credits, decide keep or downgrade.", c: C.chase },
];

const DEFAULT_PROGS = [
  { id: "ur-e", label: "Chase UR (Eric CSR)", value: 0, color: C.chase, sys: true, updated: null },
  { id: "ur-c", label: "Chase UR (Christine CSP + Freedom)", value: 0, color: C.chase, sys: true, updated: null },
  { id: "mr", label: "AMEX MR (Gold)", value: 0, color: C.amex, sys: true, updated: null },
];

const Badge = ({ type, children }) => {
  const m = { chase: [C.chase, "#162538"], amex: [C.amex, "#2A2410"], teal: [C.teal, "#0F2E26"] };
  const [fg, bg] = m[type] || m.chase;
  return <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 4, background: bg, color: fg, whiteSpace: "nowrap" }}>{children}</span>;
};
const Dot = ({ color, size = 7 }) => <span style={{ display: "inline-block", width: size, height: size, borderRadius: 2, background: color, marginRight: 6, verticalAlign: "middle", flexShrink: 0 }} />;
const PC = ({ p, color }) => (
  <div style={{ background: p.s ? `${color}11` : UI.bg2, border: `1px solid ${p.s ? color + "44" : UI.border}`, borderRadius: 6, padding: "8px 10px" }}>
    <div style={{ fontWeight: 600, fontSize: 12, color: p.s ? color : UI.text }}>{p.n}</div>
    <div style={{ fontSize: 11, color: UI.text2, marginTop: 1 }}>{p.u}</div>
    <div style={{ fontFamily: mono, fontSize: 10, color: UI.text3, marginTop: 3 }}>{p.r}</div>
  </div>
);
const Note = ({ accent, children }) => (
  <div style={{ background: UI.bg2, border: `1px solid ${UI.border}`, borderLeft: accent ? `3px solid ${accent}` : undefined, borderRadius: 8, padding: "10px 13px", marginTop: 10, fontSize: 12, color: UI.text2, lineHeight: 1.6 }}>{children}</div>
);
const fmtDate = (d) => {
  if (!d) return "never";
  const dt = new Date(d); const now = new Date(); const diff = Math.floor((now - dt) / 86400000);
  if (diff === 0) return "today"; if (diff === 1) return "yesterday"; if (diff < 7) return `${diff}d ago`;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const statusStyle = (s) => {
  if (s === "active") return { bg: "#142E20", color: C.green, label: "Active" };
  if (s === "pending") return { bg: "#0F2E26", color: C.teal, label: "Pending" };
  if (s === "drawer") return { bg: UI.bg4, color: UI.text3, label: "Sock drawer" };
  if (s === "review") return { bg: "#351E16", color: C.coral, label: "Reassess" };
  return { bg: UI.bg4, color: UI.text3, label: s };
};

const fromDB = (row) => ({ id: row.id, label: row.label, value: row.value || 0, color: row.color || UI.text2, sys: row.is_system || false, updated: row.updated_at });

export default function App() {
  const [tab, setTab] = useState("swipe");
  const [progs, setProgs] = useState(DEFAULT_PROGS);
  const [turns, setTurns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newN, setNewN] = useState("");
  const [partOpen, setPartOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(null);
  const [synced, setSynced] = useState(false);
  const skipRef = useRef(false);

  useEffect(() => { (async () => {
    const [balData, turnsData] = await Promise.all([getBalances(), getTurns()]);
    if (balData && balData.length > 0) { setProgs(balData.map(fromDB)); setSynced(true); }
    if (turnsData) setTurns(turnsData);
    setLoaded(true);
  })(); }, []);

  useEffect(() => {
    const unsub = subscribeBalances((payload) => {
      if (skipRef.current) { skipRef.current = false; return; }
      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        setProgs(prev => { const row = fromDB(payload.new); const exists = prev.find(p => p.id === row.id); return exists ? prev.map(p => p.id === row.id ? row : p) : [...prev, row]; });
      }
      if (payload.eventType === "DELETE") setProgs(prev => prev.filter(p => p.id !== payload.old.id));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeTurns((payload) => {
      if (payload.eventType === "INSERT") setTurns(prev => [payload.new, ...prev].slice(0, 50));
      if (payload.eventType === "DELETE") setTurns(prev => prev.filter(t => t.id !== payload.old.id));
    });
    return unsub;
  }, []);

  const upd = useCallback((id, v) => {
    const val = parseInt(v.replace(/\D/g, "")) || 0;
    const ts = new Date().toISOString();
    setProgs(prev => { const next = prev.map(x => x.id === id ? { ...x, value: val, updated: ts } : x); const item = next.find(x => x.id === id); if (item) { skipRef.current = true; upsertBalance(item); } return next; });
  }, []);
  const addP = useCallback(() => { if (!newN.trim()) return; const item = { id: `c-${Date.now()}`, label: newN.trim(), value: 0, color: UI.text2, sys: false, updated: null }; setProgs(prev => [...prev, item]); skipRef.current = true; upsertBalance(item); setNewN(""); setAddOpen(false); }, [newN]);
  const rm = useCallback((id) => { setProgs(prev => prev.filter(x => x.id !== id)); deleteBalance(id); }, []);

  const handleLog = useCallback(async (bucket, person) => { const entry = { id: `t-${Date.now()}`, bucket, person, paid_at: new Date().toISOString() }; setTurns(prev => [entry, ...prev]); await sbLogTurn(bucket, person); }, []);
  const handleUndo = useCallback(async (bucket) => { const last = turns.find(t => t.bucket === bucket); if (!last) return; setTurns(prev => prev.filter(t => t.id !== last.id)); await sbDeleteTurn(last.id); }, [turns]);
  const handleReset = useCallback(async (bucket) => { const ids = turns.filter(t => t.bucket === bucket).map(t => t.id); setTurns(prev => prev.filter(t => t.bucket !== bucket)); for (const id of ids) await sbDeleteTurn(id); }, [turns]);
  const getLastTurn = (bucket) => turns.find(t => t.bucket === bucket);
  const getTurnCounts = (bucket) => {
    const bt = turns.filter(t => t.bucket === bucket);
    const eric = bt.filter(t => t.person === "Eric").length;
    const christine = bt.filter(t => t.person === "Christine").length;
    return { eric, christine, diff: Math.abs(eric - christine) };
  };
  const getNextPerson = (bucket) => {
    const c = getTurnCounts(bucket);
    if (c.eric === 0 && c.christine === 0) return null;
    if (c.eric === c.christine) return null;
    return c.eric > c.christine ? "Christine" : "Eric";
  };
  const getHistory = (bucket) => turns.filter(t => t.bucket === bucket).slice(0, 5);

  const urProgs = progs.filter(p => p.color === C.chase);
  const mrProgs = progs.filter(p => p.color === C.amex);
  const urT = urProgs.reduce((s, p) => s + p.value, 0);
  const mrT = mrProgs.reduce((s, p) => s + p.value, 0);
  const urUpdated = urProgs.filter(p => p.updated).sort((a, b) => new Date(b.updated) - new Date(a.updated))[0]?.updated;
  const mrUpdated = mrProgs.filter(p => p.updated).sort((a, b) => new Date(b.updated) - new Date(a.updated))[0]?.updated;
  const totalFee = [...CARDS_ERIC, ...CARDS_CHRISTINE].reduce((s, c) => s + c.fee, 0);
  const tabs = [{ id: "swipe", l: "Swipe" }, { id: "turns", l: "Turns" }, { id: "trip", l: "Trips" }, { id: "balances", l: "Points" }, { id: "cards", l: "Cards" }];

  if (!loaded) return <div style={{ fontFamily: "'DM Sans', sans-serif", background: UI.bg, color: UI.text3, padding: 40, textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: UI.bg, color: UI.text, minHeight: "100vh", padding: "16px 16px 20px", maxWidth: 840, margin: "0 auto", lineHeight: 1.55 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${UI.border}` }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4 }}>Card Strategy</h1>
          <p style={{ fontSize: 11, color: UI.text3, marginTop: 2 }}>Eric + Christine · March 2026{synced && <span style={{ color: C.green, marginLeft: 6 }}>synced</span>}</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: C.chase }}>{urT.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: UI.text3, textTransform: "uppercase", letterSpacing: 0.8 }}>Chase UR</div>
            <div style={{ fontSize: 9, color: UI.text3, marginTop: 1 }}>{fmtDate(urUpdated)}</div>
          </div>
          <div style={{ width: 1, height: 36, background: UI.border }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: C.amex }}>{mrT.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: UI.text3, textTransform: "uppercase", letterSpacing: 0.8 }}>AMEX MR</div>
            <div style={{ fontSize: 9, color: UI.text3, marginTop: 1 }}>{fmtDate(mrUpdated)}</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 3, padding: "10px 0", borderBottom: `1px solid ${UI.border}`, position: "sticky", top: 0, background: UI.bg, zIndex: 10, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", background: tab === t.id ? UI.bg3 : "transparent", color: tab === t.id ? UI.text : UI.text3 }}>{t.l}</button>
        ))}
      </div>

      {/* SWIPE */}
      {tab === "swipe" && (
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {SWIPE.map((r, i) => {
              const cc = r.c === "amex" ? C.amex : r.c === "teal" ? C.teal : C.chase;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 160px 72px", padding: "10px 10px", borderRadius: 6, background: i % 2 === 0 ? "transparent" : UI.bg2, alignItems: "center", gap: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500 }}>{r.cat}</div><div style={{ fontSize: 11, color: UI.text3 }}>{r.where}</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: cc, display: "flex", alignItems: "center" }}><Dot color={cc} />{r.card}</div><div style={{ fontSize: 10, color: UI.text3, paddingLeft: 13 }}>{r.who}</div></div>
                  <div style={{ textAlign: "right" }}><Badge type={r.c}>{r.rate}</Badge></div>
                </div>
              );
            })}
          </div>
          <Note accent={C.amex}><strong style={{ color: UI.text }}>1x UR &gt; 1x MR.</strong> When both cards earn 1x, prefer Chase. UR = ~1.5-2.0cpp (Hyatt, Points Boost). MR = ~1.2-1.6cpp.</Note>
          <Note><strong style={{ color: UI.text }}>Costco:</strong> Take turns paying to naturally split costs. Both earn 1x UR, points pool into household balance. If Freedom's quarterly 5% includes warehouse clubs, Christine uses Freedom.</Note>
          <Note accent={C.chase}><strong style={{ color: UI.text }}>UR pooling:</strong> Christine transfers UR to Eric's CSR for best redemption. Same address required, not marriage. Call Chase once to link. AMEX MR already pooled via AU card.</Note>
          <Note><strong style={{ color: UI.text }}>Gas:</strong> No great gas card currently. Use CSR for 1x UR. Revisit Costco Anywhere Visa ($0, 5% Costco gas, 4% other) after LA move in July when driving increases.</Note>
        </div>
      )}

      {/* TURNS */}
      {tab === "turns" && (
        <div style={{ paddingTop: 16 }}>
          {[
            { bucket: "costco", label: "Costco", sub: "CSR or CSP, alternate who pays" },
            { bucket: "meals", label: "Meals on personal CC", sub: "When not using shared AMEX Gold" },
          ].map((b, bi) => {
            const next = getNextPerson(b.bucket);
            const counts = getTurnCounts(b.bucket);
            const history = getHistory(b.bucket);
            const hasHistory = counts.eric + counts.christine > 0;
            return (
              <div key={b.bucket} style={{ background: UI.bg2, border: `1px solid ${UI.border}`, borderRadius: 10, padding: 16, marginBottom: bi === 0 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div><div style={{ fontSize: 15, fontWeight: 700 }}>{b.label}</div><div style={{ fontSize: 11, color: UI.text3 }}>{b.sub}</div></div>
                  {hasHistory && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => handleUndo(b.bucket)} style={{ background: "none", border: `1px solid ${UI.border}`, borderRadius: 5, padding: "3px 8px", color: UI.text3, fontSize: 10, fontFamily: "inherit", cursor: "pointer" }}>Undo</button>
                      <button onClick={() => setConfirmReset(confirmReset === b.bucket ? null : b.bucket)} style={{ background: "none", border: `1px solid ${confirmReset === b.bucket ? C.red + "66" : UI.border}`, borderRadius: 5, padding: "3px 8px", color: confirmReset === b.bucket ? C.red : UI.text3, fontSize: 10, fontFamily: "inherit", cursor: "pointer" }}>Reset</button>
                    </div>
                  )}
                </div>
                {confirmReset === b.bucket && (
                  <div style={{ background: "#351818", border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: C.red }}>Reset all {b.label.toLowerCase()} turns?</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { handleReset(b.bucket); setConfirmReset(null); }} style={{ background: C.red, border: "none", borderRadius: 5, padding: "4px 10px", color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>Yes, reset</button>
                      <button onClick={() => setConfirmReset(null)} style={{ background: "none", border: `1px solid ${UI.border}`, borderRadius: 5, padding: "4px 8px", color: UI.text3, fontSize: 11, fontFamily: "inherit", cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
                {next ? (
                  <div style={{ background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: UI.text3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Next up</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: next === "Eric" ? C.chase : C.purple }}>{next}</div>
                    {counts.diff > 1 && <div style={{ fontSize: 11, color: C.coral, marginTop: 4 }}>owes {counts.diff} turns</div>}
                  </div>
                ) : hasHistory ? (
                  <div style={{ background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Even</div>
                    <div style={{ fontSize: 12, color: UI.text3 }}>{counts.eric} each</div>
                  </div>
                ) : (
                  <div style={{ background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: UI.text3 }}>No history yet. Tap who paid below.</div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: history.length > 0 ? 12 : 0 }}>
                  {["Eric", "Christine"].map(person => {
                    const bg = person === "Eric" ? "#162538" : "#231A33";
                    const fg = person === "Eric" ? C.chase : C.purple;
                    const border = person === "Eric" ? "#2A4A6E" : "#3D2D5E";
                    const ct = person === "Eric" ? counts.eric : counts.christine;
                    return (
                      <button key={person} onClick={() => handleLog(b.bucket, person)} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "16px 10px", color: fg, fontSize: 15, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "opacity .1s" }}
                        onMouseDown={e => e.currentTarget.style.opacity = "0.7"}
                        onMouseUp={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                      >
                        {person}
                        <span style={{ fontSize: 10, color: `${fg}99`, fontWeight: 400 }}>paid this time {hasHistory && `(${ct})`}</span>
                      </button>
                    );
                  })}
                </div>
                {history.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: UI.text3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Recent</div>
                    {history.map((t, ti) => (
                      <div key={t.id || ti} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12, borderBottom: ti < history.length - 1 ? `1px solid ${UI.border}` : "none" }}>
                        <span style={{ color: t.person === "Eric" ? C.chase : C.purple, fontWeight: 500 }}>{t.person}</span>
                        <span style={{ color: UI.text3, fontFamily: mono, fontSize: 11 }}>{fmtDate(t.paid_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Note><strong style={{ color: UI.text }}>Big purchase?</strong> Tap the same person 2-3x to weight it. A $600 Costco haul = tap twice, so the other person owes 2 regular trips. Reset when you both agree you're even.</Note>
        </div>
      )}

      {/* TRIP */}
      {tab === "trip" && (
        <div style={{ paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Booking decision tree</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              ["1", "Cheap domestic flights (<$300)", "Pay cash through Chase Travel portal. Earn 8x UR. Save points."],
              ["2", "Expensive domestic ($400+)", "Check British Airways Avios first (7.5-12.5K on AA). Fund from whichever balance is bigger. Otherwise cash for 8x."],
              ["3", "International economy", "Compare Aeroplan, Flying Blue, United, Delta award rates vs cash. Use points if good rate, cash for 8x if not."],
              ["4", "International biz / first", "Always transfer to partners. ANA via MR (75-88K RT Japan), Aeroplan/Flying Blue to Europe, Virgin Atlantic sweet spots."],
              ["5", "Hotels: Hyatt first", "Transfer Chase UR to Hyatt 1:1. Consistently 2-4cpp. Park Hyatt, Andaz, Ziva/Zilara all-inclusives."],
              ["6", "Hotels: no Hyatt", "Chase Travel portal (8x earning or Points Boost). Use The Edit for luxury perks. Check loyalty-eligible banner."],
            ].map(([n, t, s]) => (
              <div key={n} style={{ display: "flex", gap: 10, background: UI.bg2, border: `1px solid ${UI.border}`, borderRadius: 7, padding: "10px 12px" }}>
                <div style={{ width: 22, height: 22, minWidth: 22, background: UI.text, color: UI.bg, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, marginTop: 1 }}>{n}</div>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{t}</div><div style={{ fontSize: 12, color: UI.text2, marginTop: 1 }}>{s}</div></div>
              </div>
            ))}
          </div>
          <Note accent={C.chase}><strong style={{ color: UI.text }}>Portal flights</strong> still earn airline miles (add loyalty number). <strong style={{ color: UI.text }}>Hotels</strong> marked "loyalty eligible" earn hotel points + elite benefits.</Note>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
            {[
              { title: "Chase UR redemption", color: C.chase, rows: [["2-4cpp", "Transfer to Hyatt", C.green], ["1.5-3cpp", "Transfer to airlines", C.green], ["1.25-2cpp", "Chase Travel portal", UI.text3], ["1.0cpp", "Cash out (avoid)", C.red]] },
              { title: "AMEX MR redemption", color: C.amex, rows: [["1.5-5cpp+", "Transfer to airlines", C.green], ["~1.0cpp", "AMEX Travel portal", UI.text3], ["0.6-1cpp", "Cash out (avoid)", C.red], ["~0.7cpp", "Marriott transfer (avoid)", C.red]] },
            ].map((col, ci) => (
              <div key={ci}>
                <div style={{ fontSize: 11, fontWeight: 700, color: col.color, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{col.title}</div>
                {col.rows.map(([v, l, c], ri) => (
                  <div key={ri} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, color: c, minWidth: 62 }}>{v}</span><span style={{ color: UI.text2 }}>{l}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {[[C.chase, "UR = hotel currency (Hyatt + portal)"], [C.amex, "MR = flight currency (Delta, ANA, Avios, Aeroplan)"]].map(([c, t], i) => (
              <div key={i} style={{ flex: 1, background: UI.bg2, border: `1px solid ${UI.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 11, color: UI.text2, display: "flex", gap: 7, alignItems: "center" }}><Dot color={c} size={7} />{t}</div>
            ))}
          </div>
          <button onClick={() => setPartOpen(!partOpen)} style={{ width: "100%", background: UI.bg2, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "11px 14px", marginTop: 16, cursor: "pointer", fontFamily: "inherit", color: UI.text, fontSize: 13, fontWeight: 600, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Transfer partners (verified March 2026)</span>
            <span style={{ color: UI.text3, fontSize: 16, transform: partOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>&#9662;</span>
          </button>
          {partOpen && (
            <div style={{ marginTop: 6 }}>
              {[{ l: "Both UR + MR", sub: "fund from whichever is bigger", c: C.purple, d: BOTH_P }, { l: "Chase UR only", c: C.chase, d: CHASE_P }, { l: "AMEX MR only", c: C.amex, d: AMEX_P }].map((s, si) => (
                <div key={si} style={{ marginTop: si > 0 ? 12 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: UI.text3, marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                    <Dot color={s.c} size={7} />{s.l}{s.sub && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}> -- {s.sub}</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>{s.d.map((p, pi) => <PC key={pi} p={p} color={s.c} />)}</div>
                </div>
              ))}
              <Note><strong style={{ color: UI.text }}>Never transfer speculatively.</strong> Confirm availability first. Transfers are one-way, irreversible.</Note>
            </div>
          )}
        </div>
      )}

      {/* BALANCES */}
      {tab === "balances" && (
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[[C.chase, "Chase UR", urT], [C.amex, "AMEX MR", mrT]].map(([c, l, t], i) => (
              <div key={i} style={{ background: UI.bg2, borderRadius: 8, padding: 14, border: `1px solid ${UI.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: c, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: mono, color: c, marginTop: 4 }}>{t.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {progs.map(p => (
              <div key={p.id} style={{ background: UI.bg2, border: `1px solid ${UI.border}`, borderRadius: 6, padding: "7px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Dot color={p.color} size={5} />
                  <span style={{ fontSize: 13, flex: 1 }}>{p.label}</span>
                  {!p.sys && <button onClick={() => rm(p.id)} style={{ background: "none", border: "none", color: UI.text3, cursor: "pointer", fontSize: 13, padding: "0 4px", fontFamily: "inherit" }}>x</button>}
                  <input type="text" value={p.value === 0 ? "" : p.value.toLocaleString()} placeholder="0" onChange={e => upd(p.id, e.target.value)} onFocus={e => e.target.select()} style={{ background: UI.bg3, border: `1px solid ${UI.border}`, borderRadius: 5, padding: "5px 8px", color: UI.text, fontFamily: mono, fontSize: 14, fontWeight: 600, width: 110, textAlign: "right", outline: "none" }} />
                </div>
                <div style={{ fontSize: 10, color: UI.text3, marginTop: 3, paddingLeft: 11 }}>Updated: {fmtDate(p.updated)}</div>
              </div>
            ))}
          </div>
          {addOpen ? (
            <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
              <input type="text" value={newN} onChange={e => setNewN(e.target.value)} onKeyDown={e => e.key === "Enter" && addP()} placeholder="e.g. United, Hyatt, Delta" autoFocus style={{ flex: 1, background: UI.bg3, border: `1px solid ${UI.border}`, borderRadius: 6, padding: "8px 12px", color: UI.text, fontFamily: "inherit", fontSize: 13, outline: "none" }} />
              <button onClick={addP} style={{ background: UI.bg3, border: `1px solid ${UI.border}`, borderRadius: 6, padding: "8px 14px", color: UI.text, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 }}>Add</button>
              <button onClick={() => { setAddOpen(false); setNewN(""); }} style={{ background: "none", border: `1px solid ${UI.border}`, borderRadius: 6, padding: "8px 10px", color: UI.text3, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddOpen(true)} style={{ width: "100%", background: "none", border: `1px dashed ${UI.border}`, borderRadius: 6, padding: 9, color: UI.text3, cursor: "pointer", fontFamily: "inherit", fontSize: 12, marginTop: 6 }}>+ Add program (United, Hyatt, Delta, etc.)</button>
          )}
        </div>
      )}

      {/* CARDS */}
      {tab === "cards" && (
        <div style={{ paddingTop: 16 }}>
          {[{ who: "Eric", cards: CARDS_ERIC }, { who: "Christine", cards: CARDS_CHRISTINE }].map((person, pi) => {
            const pf = person.cards.reduce((s, c) => s + c.fee, 0);
            return (
              <div key={pi} style={{ marginBottom: pi === 0 ? 20 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{person.who}</div>
                  <div style={{ fontFamily: mono, fontSize: 12, color: UI.text2 }}>${pf}/yr</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {person.cards.map((c, ci) => {
                    const st = statusStyle(c.status);
                    return (
                      <div key={ci} style={{ background: UI.bg2, border: `1px solid ${UI.border}`, borderLeft: `3px solid ${c.c}`, borderRadius: 7, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontFamily: mono, fontSize: 11, color: UI.text3 }}>{c.fee > 0 ? `$${c.fee}/yr` : "$0/yr"}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: st.bg, color: st.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{st.label}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: UI.text2, marginTop: 3 }}>{c.use}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${UI.border}` }}>
            <div style={{ fontFamily: mono, fontSize: 13, color: UI.text2 }}>Total: <span style={{ fontWeight: 700, color: UI.text }}>${totalFee.toLocaleString()}/yr</span></div>
          </div>
          <Note><strong style={{ color: UI.text }}>To update card strategy:</strong> Adding or removing a card changes the swipe guide and trip planner. Come back to Claude for re-evaluation, then redeploy.</Note>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ marginTop: 24, borderTop: `1px solid ${UI.border}`, paddingTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: UI.text3, marginBottom: 6 }}>Key dates</div>
        {KEY_DATES.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: i < KEY_DATES.length - 1 ? `1px solid ${UI.border}` : "none", fontSize: 12, alignItems: "baseline" }}>
            <span style={{ fontFamily: mono, fontWeight: 600, color: d.c, minWidth: 68, fontSize: 11 }}>{d.d}</span>
            <span style={{ color: UI.text2 }}>{d.w}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", color: UI.text3, fontSize: 10, paddingTop: 14 }}>Partners verified Mar 2026 · Chase.com, AmericanExpress.com, NerdWallet, TPG, AwardWallet</div>
    </div>
  );
}
