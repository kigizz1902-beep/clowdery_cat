"use strict";
  /* ========================================================================
     CONFIG — Kakao Maps (F01)
     아래에 카카오 JavaScript 앱 키를 넣으면 홈 지도가 실제 카카오맵으로
     렌더됩니다. 비워두면 좌표 기반 플레이스홀더 지도로 자동 폴백합니다.
     키 발급: https://developers.kakao.com → 내 애플리케이션 → 앱 키 → JavaScript 키
       · 플랫폼 → Web 에 서비스 도메인 등록 필요
         (로컬 테스트: http://localhost:포트, http://127.0.0.1:포트)
       · services 라이브러리로 장소(키워드) 검색까지 지원합니다.
  ======================================================================== */
  const KAKAO_JS_KEY = ""; // 예: "0f2a3b4c...."  ← 카카오 JavaScript 키를 여기에
  const USE_KAKAO_MAPS = () => !!KAKAO_JS_KEY;

  let _kakaoPromise = null;
  function loadKakaoMaps() {
    if (window.kakao && window.kakao.maps && window.kakao.maps.Map) return Promise.resolve(window.kakao);
    if (_kakaoPromise) return _kakaoPromise;
    _kakaoPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      // autoload=false → onload 후 kakao.maps.load()로 명시적 초기화
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&libraries=services&autoload=false`;
      s.async = true;
      s.onload = () => {
        if (window.kakao && window.kakao.maps) window.kakao.maps.load(() => resolve(window.kakao));
        else reject(new Error("Kakao Maps 초기화 실패"));
      };
      s.onerror = () => reject(new Error("Kakao Maps 로드 실패"));
      document.head.appendChild(s);
    });
    return _kakaoPromise;
  }

  /* ========================================================================
     0. 유틸리티
  ======================================================================== */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 9);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function timeAgo(iso) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "방금 전";
    if (diff < 3600) return Math.floor(diff / 60) + "분 전";
    if (diff < 86400) return Math.floor(diff / 3600) + "시간 전";
    return Math.floor(diff / 86400) + "일 전";
  }

  // 빈 화면 컴포넌트 — 이모지 + 제목 + (선택) 보조 문구
  function emptyState(emoji, title, sub) {
    return `<li class="empty-state">
      <div class="empty-state__emoji">${emoji}</div>
      <div class="empty-state__title">${esc(title)}</div>
      ${sub ? `<div class="empty-state__sub">${esc(sub)}</div>` : ""}
    </li>`;
  }

  let _toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add("is-show"));
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove("is-show"), 2200);
  }

  // 하버사인 거리(m) → 도보 분(약 67m/분)
  function walkMinutes(a, b) {
    const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return Math.max(1, Math.round(dist / 67));
  }
  function isOpenNow(hours) {
    if (!hours) return true;
    const h = new Date().getHours();
    return h >= hours.open && h < hours.close;
  }

  /* ========================================================================
     1. 상수 / 사전  (PRD §06 캐릭터, §09 추천, §08 리액션)
  ======================================================================== */
  const CATS = {
    cheese:      { emoji: "🧀", name: "치즈 고양이",     weights: { 맛집: 3, 카페: 2, 팝업: 1 } },
    tuxedo:      { emoji: "🎩", name: "턱시도 고양이",   weights: { 전시: 3, 공연: 3, 팝업: 2 } },
    calico:      { emoji: "🎨", name: "삼색 고양이",     weights: { 쇼핑: 3, 빈티지: 3, 팝업: 1 } },
    russianblue: { emoji: "💙", name: "러시안블루",       weights: { 카페: 3, 서점: 3 } },
    koshort:     { emoji: "🐈", name: "코리안숏헤어",     weights: { 야외: 3, 클래스: 3 } },
  };
  const CAT_EMOJI = (type) => (CATS[type] ? CATS[type].emoji : "🐱");

  const CATEGORIES = ["맛집", "카페", "전시", "공연", "팝업", "쇼핑", "빈티지", "서점", "야외", "클래스"];

  // 카테고리별 이모지 + 컬러 (활기찬 컬러 시스템) — 배경 틴트 + 대비 글자색(AA)
  const CATEGORY_META = {
    "맛집":   { emoji: "🍜", bg: "#FFE3D6", fg: "#B24012" },
    "카페":   { emoji: "☕", bg: "#F1E6D3", fg: "#8A5A22" },
    "전시":   { emoji: "🖼️", bg: "#E3E8FF", fg: "#3B45BF" },
    "공연":   { emoji: "🎭", bg: "#FBE1EC", fg: "#B23A6B" },
    "팝업":   { emoji: "🎉", bg: "#FFEBC7", fg: "#9A6712" },
    "쇼핑":   { emoji: "🛍️", bg: "#FCE0F1", fg: "#B23A82" },
    "빈티지": { emoji: "🧵", bg: "#ECE5D4", fg: "#6E5B2E" },
    "서점":   { emoji: "📚", bg: "#DEF1E9", fg: "#1E7A5E" },
    "야외":   { emoji: "🌳", bg: "#E2F0DA", fg: "#3B7A2E" },
    "클래스": { emoji: "🎨", bg: "#E7E7FB", fg: "#4A46B0" },
  };
  const catEmoji = (cat) => (CATEGORY_META[cat] ? CATEGORY_META[cat].emoji : "📍");
  // 카테고리 태그 HTML (모노크롬 — 회색 칩, 이모지로 구분)
  const catTag = (cat) => `<span class="tag" style="background:#EDEDED;color:#1A1A1A">${catEmoji(cat)} ${esc(cat)}</span>`;

  // 장소 예시 이미지 (이미지/ 폴더) — 카테고리/장소 성격에 맞춰 매핑
  const PLACE_PHOTOS = {
    p1: "이미지/images_2.jpg",  // 을지로 골목 커피 (카페)
    p2: "이미지/images_3.jpg",  // 세운 전시관 (원두·굿즈 진열)
    p3: "이미지/images_6.jpg",  // 충무로 노포 국밥 (F&B)
    p4: "이미지/images_4.jpg",  // 성수 빈티지 마켓 (조용한 창가)
    p6: "이미지/book1.png",     // 종로 헌책방 (서점)
    p7: "이미지/images_5.jpg",  // 익선동 팝업스토어 (감성 샵)
    p9: "이미지/images_1.jpg",  // 약수 조용한 카페 (STRIPE COFFEE 약수점)
  };
  const CAT_TAG_STYLE = { 맛집: "accent", 카페: "mint", 전시: "", 공연: "pink", 팝업: "accent", 쇼핑: "pink", 빈티지: "", 서점: "mint", 야외: "mint", 클래스: "" };

  const REACTIONS = [
    { type: "like",     label: "😻 좋다냥" },
    { type: "wanna-go", label: "🐾 나도 갈래냥" },
    { type: "vibe",     label: "😽 분위기 최고냥" },
    { type: "together", label: "🐈 같이 가자냥" },
    { type: "envy",     label: "😿 부럽다냥" },
  ];

  const VISIBILITY = [
    { value: "private", label: "나만 보기" },
    { value: "clowder", label: "선택한 클라우더" },
    { value: "public",  label: "전체 공개" },
  ];

  /* ========================================================================
     2. 상태 · 저장 (localStorage 영속화, PRD §12 데이터 객체)
  ======================================================================== */
  const STORAGE_KEY = "clowdery.v1";
  let state = null;

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn("저장 실패", e); }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 손상 시 새 시드 */ }
    return null;
  }

  const ME = "me";
  const me = () => state.users.find((u) => u.id === ME);
  const userById = (id) => state.users.find((u) => u.id === id) || { nickname: "알 수 없음", catType: null };
  const placeById = (id) => state.places.find((p) => p.id === id);
  const recordById = (id) => state.records.find((r) => r.id === id);
  const myClowders = () => state.clowders.filter((c) => c.memberIds.includes(ME));

  /* ========================================================================
     3. 시드 데이터 — 데모용 목업
  ======================================================================== */
  function seed() {
    const geoBase = { lat: 37.5665, lng: 126.9910 }; // 서울 중구 부근
    const places = [
      { id: "p1", name: "을지로 골목 커피",   category: "카페",  address: "중구 을지로3가", geo: { lat: 37.5662, lng: 126.9915 }, hours: { open: 9,  close: 22 }, source: "seed", vibe: ["조용한", "빈티지"] },
      { id: "p2", name: "세운 전시관",        category: "전시",  address: "중구 청계천로", geo: { lat: 37.5688, lng: 126.9915 }, hours: { open: 10, close: 19 }, source: "seed", vibe: ["문화", "무료"] },
      { id: "p3", name: "충무로 노포 국밥",   category: "맛집",  address: "중구 충무로", geo: { lat: 37.5615, lng: 126.9945 }, hours: { open: 8,  close: 21 }, source: "seed", vibe: ["로컬", "가성비"] },
      { id: "p4", name: "성수 빈티지 마켓",   category: "빈티지", address: "성동구 성수동", geo: { lat: 37.5445, lng: 127.0560 }, hours: { open: 12, close: 20 }, source: "seed", vibe: ["수집", "플리마켓"] },
      { id: "p5", name: "한강 자전거길",      category: "야외",  address: "용산구 이촌로", geo: { lat: 37.5175, lng: 126.9700 }, hours: { open: 0,  close: 24 }, source: "seed", vibe: ["야외", "산책"] },
      { id: "p6", name: "종로 헌책방",        category: "서점",  address: "종로구 종로", geo: { lat: 37.5705, lng: 126.9910 }, hours: { open: 11, close: 20 }, source: "seed", vibe: ["조용한", "차분"] },
      { id: "p7", name: "익선동 팝업스토어",  category: "팝업",  address: "종로구 익선동", geo: { lat: 37.5735, lng: 126.9905 }, hours: { open: 12, close: 21 }, source: "seed", vibe: ["기간한정", "감성"] },
      { id: "p8", name: "명동 소극장",        category: "공연",  address: "중구 명동길", geo: { lat: 37.5636, lng: 126.9850 }, hours: { open: 14, close: 22 }, source: "seed", vibe: ["문화", "공연"] },
      { id: "p9", name: "약수 조용한 카페",   category: "카페",  address: "중구 다산로", geo: { lat: 37.5540, lng: 127.0100 }, hours: { open: 10, close: 23 }, source: "seed", vibe: ["조용한", "차분"] },
    ];
    const users = [
      { id: ME,  nickname: "나",   catType: null, interests: [], notificationSettings: { reactions: true, messages: true, newRecords: true } },
      { id: "u2", nickname: "수연", catType: "cheese",      interests: [] },
      { id: "u3", nickname: "준호", catType: "russianblue", interests: [] },
      { id: "u4", nickname: "하은", catType: "tuxedo",      interests: [] },
    ];
    const clowders = [
      { id: "c1", name: "을지로 산책단", ownerId: "u2", memberIds: [ME, "u2", "u3"], description: "퇴근 후 을지로 골목을 걷는 사람들" },
      { id: "c2", name: "성수 탐험대",   ownerId: "u4", memberIds: [ME, "u4"],       description: "성수동 구석구석" },
    ];
    // 지인 기록 (피드/장소상세 채우기용)
    const records = [
      { id: "r1", userId: "u2", placeId: "p1", photo: null, oneLine: "골목 안 조용한 커피, 통유리 자리 최고", rating: 4.5, visitDate: todayISO(), visibility: "clowder", clowderIds: ["c1"], createdAt: new Date(Date.now() - 3600e3).toISOString() },
      { id: "r2", userId: "u3", placeId: "p6", photo: null, oneLine: "헌책 냄새와 오래된 의자, 오래 앉아있게 됨", rating: 4, visitDate: todayISO(), visibility: "clowder", clowderIds: ["c1"], createdAt: new Date(Date.now() - 7200e3).toISOString() },
      { id: "r3", userId: "u4", placeId: "p4", photo: null, oneLine: "빈티지 그릇 득템, 주말 플리마켓 열림", rating: 5, visitDate: todayISO(), visibility: "clowder", clowderIds: ["c2"], createdAt: new Date(Date.now() - 5400e3).toISOString() },
      { id: "r4", userId: "u2", placeId: "p7", photo: null, oneLine: "이번 주까지만 하는 팝업, 지금이 타이밍", rating: 4, visitDate: todayISO(), visibility: "public", clowderIds: [], createdAt: new Date(Date.now() - 1800e3).toISOString() },
    ];
    const reactions = [
      { id: uid("rx"), recordId: "r1", userId: "u3", type: "vibe",     createdAt: new Date().toISOString() },
      { id: uid("rx"), recordId: "r3", userId: "u2", type: "wanna-go", createdAt: new Date().toISOString() },
    ];
    const messages = [
      { id: uid("m"), recordId: "r1", userId: "u3", text: "여기 다음에 같이 가자!", createdAt: new Date(Date.now() - 1200e3).toISOString() },
    ];
    const notifications = [
      { id: uid("n"), type: "newRecords", recordId: "r4", fromUserId: "u2", read: false, createdAt: new Date(Date.now() - 1800e3).toISOString() },
      { id: uid("n"), type: "reactions",  recordId: "r1", fromUserId: "u3", read: false, createdAt: new Date(Date.now() - 900e3).toISOString() },
      { id: uid("n"), type: "messages",   recordId: "r1", fromUserId: "u3", read: true,  createdAt: new Date(Date.now() - 600e3).toISOString() },
    ];
    return {
      users, places, clowders, records, reactions, messages, notifications,
      savedPlaces: [],            // 나도 갈래냥 → 가보고 싶은 곳
      recentlyViewed: [],         // 반복 방지 신호
      myLocation: geoBase,        // 위치 권한 전 기본값
      locationStatus: "unknown",  // unknown / granted / denied
    };
  }

