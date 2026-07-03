"use strict";
  /* ========================================================================
     20. 초기화
  ======================================================================== */
  function bindGlobalNav() {
    const map = { home: "/", recommend: "/recommend", feed: "/feed", "my-records": "/my-records", profile: "/profile" };
    Object.keys(map).forEach((k) => {
      const a = $("#global-nav__" + k);
      if (a) a.addEventListener("click", (e) => { e.preventDefault(); navigate(map[k]); });
    });
    $("#global-header__search-btn").onclick = () => navigate("/search?q=");
    $("#global-header__notification-btn").onclick = () => navigate("/notifications");
    // 로고(Clowdery) 클릭 → 온보딩(고양이 선택)
    $("#global-header__logo").addEventListener("click", () => navigate("/onboarding"));
  }

  function init() {
    const loaded = load();
    state = loaded || seed();
    // 스키마 보강 (구버전 대비)
    state.savedPlaces = state.savedPlaces || [];
    state.recentlyViewed = state.recentlyViewed || [];
    // 장소 예시 이미지 backfill (신규 필드 — 기존 저장 상태에도 반영)
    state.places.forEach((p) => { if (PLACE_PHOTOS[p.id]) p.photo = PLACE_PHOTOS[p.id]; });
    if (!loaded) save();   // 첫 진입 시 시드 데이터 영속화 (데모 안정화)

    document.body.classList.add("spa");   // SPA 모드 on (JS 활성 시에만)
    bindGlobalNav();
    updateBadge();

    window.addEventListener("hashchange", () => { router(); updateBadge(); });
    router();

    if (state.locationStatus === "granted") requestLocation();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
