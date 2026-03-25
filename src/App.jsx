import { useState, useEffect, useCallback, useRef } from "react";
import { getBalances, upsertBalance, deleteBalance, subscribeBalances, getTurns, logTurn as sbLogTurn, deleteTurn as sbDeleteTurn, subscribeTurns } from "./supabase";

const C = { chase: "#6BAAED", amex: "#E4B94E", green: "#6DD4A0", red: "#E88080", purple: "#B699E8", teal: "#5CD4BE", coral: "#E89678" };
const UI = { bg: "#0C0C0B", bg2: "#141413", bg3: "#1C1C1A", bg4: "#252523", border: "#2A2A27", borderLight: "#353532", text: "#F2F1EE", text2: "#B0AFA9", text3: "#706F6A" };
const mono = "'JetBrains Mono', monospace";
const display = "'Outfit', sans-serif";

const SWIPE = [
  { cat: "Groceries", where: "Trader Joe's, Whole Foods", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Dining out", where: "Restaurants, bars, cafes", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Delivery", where: "DoorDash, Uber Eats", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Uber rides", where: "After $10/mo credit", card: "AMEX Gold", who: "Either of us", rate: "4x MR", c: "amex" },
  { cat: "Travel", where: "Chase Travel portal", card: "Sapphire Reserve", who: "Eric", rate: "8x UR", c: "chase" },
  { cat: "Travel", where: "Direct airline/hotel", card: "Sapphire Reserve", who: "Eric", rate: "4x UR", c: "chase" },
  { cat: "Costco", where: "In-store, alternate", card: "CSR or CSP", who: "Take turns", rate: "1x UR", c: "chase" },
  { cat: "Gas", where: "Any gas station", card: "CSR or CSP", who: "Whoever", rate: "1x UR", c: "chase" },
  { cat: "Business", where: "Internet, phone, ads", card: "Biz card", who: "Eric", rate: "3x+", c: "teal" },
  { cat: "Personal", where: "Amazon, shopping, misc", card: "CSR or CSP", who: "Eric, Christine", rate: "1-3x UR", c: "chase" },
  { cat: "Dining", where: "No AMEX accepted", card: "CSR or CSP", who: "Whoever", rate: "3x UR", c: "chase" },
];
const CARDS_ERIC = [
  { name: "Chase Sapphire Reserve", fee: 795, use: "Daily driver, travel, Costco, lounge access", status: "active", c: C.chase },
  { name: "AMEX Gold", fee: 325, use: "Groceries 4x, dining 4x, delivery. Christine has AU.", status: "active", c: C.amex },
  { name: "Business card (April)", fee: 0, use: "Ink Biz Preferred first, then IBU or AMEX BBP", status: "pending", c: C.teal },
  { name: "WF Autograph", fee: 0, use: "Sock drawer. Keep for credit history.", status: "drawer", c: UI.text3 },
];
const CARDS_CHRISTINE = [
  { name: "Chase Sapphire Preferred", fee: 95, use: "Daily driver, personal spend, Costco", status: "active", c: C.chase },
  { name: "Chase Freedom", fee: 0, use: "5% rotating categories. Check quarterly.", status: "active", c: C.chase },
  { name: "AMEX Gold (authorized user)", fee: 0, use: "Eric's card. Use for groceries and dining.", status: "active", c: C.amex },
  { name: "Marriott Bonvoy Boundless", fee: 95, use: "Free night + airline credit. Reassess Aug 1.", status: "review", c: UI.text3 },
];
const BOTH_P = [
  { n: "Air Canada Aeroplan", u: "Star Alliance. Most flexible all-around.", r: "1:1", s: true },
  { n: "British Airways Avios", u: "Short AA flights 7.5-12.5K one-way.", r: "1:1", s: true },
  { n: "Air France/KLM Flying Blue", u: "Europe. Monthly promo deals.", r: "1:1" },
  { n: "Virgin Atlantic", u: "ANA first class, Delta sweet spots.", r: "1:1" },
  { n: "Singapore KrisFlyer", u: "Premium cabin to/around Asia.", r: "1:1" },
  { n: "Emirates Skywards", u: "Emirates premium. Watch surcharges.", r: "1:1" },
  { n: "JetBlue TrueBlue", u: "Domestic, East Coast.", r: "1:1" },
  { n: "Aer Lingus AerClub", u: "Ireland ~13K Avios.", r: "1:1" },
  { n: "Iberia Plus", u: "Off-peak Spain. Oneworld.", r: "1:1" },
];
const CHASE_P = [
  { n: "World of Hyatt", u: "Best hotel transfer. 2-4cpp. Check first.", r: "1:1 · ~1.8cpp", s: true },
  { n: "United MileagePlus", u: "Direct United + Star Alliance. SFO hub.", r: "1:1" },
  { n: "Southwest Rapid Rewards", u: "Flexible domestic. Free changes.", r: "1:1 · ~1.4cpp" },
  { n: "IHG One Rewards", u: "Budget hotels. Large footprint.", r: "1:1 · ~0.5cpp" },
  { n: "Marriott Bonvoy", u: "Only as top-up. Watch bonuses.", r: "1:1 · ~0.7cpp" },
  { n: "Wyndham Rewards", u: "Budget/mid. Fixed chart.", r: "1:1 · ~0.9cpp" },
];
const AMEX_P = [
  { n: "ANA Mileage Club", u: "75-88K RT biz Japan. Best MR use.", r: "1:1", s: true },
  { n: "Delta SkyMiles", u: "Direct Delta. Big LAX/SFO.", r: "1:1 · ~1.2cpp", s: true },
  { n: "Avianca LifeMiles", u: "Star Alliance cheaper rates.", r: "1:1" },
  { n: "Cathay Pacific Asia Miles", u: "Premium cabin Asia. Oneworld.", r: "1:1" },
  { n: "Qantas Frequent Flyer", u: "Australia/NZ. Oneworld.", r: "1:1" },
  { n: "Qatar Privilege Club", u: "Qsuites. Oneworld awards.", r: "1:1" },
  { n: "Etihad Guest", u: "ANA/AA bookings.", r: "1:1" },
  { n: "Hawaiian Airlines", u: "Flights to Hawaii.", r: "1:1" },
  { n: "AeroMexico Club Premier", u: "Mexico + SkyTeam.", r: "1:1" },
  { n: "Hilton Honors", u: "Wait for 30-40% bonuses.", r: "1:2 · ~0.5cpp/MR" },
  { n: "Marriott Bonvoy", u: "Poor value. Small top-up only.", r: "1:1 · ~0.7cpp" },
  { n: "Choice Privileges", u: "Budget. Rarely worth it.", r: "1:1 · ~0.6cpp" },
];
const KEY_DATES = [
  { d: "Apr 2026", w: "Open business card. Test Ink Biz Preferred.", c: C.teal },
  { d: "Aug 1", w: "Marriott Bonvoy $95. Downgrade by Aug 30 if unused.", c: C.coral },
  { d: "~Sep", w: "AMEX Gold SUB deadline ($6K/6mo).", c: C.amex },
  { d: "Sep 2026", w: "CSR renews $795. Tally credits, decide.", c: C.chase },
];
const DEFAULT_PROGS = [
  { id: "ur-e", label: "Chase UR (Eric CSR)", value: 0, color: C.chase, sys: true, updated: null },
  { id: "ur-c", label: "Chase UR (Christine CSP + Freedom)", value: 0, color: C.chase, sys: true, updated: null },
  { id: "mr", label: "AMEX MR (Gold)", value: 0, color: C.amex, sys: true, updated: null },
];
const SORT_ORDER = { "ur-e": 0, "ur-c": 1, "mr": 2 };
const sortProgs = (arr) => [...arr].sort((a, b) => (SORT_ORDER[a.id] ?? 99) - (SORT_ORDER[b.id] ?? 99));
const SYS_COLORS = { "ur-e": C.chase, "ur-c": C.chase, "mr": C.amex };
const fromDB = (row) => ({ id: row.id, label: row.label, value: row.value || 0, color: SYS_COLORS[row.id] || row.color || UI.text2, sys: row.is_system || false, updated: row.updated_at });

// ── Helpers ──

const Badge = ({ type, children }) => {
  const m = { chase: [C.chase, `${C.chase}18`], amex: [C.amex, `${C.amex}18`], teal: [C.teal, `${C.teal}18`] };
  const [fg, bg] = m[type] || m.chase;
  return <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: bg, color: fg, whiteSpace: "nowrap", letterSpacing: 0.3 }}>{children}</span>;
};
const Dot = ({ color, size = 6 }) => <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}44` }} />;
const PC = ({ p, color }) => (
  <div style={{ background: p.s ? `${color}0A` : UI.bg2, border: `1px solid ${p.s ? `${color}30` : UI.border}`, borderRadius: 8, padding: "10px 12px", transition: "border-color .2s" }}>
    <div style={{ fontWeight: 600, fontSize: 12, color: p.s ? color : UI.text, fontFamily: display }}>{p.n}</div>
    <div style={{ fontSize: 11, color: UI.text2, marginTop: 2, lineHeight: 1.4 }}>{p.u}</div>
    <div style={{ fontFamily: mono, fontSize: 10, color: UI.text3, marginTop: 4 }}>{p.r}</div>
  </div>
);
const Note = ({ accent, children }) => (
  <div style={{ background: `linear-gradient(135deg, ${UI.bg2}, ${UI.bg3})`, border: `1px solid ${UI.border}`, borderLeft: accent ? `2px solid ${accent}` : undefined, borderRadius: 10, padding: "12px 16px", marginTop: 12, fontSize: 12, color: UI.text2, lineHeight: 1.65 }}>{children}</div>
);
const fmtDate = (d) => {
  if (!d) return "never";
  const dt = new Date(d); const now = new Date(); const diff = Math.floor((now - dt) / 86400000);
  if (diff === 0) return "today"; if (diff === 1) return "yesterday"; if (diff < 7) return `${diff}d ago`;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const statusStyle = (s) => {
  if (s === "active") return { bg: `${C.green}15`, color: C.green, label: "Active" };
  if (s === "pending") return { bg: `${C.teal}15`, color: C.teal, label: "Pending" };
  if (s === "drawer") return { bg: `${UI.text3}15`, color: UI.text3, label: "Sock drawer" };
  if (s === "review") return { bg: `${C.coral}15`, color: C.coral, label: "Reassess" };
  return { bg: `${UI.text3}15`, color: UI.text3, label: s };
};

// ── App ──

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
  const tabRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({});

  useEffect(() => { (async () => {
    const [balData, turnsData] = await Promise.all([getBalances(), getTurns()]);
    if (balData && balData.length > 0) { setProgs(sortProgs(balData.map(fromDB))); setSynced(true); }
    if (turnsData) setTurns(turnsData);
    setLoaded(true);
  })(); }, []);

  useEffect(() => {
    const unsub = subscribeBalances((payload) => {
      if (skipRef.current) { skipRef.current = false; return; }
      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        setProgs(prev => { const row = fromDB(payload.new); const exists = prev.find(p => p.id === row.id); return sortProgs(exists ? prev.map(p => p.id === row.id ? row : p) : [...prev, row]); });
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

  // Animated pill - recalculate after font load
  useEffect(() => {
    const updatePill = () => {
      if (!tabRef.current) return;
      const active = tabRef.current.querySelector(`[data-tab="${tab}"]`);
      if (active) {
        const parent = tabRef.current.getBoundingClientRect();
        const rect = active.getBoundingClientRect();
        setPillStyle({ left: rect.left - parent.left, width: rect.width, opacity: 1 });
      }
    };
    updatePill();
    document.fonts?.ready?.then(updatePill);
  }, [tab, loaded]);

  const upd = useCallback((id, v) => {
    const val = parseInt(v.replace(/\D/g, "")) || 0;
    const ts = new Date().toISOString();
    setProgs(prev => { const next = sortProgs(prev.map(x => x.id === id ? { ...x, value: val, updated: ts } : x)); const item = next.find(x => x.id === id); if (item) { skipRef.current = true; upsertBalance(item); } return next; });
  }, []);
  const addP = useCallback(() => { if (!newN.trim()) return; const item = { id: `c-${Date.now()}`, label: newN.trim(), value: 0, color: UI.text2, sys: false, updated: null }; setProgs(prev => sortProgs([...prev, item])); skipRef.current = true; upsertBalance(item); setNewN(""); setAddOpen(false); }, [newN]);
  const rm = useCallback((id) => { setProgs(prev => prev.filter(x => x.id !== id)); deleteBalance(id); }, []);
  const handleLog = useCallback(async (bucket, person) => { await sbLogTurn(bucket, person); }, []);
  const handleUndo = useCallback(async (bucket) => { const last = turns.find(t => t.bucket === bucket); if (!last) return; await sbDeleteTurn(last.id); }, [turns]);
  const handleReset = useCallback(async (bucket) => { const ids = turns.filter(t => t.bucket === bucket).map(t => t.id); for (const id of ids) await sbDeleteTurn(id); }, [turns]);
  const getTurnCounts = (bucket) => { const bt = turns.filter(t => t.bucket === bucket); const eric = bt.filter(t => t.person === "Eric").length; const christine = bt.filter(t => t.person === "Christine").length; return { eric, christine, diff: Math.abs(eric - christine) }; };
  const getNextPerson = (bucket) => { const c = getTurnCounts(bucket); if (c.eric === 0 && c.christine === 0) return null; if (c.eric === c.christine) return null; return c.eric > c.christine ? "Christine" : "Eric"; };
  const getHistory = (bucket) => turns.filter(t => t.bucket === bucket).slice(0, 5);

  const urProgs = progs.filter(p => p.id === "ur-e" || p.id === "ur-c");
  const mrProgs = progs.filter(p => p.id === "mr");
  const urT = urProgs.reduce((s, p) => s + p.value, 0);
  const mrT = mrProgs.reduce((s, p) => s + p.value, 0);
  const urUpdated = urProgs.filter(p => p.updated).sort((a, b) => new Date(b.updated) - new Date(a.updated))[0]?.updated;
  const mrUpdated = mrProgs.filter(p => p.updated).sort((a, b) => new Date(b.updated) - new Date(a.updated))[0]?.updated;
  const totalFee = [...CARDS_ERIC, ...CARDS_CHRISTINE].reduce((s, c) => s + c.fee, 0);
  const tabs = [{ id: "swipe", l: "Swipe" }, { id: "turns", l: "Turns" }, { id: "trip", l: "Trips" }, { id: "balances", l: "Points" }, { id: "cards", l: "Cards" }];

  if (!loaded) return <div style={{ fontFamily: display, background: UI.bg, color: UI.text3, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 13, opacity: 0.5 }}>Loading...</div></div>;

  return (
    <div style={{ fontFamily: display, background: UI.bg, color: UI.text, minHeight: "100vh", padding: "20px 18px 24px", maxWidth: 840, margin: "0 auto", lineHeight: 1.55 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .tab-content { animation: fadeIn 0.25s ease-out; }
        button:active { transform: scale(0.97); }
        input:focus { border-color: ${C.chase} !important; }
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.8, background: `linear-gradient(135deg, ${UI.text}, ${UI.text2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Card Strategy</h1>
          <p style={{ fontSize: 11, color: UI.text3, marginTop: 3, fontWeight: 400 }}>Eric + Christine · 2026{synced && <span style={{ color: C.green, marginLeft: 6 }}>synced</span>}</p>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 600, color: C.chase, letterSpacing: -0.5 }}>{urT.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: UI.text3, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500, marginTop: 1 }}>UR</div>
            <div style={{ fontSize: 9, color: UI.text3, marginTop: 1 }}>{fmtDate(urUpdated)}</div>
          </div>
          <div style={{ width: 1, height: 32, background: `linear-gradient(to bottom, transparent, ${UI.border}, transparent)` }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: mono, fontSize: 17, fontWeight: 600, color: C.amex, letterSpacing: -0.5 }}>{mrT.toLocaleString()}</div>
            <div style={{ fontSize: 9, color: UI.text3, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500, marginTop: 1 }}>MR</div>
            <div style={{ fontSize: 9, color: UI.text3, marginTop: 1 }}>{fmtDate(mrUpdated)}</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: UI.bg, paddingTop: 4, paddingBottom: 4 }}>
        <div ref={tabRef} style={{ display: "flex", padding: "4px", borderRadius: 10, background: UI.bg2, border: `1px solid ${UI.border}`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", position: "relative" }}>
          <div style={{ position: "absolute", top: 4, height: "calc(100% - 8px)", borderRadius: 7, background: UI.bg4, transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)", ...pillStyle }} />
          {tabs.map(t => (
            <button key={t.id} data-tab={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", fontFamily: display, textAlign: "center", background: "transparent", color: tab === t.id ? UI.text : UI.text3, position: "relative", zIndex: 1, transition: "color 0.2s" }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* SWIPE */}
      {tab === "swipe" && (
        <div className="tab-content" style={{ paddingTop: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SWIPE.map((r, i) => {
              const cc = r.c === "amex" ? C.amex : r.c === "teal" ? C.teal : C.chase;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 150px 68px", padding: "11px 12px", borderRadius: 8, background: i % 2 === 0 ? "transparent" : UI.bg2, alignItems: "center", gap: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500 }}>{r.cat}</div><div style={{ fontSize: 11, color: UI.text3, marginTop: 1 }}>{r.where}</div></div>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: cc, display: "flex", alignItems: "center", gap: 6 }}><Dot color={cc} />{r.card}</div><div style={{ fontSize: 10, color: UI.text3, paddingLeft: 12, marginTop: 1 }}>{r.who}</div></div>
                  <div style={{ textAlign: "right" }}><Badge type={r.c}>{r.rate}</Badge></div>
                </div>
              );
            })}
          </div>
          <Note accent={C.amex}><strong style={{ color: UI.text }}>1x UR &gt; 1x MR.</strong> When both earn 1x, prefer Chase. UR = ~1.5-2.0cpp, MR = ~1.2-1.6cpp.</Note>
          <Note><strong style={{ color: UI.text }}>Costco:</strong> Take turns. Both earn 1x UR into household pool. If Freedom quarterly 5% includes warehouse, Christine uses Freedom.</Note>
          <Note accent={C.chase}><strong style={{ color: UI.text }}>UR pooling:</strong> Christine transfers to Eric's CSR for best redemption. Same address, call Chase once. MR pooled via AU card.</Note>
          <Note><strong style={{ color: UI.text }}>Gas:</strong> CSR for 1x UR. Revisit Costco Anywhere Visa ($0, 5% Costco gas) after LA move July.</Note>
        </div>
      )}

      {/* TURNS */}
      {tab === "turns" && (
        <div className="tab-content" style={{ paddingTop: 18 }}>
          {[
            { bucket: "costco", label: "Costco", sub: "CSR or CSP, alternate" },
            { bucket: "meals", label: "Meals on personal CC", sub: "When not using AMEX Gold" },
          ].map((b, bi) => {
            const next = getNextPerson(b.bucket);
            const counts = getTurnCounts(b.bucket);
            const history = getHistory(b.bucket);
            const hasHistory = counts.eric + counts.christine > 0;
            const isConfirming = confirmReset === b.bucket;
            return (
              <div key={b.bucket} style={{ background: `linear-gradient(160deg, ${UI.bg2}, ${UI.bg3})`, border: `1px solid ${UI.border}`, borderRadius: 14, padding: 18, marginBottom: bi === 0 ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                  <div><div style={{ fontSize: 16, fontWeight: 700 }}>{b.label}</div><div style={{ fontSize: 11, color: UI.text3, marginTop: 2 }}>{b.sub}</div></div>
                  {hasHistory && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => handleUndo(b.bucket)} style={{ background: "none", border: `1px solid ${UI.border}`, borderRadius: 6, padding: "4px 10px", color: UI.text3, fontSize: 10, fontFamily: display, fontWeight: 500, cursor: "pointer", transition: "all .15s" }}>Undo</button>
                      <button onClick={() => setConfirmReset(isConfirming ? null : b.bucket)} style={{ background: "none", border: `1px solid ${isConfirming ? `${C.red}66` : UI.border}`, borderRadius: 6, padding: "4px 10px", color: isConfirming ? C.red : UI.text3, fontSize: 10, fontFamily: display, fontWeight: 500, cursor: "pointer", transition: "all .15s" }}>Reset</button>
                    </div>
                  )}
                </div>
                {isConfirming && (
                  <div style={{ background: `${C.red}0C`, border: `1px solid ${C.red}30`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: C.red }}>Reset all {b.label.toLowerCase()} turns?</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => { handleReset(b.bucket); setConfirmReset(null); }} style={{ background: C.red, border: "none", borderRadius: 6, padding: "5px 12px", color: "#fff", fontSize: 11, fontWeight: 600, fontFamily: display, cursor: "pointer" }}>Confirm</button>
                      <button onClick={() => setConfirmReset(null)} style={{ background: "none", border: `1px solid ${UI.border}`, borderRadius: 6, padding: "5px 10px", color: UI.text3, fontSize: 11, fontFamily: display, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                )}
                {next ? (
                  <div style={{ background: `linear-gradient(135deg, ${UI.bg}, ${UI.bg2})`, border: `1px solid ${UI.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: UI.text3, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500, marginBottom: 4 }}>Next up</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: next === "Eric" ? C.chase : C.purple }}>{next}</div>
                    {counts.diff > 1 && <div style={{ fontSize: 11, color: C.coral, marginTop: 4, fontWeight: 500 }}>owes {counts.diff} turns</div>}
                  </div>
                ) : hasHistory ? (
                  <div style={{ background: `linear-gradient(135deg, ${UI.bg}, ${UI.bg2})`, border: `1px solid ${UI.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.green, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 2 }}>Even</div>
                    <div style={{ fontSize: 12, color: UI.text3 }}>{counts.eric} each</div>
                  </div>
                ) : (
                  <div style={{ background: `linear-gradient(135deg, ${UI.bg}, ${UI.bg2})`, border: `1px solid ${UI.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: UI.text3 }}>Tap who paid below to start tracking.</div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: history.length > 0 ? 14 : 0 }}>
                  {["Eric", "Christine"].map(person => {
                    const isEric = person === "Eric";
                    const fg = isEric ? C.chase : C.purple;
                    const ct = isEric ? counts.eric : counts.christine;
                    return (
                      <button key={person} onClick={() => handleLog(b.bucket, person)} style={{
                        background: `linear-gradient(160deg, ${fg}18, ${fg}08)`,
                        border: `1px solid ${fg}30`, borderRadius: 10, padding: "16px 10px",
                        color: fg, fontSize: 15, fontWeight: 700, fontFamily: display, cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all .15s"
                      }}>
                        {person}
                        <span style={{ fontSize: 10, color: `${fg}88`, fontWeight: 400 }}>paid this time {hasHistory && `(${ct})`}</span>
                      </button>
                    );
                  })}
                </div>
                {history.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: UI.text3, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 500, marginBottom: 4 }}>Recent</div>
                    {history.map((t, ti) => (
                      <div key={t.id || ti} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, borderBottom: ti < history.length - 1 ? `1px solid ${UI.border}` : "none" }}>
                        <span style={{ color: t.person === "Eric" ? C.chase : C.purple, fontWeight: 500 }}>{t.person}</span>
                        <span style={{ color: UI.text3, fontFamily: mono, fontSize: 10 }}>{fmtDate(t.paid_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <Note><strong style={{ color: UI.text }}>Big purchase?</strong> Tap 2-3x to weight it. $600 Costco = tap twice. Reset when you're both even.</Note>
        </div>
      )}

      {/* TRIPS */}
      {tab === "trip" && (
        <div className="tab-content" style={{ paddingTop: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Booking decision tree</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["1", "Cheap domestic (<$300)", "Cash through Chase Travel portal. Earn 8x UR."],
              ["2", "Expensive domestic ($400+)", "British Airways Avios first (7.5-12.5K on AA). Otherwise cash for 8x."],
              ["3", "International economy", "Compare Aeroplan, Flying Blue, United, Delta vs cash for 8x."],
              ["4", "International biz / first", "Always transfer. ANA via MR (75-88K RT Japan), Aeroplan/Flying Blue, Virgin Atlantic."],
              ["5", "Hotels: Hyatt first", "Transfer UR to Hyatt 1:1. Consistently 2-4cpp."],
              ["6", "Hotels: no Hyatt", "Chase Travel portal (8x or Points Boost). The Edit for luxury perks."],
            ].map(([n, t, s]) => (
              <div key={n} style={{ display: "flex", gap: 12, background: `linear-gradient(160deg, ${UI.bg2}, ${UI.bg3})`, border: `1px solid ${UI.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ width: 24, height: 24, minWidth: 24, background: `linear-gradient(135deg, ${UI.text}, ${UI.text2})`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: UI.bg, marginTop: 1 }}>{n}</div>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{t}</div><div style={{ fontSize: 12, color: UI.text2, marginTop: 2 }}>{s}</div></div>
              </div>
            ))}
          </div>
          <Note accent={C.chase}><strong style={{ color: UI.text }}>Portal flights</strong> earn airline miles. <strong style={{ color: UI.text }}>Hotels</strong> marked "loyalty eligible" earn hotel points + elite benefits.</Note>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20 }}>
            {[
              { title: "Chase UR", color: C.chase, rows: [["2-4cpp", "Hyatt", C.green], ["1.5-3cpp", "Airlines", C.green], ["1.25-2cpp", "Portal", UI.text3], ["1.0cpp", "Cash (avoid)", C.red]] },
              { title: "AMEX MR", color: C.amex, rows: [["1.5-5cpp+", "Airlines", C.green], ["~1.0cpp", "Portal", UI.text3], ["0.6-1cpp", "Cash (avoid)", C.red], ["~0.7cpp", "Marriott (avoid)", C.red]] },
            ].map((col, ci) => (
              <div key={ci} style={{ background: `linear-gradient(160deg, ${UI.bg2}, ${UI.bg3})`, border: `1px solid ${UI.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: col.color, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5 }}>{col.title}</div>
                {col.rows.map(([v, l, c], ri) => (
                  <div key={ri} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: c, minWidth: 52, fontWeight: 500 }}>{v}</span><span style={{ color: UI.text2 }}>{l}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            {[[C.chase, "UR = hotels (Hyatt + portal)"], [C.amex, "MR = flights (Delta, ANA, Avios)"]].map(([c, t], i) => (
              <div key={i} style={{ flex: 1, background: UI.bg2, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: UI.text2, display: "flex", gap: 7, alignItems: "center" }}><Dot color={c} size={6} />{t}</div>
            ))}
          </div>
          <button onClick={() => setPartOpen(!partOpen)} style={{ width: "100%", background: `linear-gradient(160deg, ${UI.bg2}, ${UI.bg3})`, border: `1px solid ${UI.border}`, borderRadius: 10, padding: "12px 16px", marginTop: 16, cursor: "pointer", fontFamily: display, color: UI.text, fontSize: 13, fontWeight: 600, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color .2s" }}>
            <span>Transfer partners</span>
            <span style={{ color: UI.text3, fontSize: 14, transform: partOpen ? "rotate(180deg)" : "none", transition: "transform .25s cubic-bezier(0.4, 0, 0.2, 1)" }}>&#9662;</span>
          </button>
          {partOpen && (
            <div className="tab-content" style={{ marginTop: 8 }}>
              {[{ l: "Both UR + MR", sub: "fund from bigger balance", c: C.purple, d: BOTH_P }, { l: "Chase UR only", c: C.chase, d: CHASE_P }, { l: "AMEX MR only", c: C.amex, d: AMEX_P }].map((s, si) => (
                <div key={si} style={{ marginTop: si > 0 ? 14 : 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: UI.text3, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <Dot color={s.c} size={6} />{s.l}{s.sub && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}> -- {s.sub}</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{s.d.map((p, pi) => <PC key={pi} p={p} color={s.c} />)}</div>
                </div>
              ))}
              <Note><strong style={{ color: UI.text }}>Never transfer speculatively.</strong> Confirm availability. One-way, irreversible.</Note>
            </div>
          )}
        </div>
      )}

      {/* POINTS */}
      {tab === "balances" && (
        <div className="tab-content" style={{ paddingTop: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[[C.chase, "Chase UR", urT], [C.amex, "AMEX MR", mrT]].map(([c, l, t], i) => (
              <div key={i} style={{ background: `linear-gradient(160deg, ${c}0C, ${c}04)`, borderRadius: 12, padding: 16, border: `1px solid ${c}20`, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: c, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>{l}</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: mono, color: c, marginTop: 6, letterSpacing: -1 }}>{t.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {progs.map(p => (
              <div key={p.id} style={{ background: `linear-gradient(160deg, ${UI.bg2}, ${UI.bg3})`, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "9px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Dot color={p.color} size={5} />
                  <span style={{ fontSize: 13, flex: 1, fontWeight: 500 }}>{p.label}</span>
                  {!p.sys && <button onClick={() => rm(p.id)} style={{ background: "none", border: "none", color: UI.text3, cursor: "pointer", fontSize: 14, padding: "0 4px", fontFamily: display }}>x</button>}
                  <input type="text" value={p.value === 0 ? "" : p.value.toLocaleString()} placeholder="0" onChange={e => upd(p.id, e.target.value)} onFocus={e => e.target.select()} style={{ background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 6, padding: "6px 10px", color: UI.text, fontFamily: mono, fontSize: 16, fontWeight: 600, width: 110, textAlign: "right", outline: "none", transition: "border-color .2s" }} />
                </div>
                <div style={{ fontSize: 10, color: UI.text3, marginTop: 4, paddingLeft: 14 }}>Updated: {fmtDate(p.updated)}</div>
              </div>
            ))}
          </div>
          {addOpen ? (
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              <input type="text" value={newN} onChange={e => setNewN(e.target.value)} onKeyDown={e => e.key === "Enter" && addP()} placeholder="e.g. United, Hyatt, Delta" autoFocus style={{ flex: 1, background: UI.bg, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "9px 14px", color: UI.text, fontFamily: display, fontSize: 16, outline: "none", transition: "border-color .2s" }} />
              <button onClick={addP} style={{ background: UI.bg3, border: `1px solid ${UI.border}`, borderRadius: 8, padding: "9px 16px", color: UI.text, cursor: "pointer", fontFamily: display, fontSize: 13, fontWeight: 600 }}>Add</button>
              <button onClick={() => { setAddOpen(false); setNewN(""); }} style={{ background: "none", border: `1px solid ${UI.border}`, borderRadius: 8, padding: "9px 12px", color: UI.text3, cursor: "pointer", fontFamily: display, fontSize: 12 }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setAddOpen(true)} style={{ width: "100%", background: "none", border: `1px dashed ${UI.border}`, borderRadius: 8, padding: 10, color: UI.text3, cursor: "pointer", fontFamily: display, fontSize: 12, marginTop: 8, fontWeight: 500, transition: "all .15s" }}>+ Add program</button>
          )}
        </div>
      )}

      {/* CARDS */}
      {tab === "cards" && (
        <div className="tab-content" style={{ paddingTop: 18 }}>
          {[{ who: "Eric", cards: CARDS_ERIC }, { who: "Christine", cards: CARDS_CHRISTINE }].map((person, pi) => {
            const pf = person.cards.reduce((s, c) => s + c.fee, 0);
            return (
              <div key={pi} style={{ marginBottom: pi === 0 ? 22 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{person.who}</div>
                  <div style={{ fontFamily: mono, fontSize: 12, color: UI.text3, fontWeight: 500 }}>${pf}/yr</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {person.cards.map((c, ci) => {
                    const st = statusStyle(c.status);
                    return (
                      <div key={ci} style={{ background: `linear-gradient(160deg, ${UI.bg2}, ${UI.bg3})`, border: `1px solid ${UI.border}`, borderLeft: `2px solid ${c.c}`, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontFamily: mono, fontSize: 10, color: UI.text3, fontWeight: 500 }}>{c.fee > 0 ? `$${c.fee}/yr` : "$0/yr"}</span>
                            <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: st.bg, color: st.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{st.label}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: UI.text2, marginTop: 4, lineHeight: 1.4 }}>{c.use}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18, paddingTop: 14, borderTop: `1px solid ${UI.border}` }}>
            <div style={{ fontFamily: mono, fontSize: 13, color: UI.text3 }}>Total: <span style={{ fontWeight: 700, color: UI.text }}>${totalFee.toLocaleString()}/yr</span></div>
          </div>
          <Note><strong style={{ color: UI.text }}>Strategy changes:</strong> Adding or removing cards affects the swipe guide. Come back to Claude for re-evaluation and redeploy.</Note>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ marginTop: 28, borderTop: `1px solid ${UI.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: UI.text3, marginBottom: 8 }}>Key dates</div>
        {KEY_DATES.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "5px 0", borderBottom: i < KEY_DATES.length - 1 ? `1px solid ${UI.border}` : "none", fontSize: 12, alignItems: "baseline" }}>
            <span style={{ fontFamily: mono, fontWeight: 600, color: d.c, minWidth: 68, fontSize: 10 }}>{d.d}</span>
            <span style={{ color: UI.text2 }}>{d.w}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", color: UI.text3, fontSize: 9, paddingTop: 16, letterSpacing: 0.3 }}>Partners verified Mar 2026</div>
    </div>
  );
}
