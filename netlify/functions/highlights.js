// netlify/functions/highlights.js  —  Netlify Functions
// netlify.toml 의 리다이렉트로 /api/highlights 요청이 이 함수로 연결됩니다.
import { getHighlights, QuotaError, AuthError } from "../../api/_core.js";

export const handler = async (event) => {
  const p = event.queryStringParameters || {};
  try {
    const laneList = String(p.lanes || "").split(",").map((s) => s.trim()).filter(Boolean);
    const data = await getHighlights({
      lanes: laneList,
      q: String(p.q || ""),
      sport: String(p.sport || ""),
      sort: p.sort === "views" ? "views" : "recent",
    });
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=600, stale-while-revalidate=86400",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    const code = err instanceof QuotaError ? 429 : err instanceof AuthError ? 401 : 500;
    return {
      statusCode: code,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "알 수 없는 오류" }),
    };
  }
};
