// api/_core.js
// ─────────────────────────────────────────────────────────────────────────
// 서버 전용 모듈. YouTube Data API v3 호출과 데이터 가공을 담당합니다.
// API 키는 이 파일을 거치는 서버(서버리스 함수)에서만 사용되며,
// 브라우저로는 절대 전송되지 않습니다.
// Vercel(api/highlights.js)과 Netlify(netlify/functions/highlights.js) 양쪽이
// 이 모듈을 공유합니다.
// ─────────────────────────────────────────────────────────────────────────

// 종목 메타 (프론트와 라벨이 겹치지만 서버는 검색어 매핑이 핵심)
export const SPORTS = {
  soccer: "축구",
  basketball: "농구",
  baseball: "야구",
  combat: "격투기",
};

// 각 "레인(lane)" = 국가/리그 단위. q는 YouTube 검색어.
export const LANES = {
  epl:     { sport: "soccer",     q: "Premier League highlights",          region: "GB", lang: "en" },
  laliga:  { sport: "soccer",     q: "LaLiga highlights",                   region: "ES", lang: "es" },
  bundes:  { sport: "soccer",     q: "Bundesliga highlights",              region: "DE", lang: "de" },
  seriea:  { sport: "soccer",     q: "Serie A highlights",                 region: "IT", lang: "it" },
  kleague: { sport: "soccer",     q: "K리그 하이라이트",                     region: "KR", lang: "ko" },
  ucl:     { sport: "soccer",     q: "UEFA Champions League highlights",   region: "GB", lang: "en" },
  nba:     { sport: "basketball", q: "NBA highlights",                     region: "US", lang: "en" },
  kbl:     { sport: "basketball", q: "KBL 농구 하이라이트",                  region: "KR", lang: "ko" },
  mlb:     { sport: "baseball",   q: "MLB highlights",                     region: "US", lang: "en" },
  kbo:     { sport: "baseball",   q: "KBO 하이라이트",                       region: "KR", lang: "ko" },
  npb:     { sport: "baseball",   q: "プロ野球 ハイライト",                   region: "JP", lang: "ja" },
  ufc:     { sport: "combat",     q: "UFC highlights",                     region: "US", lang: "en" },
};

const YT = "https://www.googleapis.com/youtube/v3";
const DAY = 24 * 60 * 60 * 1000;

// ── 서버 측 단기 캐시 (웜 인스턴스 동안만 유효). 진짜 캐시는 CDN(Cache-Control). ──
const cache = new Map(); // key -> { at:number, data:any }
const TTL = 10 * 60 * 1000; // 10분

function getCache(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  return null;
}
function setCache(key, data) {
  cache.set(key, { at: Date.now(), data });
}

// ── 유틸 ──
function decodeHtml(s = "") {
  return s
    .replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&apos;/g, "'");
}
function parseDuration(iso = "") {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = +(m[1] || 0), mn = +(m[2] || 0), s = +(m[3] || 0);
  const totalMin = h * 60 + mn;
  return `${totalMin}:${String(s).padStart(2, "0")}`;
}

class QuotaError extends Error {}
class AuthError extends Error {}

async function ytFetch(url) {
  const res = await fetch(url);
  if (res.ok) return res.json();
  let body = {};
  try { body = await res.json(); } catch {}
  const reason = body?.error?.errors?.[0]?.reason || body?.error?.status || "";
  if (res.status === 403 && /quota/i.test(reason)) throw new QuotaError("YouTube API 일일 할당량을 초과했습니다.");
  if (res.status === 400 || res.status === 401 || /API_KEY|keyInvalid/i.test(reason))
    throw new AuthError("API 키가 유효하지 않거나 YouTube Data API v3가 활성화되지 않았습니다.");
  throw new Error(`YouTube API 오류 (${res.status}) ${reason}`);
}

// ── 검색어 하나(레인 또는 자유검색)에 대해 영상 목록 가져오기 ──
async function runQuery({ key, sport, league, q, order }) {
  const ytOrder = order === "views" ? "viewCount" : "date";
  const publishedAfter = new Date(Date.now() - 60 * DAY).toISOString(); // 최근 60일

  // 1) search.list (100 유닛). maxResults는 비용과 무관 → 최대치인 50개를 받음.
  const su = new URL(`${YT}/search`);
  su.searchParams.set("part", "snippet");
  su.searchParams.set("q", q);
  su.searchParams.set("type", "video");
  su.searchParams.set("maxResults", "50");
  su.searchParams.set("order", ytOrder);
  su.searchParams.set("videoEmbeddable", "true");
  su.searchParams.set("publishedAfter", publishedAfter);
  su.searchParams.set("key", key);
  const lane = league && LANES[league];
  if (lane?.region) su.searchParams.set("regionCode", lane.region);
  if (lane?.lang) su.searchParams.set("relevanceLanguage", lane.lang);

  const search = await ytFetch(su);
  const ids = (search.items || []).map((i) => i.id?.videoId).filter(Boolean);
  if (!ids.length) return [];

  // 2) videos.list (1 유닛) — 재생시간/조회수 보강
  const vu = new URL(`${YT}/videos`);
  vu.searchParams.set("part", "contentDetails,statistics");
  vu.searchParams.set("id", ids.join(","));
  vu.searchParams.set("key", key);
  const vids = await ytFetch(vu);
  const meta = {};
  for (const it of vids.items || []) {
    meta[it.id] = {
      dur: parseDuration(it.contentDetails?.duration),
      views: Number(it.statistics?.viewCount || 0),
    };
  }

  return (search.items || []).map((i) => {
    const vid = i.id.videoId;
    const t = i.snippet?.thumbnails || {};
    return {
      id: vid,
      videoId: vid,
      sport: sport || lane?.sport || "soccer",
      league: league || "search",
      title: decodeHtml(i.snippet?.title || ""),
      channel: decodeHtml(i.snippet?.channelTitle || ""),
      date: i.snippet?.publishedAt || "",
      thumb: (t.maxres || t.standard || t.high || t.medium || t.default || {}).url || "",
      dur: meta[vid]?.dur || "",
      views: meta[vid]?.views || 0,
    };
  });
}

// ── 외부에서 호출하는 메인 함수 ──
// 입력: { lanes:["epl",...] } 또는 { q:"손흥민", sport:"soccer" }, sort
// 출력: { lanes: { epl:[...], ... } }  (자유검색이면 { search:[...] })
export async function getHighlights({ lanes = [], q = "", sport = "", sort = "recent" }) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new AuthError("서버에 YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다.");

  // 자유 검색 모드
  if (q && q.trim()) {
    const term = sport ? `${q} ${SPORTS[sport] || ""} highlights` : `${q} highlights`;
    const cacheKey = `q:${term}:${sort}`;
    let data = getCache(cacheKey);
    if (!data) {
      data = await runQuery({ key, sport, league: "", q: term, order: sort });
      setCache(cacheKey, data);
    }
    return { lanes: { search: data } };
  }

  // 브라우즈 모드 — 레인별로 병렬 호출, 레인 단위 캐시
  const valid = lanes.filter((l) => LANES[l]);
  const out = {};
  await Promise.all(
    valid.map(async (laneId) => {
      const lane = LANES[laneId];
      const cacheKey = `lane:${laneId}:${sort}`;
      let data = getCache(cacheKey);
      if (!data) {
        data = await runQuery({ key, sport: lane.sport, league: laneId, q: lane.q, order: sort });
        setCache(cacheKey, data);
      }
      out[laneId] = data;
    })
  );
  return { lanes: out };
}

export { QuotaError, AuthError };
