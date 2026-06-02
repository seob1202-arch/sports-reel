// src/lanes.js — 화면 표시용 메타 (검색어는 서버에만 있음)
export const SPORTS = {
  soccer:     { label: "축구",   icon: "⚽", accent: "#00c46a" },
  basketball: { label: "농구",   icon: "🏀", accent: "#ff7a18" },
  baseball:   { label: "야구",   icon: "⚾", accent: "#2e8bff" },
  combat:     { label: "격투기", icon: "🥊", accent: "#ff2d4b" },
};

export const LEAGUES = {
  soccer: [
    { id: "epl",     label: "EPL",         country: "잉글랜드", flag: "🏴" },
    { id: "laliga",  label: "라리가",       country: "스페인",   flag: "🇪🇸" },
    { id: "bundes",  label: "분데스리가",   country: "독일",     flag: "🇩🇪" },
    { id: "seriea",  label: "세리에 A",     country: "이탈리아", flag: "🇮🇹" },
    { id: "kleague", label: "K리그",        country: "대한민국", flag: "🇰🇷" },
    { id: "ucl",     label: "챔피언스리그", country: "유럽",     flag: "🇪🇺" },
  ],
  basketball: [
    { id: "nba", label: "NBA", country: "미국",     flag: "🇺🇸" },
    { id: "kbl", label: "KBL", country: "대한민국", flag: "🇰🇷" },
  ],
  baseball: [
    { id: "mlb", label: "MLB", country: "미국",     flag: "🇺🇸" },
    { id: "kbo", label: "KBO", country: "대한민국", flag: "🇰🇷" },
    { id: "npb", label: "NPB", country: "일본",     flag: "🇯🇵" },
  ],
  combat: [
    { id: "ufc", label: "UFC", country: "미국", flag: "🌍" },
  ],
};

// "전체" 화면에서 보여줄 대표 레인 (할당량 절약을 위해 종목당 1개)
export const ALL_LANES = ["epl", "nba", "mlb", "ufc"];

// 레인 id -> 종목/라벨 빠른 조회
export const LANE_INFO = Object.fromEntries(
  Object.entries(LEAGUES).flatMap(([sport, list]) =>
    list.map((l) => [l.id, { ...l, sport }])
  )
);
