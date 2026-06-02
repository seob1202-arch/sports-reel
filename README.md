# SPORTS REEL — 스포츠 하이라이트 큐레이션

YouTube Data API v3로 국가별·종목별 스포츠 하이라이트를 큐레이션하는 웹앱입니다.
넷플릭스 스타일 다크 UI · 종목/리그 필터 · 검색 · 인앱 재생.

**핵심:** API 키는 서버리스 함수(`/api/highlights`)에서만 사용되며 브라우저로 전송되지 않습니다.
프론트엔드 코드 어디에도 키가 들어가지 않습니다.

```
브라우저  ──►  /api/highlights  ──►  (서버) YouTube Data API
 (키 없음)      (키는 여기서만)        키는 환경변수로만 존재
```

---

## 1. 사전 준비 — YouTube API 키 발급 (본인이 직접)

1. https://console.cloud.google.com 접속 → 프로젝트 생성
2. **API 및 서비스 → 라이브러리**에서 **YouTube Data API v3** 검색 후 **사용 설정**
3. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**
4. (권장) 생성된 키 → **편집**에서 **API 제한**을 *YouTube Data API v3* 로 한정
   - 서버에서만 쓰므로 HTTP 리퍼러 제한은 불필요합니다(애초에 키가 노출되지 않음).

> 기본 할당량은 하루 10,000 유닛입니다. 검색 1회 = 약 101 유닛이라
> 캐시(아래) 덕분에 개인용으로는 충분합니다.

---

## 2. 로컬에서 실행

```bash
npm install

# .env 파일 만들고 키 입력
cp .env.example .env
#  → .env 안의 YOUTUBE_API_KEY 값을 본인 키로 수정

# /api 까지 같이 띄우려면 플랫폼 CLI 사용:
npx vercel dev      # Vercel 방식
#   또는
npx netlify dev     # Netlify 방식
```

> `npm run dev`(순수 Vite)만 쓰면 프론트엔드는 뜨지만 `/api`가 없어
> "데이터를 불러오지 못했어요" 안내가 표시됩니다. API까지 보려면 위 CLI를 쓰세요.

---

## 3-A. Vercel 배포

1. 코드를 GitHub 저장소에 올립니다.
2. https://vercel.com → **New Project** → 저장소 선택 (프레임워크 자동 인식: Vite)
3. **Settings → Environment Variables** 에 추가:
   - Name: `YOUTUBE_API_KEY`  /  Value: 본인 키
4. **Deploy**. `api/highlights.js`가 자동으로 서버리스 함수가 됩니다.

## 3-B. Netlify 배포

1. 코드를 GitHub 저장소에 올립니다.
2. https://app.netlify.com → **Add new site → Import** → 저장소 선택
   (빌드 설정은 `netlify.toml`에 이미 들어있음)
3. **Site settings → Environment variables** 에 `YOUTUBE_API_KEY` 추가
4. **Deploy**. `netlify.toml`의 리다이렉트가 `/api/highlights`를 함수로 연결합니다.

---

## 폴더 구조

```
sports-reel/
├─ api/
│  ├─ _core.js          ← YouTube 호출 핵심 로직 (키 사용처)
│  └─ highlights.js     ← Vercel 함수 엔드포인트
├─ netlify/functions/
│  └─ highlights.js     ← Netlify 함수 엔드포인트 (같은 _core 공유)
├─ src/
│  ├─ App.jsx           ← 메인 UI
│  ├─ lanes.js          ← 종목/리그 메타 (표시용)
│  ├─ index.css         ← 스타일
│  └─ main.jsx
├─ index.html
├─ netlify.toml
├─ vite.config.js
├─ package.json
└─ .env.example
```

---

## 동작 방식 & 할당량 관리

- **레인(lane)** 단위로 검색합니다. 레인 = 리그 하나(EPL, NBA, MLB, UFC …).
- "전체" 화면은 종목당 대표 1개(EPL/NBA/MLB/UFC)만 불러 호출 수를 4개로 제한합니다
  (`src/lanes.js`의 `ALL_LANES`에서 조정 가능).
- 응답에 `Cache-Control: s-maxage=600` 을 붙여 **같은 요청은 10분간 CDN 캐시**에서 응답 →
  할당량 절약 + 즉시 로딩. 서버 메모리에도 10분 캐시가 있습니다.
- 검색어/리그를 추가·변경하려면:
  - 새 리그: `api/_core.js`의 `LANES`에 검색어를, `src/lanes.js`의 `LEAGUES`에 라벨을 추가
  - 검색 결과 신선도: `_core.js`의 `publishedAfter`(기본 최근 60일) 조정

---

## 커스터마이즈 아이디어

- 즐겨찾기 리그를 `localStorage`에 저장해 개인화 행 추가
- 팀 단위 필터(검색어에 팀명 결합)
- 무한 스크롤 / 더 많은 결과(`search.list`의 `pageToken`)
- 종목 추가(테니스, e스포츠 등) — `LANES`/`LEAGUES`에 한 줄씩
