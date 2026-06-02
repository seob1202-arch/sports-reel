// api/highlights.js  —  Vercel 서버리스 함수
// 브라우저는 이 엔드포인트(/api/highlights)만 호출합니다. 키는 노출되지 않습니다.
import { getHighlights, QuotaError, AuthError } from "./_core.js";

export default async function handler(req, res) {
  try {
    const { lanes = "", q = "", sport = "", sort = "recent", window = "today" } = req.query || {};
    const laneList = String(lanes).split(",").map((s) => s.trim()).filter(Boolean);

    const data = await getHighlights({
      lanes: laneList,
      q: String(q),
      sport: String(sport),
      sort: sort === "views" ? "views" : "recent",
      window: String(window),
    });

    // CDN 캐싱: 같은 요청은 10분간 캐시에서 응답 → 할당량 절약 + 빠른 응답
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=86400");
    res.status(200).json(data);
  } catch (err) {
    const code = err instanceof QuotaError ? 429 : err instanceof AuthError ? 401 : 500;
    res.status(code).json({ error: err.message || "알 수 없는 오류" });
  }
}
