import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { SPORTS, LEAGUES, LANE_INFO, ALL_LANES } from "./lanes.js";

/* ───────── helpers ───────── */
const fmtViews = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M"
  : n >= 1e3 ? Math.round(n / 1e3) + "K" : "" + (n || 0);

const fmtDate = (d) => {
  if (!d) return "";
  const days = Math.round((Date.now() - new Date(d)) / 864e5);
  return days <= 0 ? "오늘" : days === 1 ? "어제"
    : days < 7 ? `${days}일 전` : days < 30 ? `${Math.floor(days / 7)}주 전`
    : `${Math.floor(days / 30)}개월 전`;
};

/* ───────── Thumbnail ───────── */
function Thumb({ v, big }) {
  const accent = SPORTS[v.sport]?.accent || "#888";
  const league = LANE_INFO[v.league];
  const [err, setErr] = useState(false);
  return (
    <div className="thumb" style={{ "--ac": accent }}>
      {v.thumb && !err ? (
        <img className="thumb-img" src={v.thumb} alt="" loading="lazy" onError={() => setErr(true)} />
      ) : (
        <div className="thumb-fallback"><span className="thumb-icon">{SPORTS[v.sport]?.icon}</span></div>
      )}
      <div className="thumb-shade" />
      <div className="thumb-top">
        <span className="thumb-league">{league ? `${league.flag} ${league.label}` : "하이라이트"}</span>
        {v.dur && <span className="thumb-dur">{v.dur}</span>}
      </div>
      {big && <div className="thumb-icon-lg">{SPORTS[v.sport]?.icon}</div>}
      <div className="thumb-play">
        <svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M8 5v14l11-7z" /></svg>
      </div>
    </div>
  );
}

/* ───────── Card ───────── */
function Card({ v, onOpen }) {
  return (
    <button className="card" onClick={() => onOpen(v)} aria-label={v.title}>
      <Thumb v={v} />
      <div className="card-info">
        <div className="card-title">{v.title}</div>
        <div className="card-meta">
          <span className="dot" style={{ background: SPORTS[v.sport]?.accent }} />
          {v.channel || SPORTS[v.sport]?.label} · {fmtViews(v.views)} · {fmtDate(v.date)}
        </div>
      </div>
    </button>
  );
}

/* ───────── Row ───────── */
function Row({ title, items, onOpen }) {
  const ref = useRef(null);
  if (!items?.length) return null;
  const scroll = (d) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="row">
      <h2 className="row-title">{title}<span className="row-count">{items.length}</span></h2>
      <div className="row-wrap">
        <button className="row-arrow left" onClick={() => scroll(-1)} aria-label="이전">‹</button>
        <div className="row-track" ref={ref}>
          {items.map((v) => <Card key={v.id} v={v} onOpen={onOpen} />)}
        </div>
        <button className="row-arrow right" onClick={() => scroll(1)} aria-label="다음">›</button>
      </div>
    </section>
  );
}

function SkeletonRow() {
  return (
    <section className="row">
      <div className="sk-title" />
      <div className="row-track">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="card sk-card" key={i}><div className="sk-thumb" /><div className="sk-line" /><div className="sk-line short" /></div>
        ))}
      </div>
    </section>
  );
}

/* ───────── Player modal ───────── */
function Player({ v, onClose }) {
  // ❗ 모달이 실제로 열렸을 때(v 존재)에만 스크롤을 잠급니다.
  useEffect(() => {
    if (!v) return;                       // 닫혀 있으면 아무것도 하지 않음 → 페이지 스크롤 정상
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [v, onClose]);

  if (!v) return null;
  const league = LANE_INFO[v.league];
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="닫기">✕</button>
        <div className="modal-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={v.title} frameBorder="0" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
        <div className="modal-body">
          <div className="modal-badges">
            <span className="badge" style={{ "--ac": SPORTS[v.sport]?.accent }}>{SPORTS[v.sport]?.icon} {SPORTS[v.sport]?.label}</span>
            {league && <span className="badge ghost">{league.flag} {league.label}</span>}
            {v.dur && <span className="badge ghost">{v.dur}</span>}
          </div>
          <h3 className="modal-title">{v.title}</h3>
          <div className="modal-meta">{v.channel && <>{v.channel} · </>}{fmtViews(v.views)} 조회 · {fmtDate(v.date)}</div>
          <a className="modal-yt" href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer">YouTube에서 열기 ↗</a>
        </div>
      </div>
    </div>
  );
}

/* ───────── App ───────── */
export default function App() {
  const [sport, setSport] = useState("all");
  const [league, setLeague] = useState("all");
  const [sort, setSort] = useState("recent");
  const [period, setPeriod] = useState("today"); // 기간 필터: today/3d/week/month
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false); // 모바일 검색 토글

  const availLeagues = sport === "all" ? [] : LEAGUES[sport];

  const requestLanes = useMemo(() => {
    if (query.trim()) return [];
    if (sport === "all") return ALL_LANES;
    if (league !== "all") return [league];
    return LEAGUES[sport].map((l) => l.id);
  }, [sport, league, query]);

  const [lanesData, setLanesData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ sort, window: period });
      if (query.trim()) { params.set("q", query.trim()); if (sport !== "all") params.set("sport", sport); }
      else params.set("lanes", requestLanes.join(","));
      const res = await fetch(`/api/highlights?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `요청 실패 (${res.status})`);
      setLanesData(json.lanes || {});
    } catch (e) { setError(e.message); setLanesData({}); }
    finally { setLoading(false); }
  }, [sort, period, query, sport, requestLanes]);

  useEffect(() => { load(); }, [load]);

  const allVideos = useMemo(() => Object.values(lanesData).flat(), [lanesData]);
  const hero = useMemo(() => [...allVideos].sort((a, b) => b.views - a.views)[0], [allVideos]);

  const periodLabel = { today: "오늘", "3d": "최근 3일", week: "이번 주", month: "이번 달" }[period] || "오늘";

  const rows = useMemo(() => {
    if (query.trim()) return [{ title: `"${query}" 검색 결과`, items: lanesData.search || [] }];
    const r = [];
    if (allVideos.length) r.push({ title: `🔥 ${periodLabel} 뜨는 하이라이트`, items: [...allVideos].sort((a, b) => b.views - a.views).slice(0, 30) });
    requestLanes.forEach((id) => {
      const info = LANE_INFO[id];
      const items = lanesData[id] || [];
      if (items.length) r.push({ title: `${info.flag} ${info.label} · ${info.country}`, items });
    });
    return r;
  }, [lanesData, allVideos, requestLanes, query, periodLabel]);

  const selectSport = (s) => { setSport(s); setLeague("all"); setQuery(""); setQueryInput(""); window.scrollTo({ top: 0 }); };
  const submitSearch = () => setQuery(queryInput);
  const clearSearch = () => { setQueryInput(""); setQuery(""); };
  const closePlayer = useCallback(() => setOpen(null), []);

  return (
    <div className="app">
      {/* NAV */}
      <header className="nav">
        <div className="brand"><span className="brand-mark">▶</span>SPORTS<span className="brand-thin">REEL</span></div>
        <nav className="nav-tabs">
          <button className={sport === "all" ? "ntab on" : "ntab"} onClick={() => selectSport("all")}>전체</button>
          {Object.entries(SPORTS).map(([k, m]) => (
            <button key={k} className={sport === k ? "ntab on" : "ntab"} onClick={() => selectSport(k)} style={{ "--ac": m.accent }}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </nav>
        <button className="search-btn" onClick={() => setSearchOpen((o) => !o)} aria-label="검색">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" strokeWidth="2" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
        <div className={searchOpen ? "search open" : "search"}>
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="#9a9aab" strokeWidth="2" d="M21 21l-5-5m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitSearch()} placeholder="팀 · 선수 · 키워드 검색 후 Enter" />
          {queryInput && <button className="search-x" onClick={clearSearch}>✕</button>}
        </div>
      </header>

      {/* HERO */}
      {hero && !query.trim() && !loading && (
        <div className="hero" style={{ "--ac": SPORTS[hero.sport]?.accent }} onClick={() => setOpen(hero)}>
          <div className="hero-thumb"><Thumb v={hero} big /></div>
          <div className="hero-overlay" />
          <div className="hero-content">
            <span className="hero-kicker">{SPORTS[hero.sport]?.icon} {SPORTS[hero.sport]?.label} · 오늘의 추천</span>
            <h1 className="hero-title">{hero.title}</h1>
            <div className="hero-meta">{hero.channel} · {fmtViews(hero.views)} 조회 · {fmtDate(hero.date)}</div>
            <div className="hero-btns"><button className="hero-play">▶ 재생</button></div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="fbar">
        <div className="fbar-left">
          {sport !== "all" && !query.trim() && (
            <div className="chips">
              <button className={league === "all" ? "chip on" : "chip"} onClick={() => setLeague("all")}>전체 리그</button>
              {availLeagues.map((l) => (
                <button key={l.id} className={league === l.id ? "chip on" : "chip"} onClick={() => setLeague(l.id)}>{l.flag} {l.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="fbar-right">
          <div className="seg period">
            <button className={period === "today" ? "on" : ""} onClick={() => setPeriod("today")}>오늘</button>
            <button className={period === "3d" ? "on" : ""} onClick={() => setPeriod("3d")}>3일</button>
            <button className={period === "week" ? "on" : ""} onClick={() => setPeriod("week")}>1주</button>
            <button className={period === "month" ? "on" : ""} onClick={() => setPeriod("month")}>1달</button>
          </div>
          <div className="seg">
            <button className={sort === "recent" ? "on" : ""} onClick={() => setSort("recent")}>최신순</button>
            <button className={sort === "views" ? "on" : ""} onClick={() => setSort("views")}>조회순</button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="main">
        {error ? (
          <div className="empty error">
            <b>데이터를 불러오지 못했어요.</b>
            <span>{error}</span>
            <span className="hint">Vercel의 <code>YOUTUBE_API_KEY</code> 환경변수가 등록됐는지 확인하세요.</span>
            <button className="retry" onClick={load}>다시 시도</button>
          </div>
        ) : loading ? (<><SkeletonRow /><SkeletonRow /></>)
        : rows.length === 0 ? (<div className="empty">선택한 기간에 올라온 하이라이트가 없어요.<br/>위의 <b>기간</b>을 '3일'이나 '1주'로 넓혀 보세요.</div>)
        : rows.map((r, i) => <Row key={i} title={r.title} items={r.items} onOpen={setOpen} />)}
      </main>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="tabbar">
        <button className={sport === "all" ? "tab on" : "tab"} onClick={() => selectSport("all")}>
          <span className="tab-ic">🏠</span><span className="tab-lb">전체</span>
        </button>
        {Object.entries(SPORTS).map(([k, m]) => (
          <button key={k} className={sport === k ? "tab on" : "tab"} onClick={() => selectSport(k)} style={{ "--ac": m.accent }}>
            <span className="tab-ic">{m.icon}</span><span className="tab-lb">{m.label}</span>
          </button>
        ))}
      </nav>

      <footer className="foot">SPORTS<b>REEL</b> · YouTube Data API v3 · 키는 서버에서만 사용됩니다</footer>

      <Player v={open} onClose={closePlayer} />
    </div>
  );
}
