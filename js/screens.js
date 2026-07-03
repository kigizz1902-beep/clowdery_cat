"use strict";
  /* ========================================================================
     4. 라우터 (SPA · 해시 기반)  — PRD §05 화면/URL
  ======================================================================== */
  const ROUTES = [
    { re: /^\/?$/,                       screen: "screen-home",          fn: renderHome },
    { re: /^\/onboarding$/,              screen: "screen-onboarding",    fn: renderOnboarding },
    { re: /^\/place\/([^/]+)\/write$/,   screen: "screen-write",         fn: renderWrite,        focus: true },
    { re: /^\/place\/([^/]+)$/,          screen: "screen-place-detail",  fn: renderPlaceDetail,  focus: true },
    { re: /^\/recommend$/,               screen: "screen-recommend",     fn: renderRecommend },
    { re: /^\/feed$/,                    screen: "screen-feed",          fn: renderFeed },
    { re: /^\/my-records$/,              screen: "screen-my-records",    fn: renderMyRecords },
    { re: /^\/search$/,                  screen: "screen-search",        fn: renderSearch },
    { re: /^\/clowders\/([^/]+)$/,       screen: "screen-clowder-detail",fn: renderClowderDetail, focus: true },
    { re: /^\/clowders$/,                screen: "screen-clowders",      fn: renderClowders },
    { re: /^\/notifications$/,           screen: "screen-notifications", fn: renderNotifications },
    { re: /^\/profile$/,                 screen: "screen-profile",       fn: renderProfile },
    { re: /^\/share\/([^/]+)$/,          screen: "screen-share-landing", fn: renderShareLanding, focus: true },
  ];

  function parseHash() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, query] = raw.split("?");
    return { path, params: new URLSearchParams(query || "") };
  }

  function navigate(to) { location.hash = to.startsWith("#") ? to.slice(1) : to; }

  function router() {
    // 온보딩 가드: 고양이 미선택 시 강제 이동
    const { path, params } = parseHash();
    if (!me().catType && path !== "/onboarding") { navigate("/onboarding"); return; }

    let matched = ROUTES.find((r) => r.re.test(path)) || ROUTES[0];
    const m = path.match(matched.re) || [];

    // 화면 전환
    $$("#app-main > section").forEach((s) => s.classList.remove("is-active"));
    const screen = document.getElementById(matched.screen);
    if (screen) screen.classList.add("is-active");

    // 집중 화면 → 하단 내비 숨김
    document.body.classList.toggle("focus-mode", !!matched.focus);

    // 내비 활성 표시
    const navMap = { "screen-home": "home", "screen-recommend": "recommend", "screen-feed": "feed", "screen-my-records": "my-records", "screen-profile": "profile" };
    $$("#global-nav a").forEach((a) => a.classList.remove("is-current"));
    const navId = navMap[matched.screen];
    if (navId) $("#global-nav__" + navId).classList.add("is-current");

    window.scrollTo(0, 0);
    matched.fn(m[1], params);
  }

  /* ========================================================================
     5. 온보딩 — 고양이 선택 (PRD §06 / 캐릭터 시스템)
  ======================================================================== */
  function renderOnboarding() {
    let selected = me().catType || null;
    const list = $("#onboarding__cat-list");
    const items = $$(".onboarding__cat-item", list);
    const pick = (li) => {
      selected = li.dataset.cat;
      items.forEach((x) => {
        const on = x === li;
        x.classList.toggle("is-active", on);
        x.setAttribute("aria-pressed", on ? "true" : "false");
      });
    };
    items.forEach((li) => {
      const on = li.dataset.cat === selected;
      li.classList.toggle("is-active", on);
      li.setAttribute("aria-pressed", on ? "true" : "false");
      li.onclick = () => pick(li);
      li.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(li); }
      };
    });
    // .is-active 를 chip 스타일로 재사용
    list.classList.add("stack");

    $("#onboarding__confirm-btn").onclick = () => {
      if (!selected) { toast("고양이를 한 마리 골라주세요 🐱"); return; }
      const u = me();
      u.catType = selected;
      // 초기 관심사 = 고양이 가중치 카테고리 (사용자가 이후 수정 가능, §06)
      u.interests = Object.keys(CATS[selected].weights);
      save();
      requestLocation();      // 위치 권한 요청 (F01 전제)
      toast(CATS[selected].emoji + " " + CATS[selected].name + "와 탐험을 시작해요");
      navigate("/");
    };
  }

  /* ========================================================================
     6. 홈 — 지도 탐색 (F01) + 검색 + 카테고리 필터
  ======================================================================== */
  let homeFilter = null; // 선택 카테고리

  function renderHome() {
    renderCategoryFilter();
    renderMap();
    renderPlaceList();

    const input = $("#home__search-input");
    if (USE_KAKAO_MAPS()) {
      setupKakaoPlacesSearch();    // 카카오 장소(키워드) 검색
    } else {
      input.onkeydown = (e) => {   // 폴백: 시드 장소 로컬 검색
        if (e.key === "Enter" && input.value.trim()) navigate("/search?q=" + encodeURIComponent(input.value.trim()));
      };
    }
    $("#home__toggle-map").onclick  = (e) => setHomeView("map", e.currentTarget);
    $("#home__toggle-list").onclick = (e) => setHomeView("list", e.currentTarget);
  }

  function setHomeView(view, btn) {
    $$("#home__view-toggle button").forEach((b) => {
      b.style.background = ""; b.style.color = "";
    });
    btn.style.background = "var(--color-primary)"; btn.style.color = "#fff";
    $("#home__map").style.display = view === "map" ? "" : "none";
    $("#home__place-list").style.display = view === "list" ? "flex" : "";
  }

  function renderCategoryFilter() {
    const nav = $("#home__category-filter");
    nav.innerHTML = "";
    const mk = (label, val) => {
      const b = document.createElement("button");
      b.className = "chip" + (homeFilter === val ? " is-active" : "");
      b.textContent = label;
      b.onclick = () => { homeFilter = homeFilter === val ? null : val; renderHome(); };
      return b;
    };
    nav.appendChild(mk("전체", null));
    CATEGORIES.forEach((c) => nav.appendChild(mk(catEmoji(c) + " " + c, c)));
  }

  function visiblePlaces() {
    return state.places.filter((p) => !homeFilter || p.category === homeFilter);
  }

  // F01: 미방문=핀(퍼플), 방문(내 기록 존재)=발자국(오렌지)
  function isVisited(placeId) {
    return state.records.some((r) => r.userId === ME && r.placeId === placeId);
  }

  function renderMap() {
    if (USE_KAKAO_MAPS()) { renderKakaoMap(); return; }
    renderPlaceholderMap();
  }

  /* --- Kakao Maps 렌더 (F01) — 키 설정 시 --- */
  let _kmap = null, _kmapMarkers = [];
  function renderKakaoMap() {
    const el = $("#home__map");
    el.classList.remove("is-empty");
    loadKakaoMaps().then((kakao) => {
      el.textContent = "";
      const center = new kakao.maps.LatLng(state.myLocation.lat, state.myLocation.lng);
      if (!_kmap) {
        _kmap = new kakao.maps.Map(el, { center, level: 4 });
        _kmap.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
      } else {
        _kmap.setCenter(center);
        _kmap.relayout(); // 숨김→표시 전환 시 타일 재계산
      }
      _kmapMarkers.forEach((m) => m.setMap(null));
      _kmapMarkers = [];

      // 내 위치 (블랙 도트)
      const meDot = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><circle cx='10' cy='10' r='6' fill='#111111' stroke='#fff' stroke-width='3'/></svg>`);
      _kmapMarkers.push(new kakao.maps.Marker({
        map: _kmap, position: center, title: "내 위치",
        image: new kakao.maps.MarkerImage(meDot, new kakao.maps.Size(20, 20), { offset: new kakao.maps.Point(10, 10) }),
      }));

      // 장소 마커 — 미방문=블랙 핀 / 방문=그레이 핀 (모노크롬)
      visiblePlaces().forEach((p) => {
        const visited = isVisited(p.id);
        const color = visited ? "#666666" : "#111111";
        const pin = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 40'><path d='M15 0C7 0 1 6 1 14c0 9 14 26 14 26s14-17 14-26C29 6 23 0 15 0z' fill='${color}'/><circle cx='15' cy='14' r='5.5' fill='#fff'/></svg>`);
        const marker = new kakao.maps.Marker({
          map: _kmap,
          position: new kakao.maps.LatLng(p.geo.lat, p.geo.lng),
          title: p.name,
          image: new kakao.maps.MarkerImage(pin, new kakao.maps.Size(30, 40), { offset: new kakao.maps.Point(15, 40) }),
        });
        kakao.maps.event.addListener(marker, "click", () => navigate("/place/" + p.id));
        _kmapMarkers.push(marker);
      });
    }).catch(() => {
      // 키 오류·네트워크 실패 시 플레이스홀더로 폴백
      _kmap = null;
      renderPlaceholderMap();
    });
  }

  /* --- Kakao 장소(키워드) 검색 (F: 지도 검색) --- */
  let _placesAttached = false;
  function setupKakaoPlacesSearch() {
    if (_placesAttached) return;
    loadKakaoMaps().then((kakao) => {
      if (!kakao.maps.services) return;
      _placesAttached = true;
      const input = $("#home__search-input");
      const ps = new kakao.maps.services.Places();
      input.onkeydown = (e) => {
        if (e.key !== "Enter" || !input.value.trim()) return;
        ps.keywordSearch(input.value.trim(), (data, status) => {
          if (status !== kakao.maps.services.Status.OK || !data.length) { toast("장소를 찾지 못했어요"); return; }
          const pl = data[0];
          const loc = new kakao.maps.LatLng(+pl.y, +pl.x);
          if (_kmap) {
            _kmap.setCenter(loc); _kmap.setLevel(3);
            const m = new kakao.maps.Marker({ map: _kmap, position: loc, title: pl.place_name || "" });
            _kmapMarkers.push(m);
          }
          toast((pl.place_name || "검색 위치") + " 주변을 표시했어요");
        });
      };
    }).catch(() => {});
  }

  /* --- 좌표 기반 플레이스홀더 지도 (키 없음/오프라인) --- */
  function renderPlaceholderMap() {
    const map = $("#home__map");
    map.querySelectorAll(".map-marker").forEach((n) => n.remove());
    const places = visiblePlaces();
    if (!places.length) { map.classList.add("is-empty"); return; }
    map.classList.remove("is-empty");

    const lats = state.places.map((p) => p.geo.lat), lngs = state.places.map((p) => p.geo.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const nx = (v, mn, mx) => (mx === mn ? 0.5 : (v - mn) / (mx - mn));
    const pos = (geo) => ({ x: 8 + nx(geo.lng, minLng, maxLng) * 84, y: 12 + (1 - nx(geo.lat, minLat, maxLat)) * 76 });

    // 내 위치
    const mePos = pos(state.myLocation);
    const meDot = document.createElement("div");
    meDot.className = "map-marker map-marker--me";
    meDot.style.left = mePos.x + "%"; meDot.style.top = mePos.y + "%";
    meDot.title = "내 위치";
    map.appendChild(meDot);

    places.forEach((p) => {
      const { x, y } = pos(p.geo);
      const b = document.createElement("button");
      const visited = isVisited(p.id);
      b.className = "map-marker " + (visited ? "map-marker--paw" : "map-marker--pin");
      b.textContent = visited ? "🐾" : "📍";
      b.style.left = x + "%"; b.style.top = y + "%";
      b.title = p.name;
      b.onclick = () => navigate("/place/" + p.id);
      map.appendChild(b);
    });
  }

  function placeCard(p, reason) {
    const b = document.createElement("button");
    b.className = "place-card";
    b.onclick = () => navigate("/place/" + p.id);
    const visited = isVisited(p.id);
    const open = isOpenNow(p.hours);
    b.innerHTML = `
      <div class="place-card__thumb"${p.photo ? ` style="background-image:url('${encodeURI(p.photo)}')"` : ""}>${p.photo ? "" : (visited ? "🐾" : catEmoji(p.category))}
        <span class="place-card__cat">${catTag(p.category)}</span></div>
      <div class="place-card__body">
        <div class="place-card__name">${esc(p.name)}${visited ? ` <span class="place-card__visited" title="다녀온 곳">🐾</span>` : ""}</div>
        <div class="place-card__metaline faint">도보 ${walkMinutes(state.myLocation, p.geo)}분 · <span style="color:${open ? "var(--color-ink)" : "var(--color-faint)"};font-weight:${open ? "600" : "400"}">${open ? "영업 중" : "영업 마감"}</span></div>
        ${reason ? `<div class="place-card__reason">${esc(reason)}</div>` : ""}
        <div class="place-card__meta">${esc(p.address)}</div>
      </div>`;
    return b;
  }

  function renderPlaceList() {
    const ul = $("#home__place-list");
    ul.innerHTML = "";
    ul.style.marginTop = "var(--sp-md)";
    visiblePlaces().forEach((p) => ul.appendChild(placeCard(p)));
  }

  /* ========================================================================
     7. 장소 상세 (F02) — 정보 + 지인 기록 + 추천 이유 + 유사 장소
  ======================================================================== */
  function renderPlaceDetail(id) {
    const p = placeById(id);
    if (!p) { navigate("/"); return; }

    // 반복 방지 신호 기록
    state.recentlyViewed = [id, ...state.recentlyViewed.filter((x) => x !== id)].slice(0, 10);
    save();

    const open = isOpenNow(p.hours);
    $("#screen-place-detail__title").textContent = p.name;
    $("#place-detail__meta").innerHTML = `${catTag(p.category)} <span class="muted">도보 ${walkMinutes(state.myLocation, p.geo)}분 · ${p.hours ? p.hours.open + "–" + p.hours.close + "시" : "시간 미정"} · <span style="color:${open ? "var(--color-ink)" : "var(--color-faint)"};font-weight:${open ? "600" : "400"}">${open ? "영업 중" : "영업 마감"}</span></span><br><span class="muted">${esc(p.address)}</span>`;
    $("#place-detail__hero").innerHTML = p.photo
      ? `<img src="${encodeURI(p.photo)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r-lg)">`
      : `<span style="font-size:52px">${isVisited(p.id) ? "🐾" : catEmoji(p.category)}</span>`;

    // 추천 이유 (근거 우선, §09)
    $("#place-detail__reason").textContent = buildReason(p).text || "";

    // 지인 기록 (내 클라우더 멤버 기록)
    const memberIds = new Set(myClowders().flatMap((c) => c.memberIds));
    const friendRecs = state.records.filter((r) => r.placeId === id && memberIds.has(r.userId) && r.userId !== ME);
    const fr = $("#place-detail__friend-records");
    fr.innerHTML = `<h3 style="font-size:var(--fs-feature);font-weight:600;color:var(--color-ink);margin-bottom:var(--sp-md)">🐾 지인 발자국 ${friendRecs.length}</h3>`
      + (friendRecs.length ? friendRecs.map(recordLine).join("") : `<p class="faint">지인이 다녀가면 여기에 발자국이 남아요.</p>`);

    // 유사 장소 (같은 카테고리)
    const similar = state.places.filter((x) => x.category === p.category && x.id !== id).slice(0, 3);
    const sm = $("#place-detail__similar");
    sm.innerHTML = `<h3 style="font-size:var(--fs-feature);font-weight:600;color:var(--color-ink);margin-bottom:var(--sp-md)">${catEmoji(p.category)} 비슷한 장소</h3>`;
    if (similar.length) similar.forEach((s) => sm.appendChild(placeCard(s)));
    else sm.innerHTML += `<p class="faint">비슷한 장소를 찾지 못했어요.</p>`;

    $("#place-detail__write-btn").onclick = () => navigate("/place/" + id + "/write");
    $("#place-detail__share-btn").onclick = () => {
      const mine = state.records.find((r) => r.userId === ME && r.placeId === id);
      if (mine) shareRecord(mine.id);
      else toast("발자국을 남기면 공유할 수 있어요");
    };
  }

  function recordLine(r) {
    const u = userById(r.userId);
    return `<div class="meta-row" style="padding:8px 0;border-top:1px solid var(--color-hairline)">
      <span class="cat-avatar cat-avatar--sm">${CAT_EMOJI(u.catType)}</span>
      <div><strong style="color:var(--color-ink)">${esc(u.nickname)}</strong>
      <span class="muted"> · ${r.rating ? "★" + r.rating : "평가 없음"}</span>
      <div class="muted" style="font-size:var(--fs-caption)">${esc(r.oneLine)}</div></div></div>`;
  }

  /* ========================================================================
     8. 발자국 기록 (F03) — 사진/한줄평/별점/공개범위/날짜
        + 저장 완료 플로우 (PRD §07)
  ======================================================================== */
  let writeDraft = null;

  function renderWrite(placeId) {
    const p = placeById(placeId);
    if (!p) { navigate("/"); return; }
    writeDraft = { placeId, photo: null, rating: 0, visibility: "private", clowderIds: [] };

    $("#screen-write__title").textContent = "🐾 " + p.name + "에 발자국 남기기";

    // 사진 (0~1장, jpg/png/webp, 10MB) — 업로드 실패 시 텍스트만 저장 (§07 예외)
    const photoField = $("#write__photo-field");
    photoField.querySelectorAll(".photo-preview,.field-hint").forEach((n) => n.remove());
    const photoInput = $("#write__photo-input");
    photoInput.value = "";
    photoInput.onchange = () => {
      const f = photoInput.files[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { toast("사진은 10MB까지 올릴 수 있어요"); photoInput.value = ""; return; }
      const reader = new FileReader();
      reader.onload = () => {
        writeDraft.photo = reader.result;
        let img = photoField.querySelector(".photo-preview");
        if (!img) { img = document.createElement("img"); img.className = "photo-preview"; photoField.appendChild(img); }
        img.src = reader.result;
      };
      reader.onerror = () => toast("사진을 불러오지 못했어요. 글만으로도 저장할 수 있어요");
      reader.readAsDataURL(f);
    };

    // 한줄평 (필수 1~80자)
    const oneline = $("#write__oneline-input");
    oneline.value = "";
    const submit = $("#write__submit-btn");
    let hint = $("#write__oneline-field .field-hint");
    if (!hint) { hint = document.createElement("div"); hint.className = "field-hint"; $("#write__oneline-field").appendChild(hint); }
    const validate = () => {
      const len = oneline.value.trim().length;
      hint.textContent = `${len}/80`;
      const ok = len >= 1 && len <= 80;
      submit.disabled = !ok;
      hint.classList.toggle("is-error", !ok && oneline.value.length > 0);
    };
    oneline.oninput = validate;
    validate();

    // 별점 (선택, 0.5 단위 1~5)
    buildStarRating($("#write__rating-field"), (v) => { writeDraft.rating = v; });

    // 방문 날짜 (기본 오늘, 미래 불가)
    const date = $("#write__date-input");
    date.value = todayISO(); date.max = todayISO();

    // 공개 범위
    buildVisibility();

    // 제출
    $("#write__form").onsubmit = (e) => { e.preventDefault(); saveRecord(); };
  }

  function buildStarRating(fieldset, onChange) {
    fieldset.querySelector(".star-rating")?.remove();
    const wrap = document.createElement("div");
    wrap.className = "star-rating";
    let value = 0;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("button");
      star.type = "button"; star.className = "star";
      const fill = document.createElement("span"); fill.className = "star__fill";
      star.appendChild(fill);
      star.onclick = (e) => {
        const half = e.offsetX < star.offsetWidth / 2 ? 0.5 : 1;
        value = i - 1 + half;
        paint(); onChange(value);
      };
      stars.push({ star, fill }); wrap.appendChild(star);
    }
    const val = document.createElement("span"); val.className = "star-value"; val.textContent = "평가 없음";
    const clear = document.createElement("button");
    clear.type = "button"; clear.className = "star-clear"; clear.textContent = "지우기";
    clear.onclick = () => { value = 0; paint(); onChange(0); };
    wrap.appendChild(val); wrap.appendChild(clear);
    function paint() {
      stars.forEach(({ fill }, idx) => {
        const f = Math.max(0, Math.min(1, value - idx));
        fill.style.width = f * 100 + "%";
      });
      val.textContent = value ? "★ " + value : "평가 없음";
    }
    fieldset.appendChild(wrap); paint();
  }

  function buildVisibility() {
    const vf = $("#write__visibility-field");
    vf.querySelector(".opt-list")?.remove();
    const list = document.createElement("div"); list.className = "opt-list";
    const hasClowder = myClowders().length > 0;
    VISIBILITY.forEach((v) => {
      if (v.value === "clowder" && !hasClowder) return; // 클라우더 없으면 옵션 숨김 (§07)
      const id = "vis_" + v.value;
      const lab = document.createElement("label"); lab.className = "opt-item";
      lab.innerHTML = `<input type="radio" name="visibility" value="${v.value}" id="${id}" ${v.value === writeDraft.visibility ? "checked" : ""}> ${v.label}`;
      lab.querySelector("input").onchange = () => { writeDraft.visibility = v.value; toggleClowderSelect(); };
      list.appendChild(lab);
    });
    vf.appendChild(list);
    toggleClowderSelect();
  }

  function toggleClowderSelect() {
    const field = $("#write__clowder-select-field");
    const show = writeDraft.visibility === "clowder" && myClowders().length > 0;
    field.style.display = show ? "" : "none";
    if (!show) { writeDraft.clowderIds = []; return; }
    field.querySelector(".opt-list")?.remove();
    const list = document.createElement("div"); list.className = "opt-list";
    myClowders().forEach((c) => {
      const lab = document.createElement("label"); lab.className = "opt-item";
      lab.innerHTML = `<input type="checkbox" value="${c.id}"> ${esc(c.name)}`;
      lab.querySelector("input").onchange = (e) => {
        if (e.target.checked) writeDraft.clowderIds.push(c.id);
        else writeDraft.clowderIds = writeDraft.clowderIds.filter((x) => x !== c.id);
      };
      list.appendChild(lab);
    });
    field.appendChild(list);
  }

  function saveRecord() {
    const oneLine = $("#write__oneline-input").value.trim();
    if (oneLine.length < 1 || oneLine.length > 80) { toast("한줄평을 1자에서 80자로 남겨주세요"); return; }
    const rec = {
      id: uid("r"), userId: ME, placeId: writeDraft.placeId,
      photo: writeDraft.photo, oneLine, rating: writeDraft.rating || null,
      visitDate: $("#write__date-input").value || todayISO(),
      visibility: writeDraft.visibility,
      clowderIds: writeDraft.visibility === "clowder" ? [...writeDraft.clowderIds] : [],
      createdAt: new Date().toISOString(),
    };
    state.records.unshift(rec);

    // 선택 클라우더에 자동 공유 → 멤버에게 새 기록 알림 (§07 3단계)
    if (rec.clowderIds.length) {
      myClowders().filter((c) => rec.clowderIds.includes(c.id)).forEach((c) => {
        // 데모: 알림은 내 화면 기준이므로 별도 생성 생략(멤버 서버 몫). 토스트만.
      });
    }
    save();
    openCompletionModal(rec);   // §07 4단계: 외부 공유 여부 모달
  }

  function openCompletionModal(rec) {
    const modal = $("#completion-modal");
    modal.hidden = false;
    $("#completion-modal__share-btn").onclick = () => { modal.hidden = true; shareRecord(rec.id); navigate("/place/" + rec.placeId); };
    $("#completion-modal__skip-btn").onclick  = () => { modal.hidden = true; navigate("/place/" + rec.placeId); };
  }

  /* ========================================================================
     9. 개인화 추천 (F04) — 점수 기반 + 추천 이유 (PRD §09)
  ======================================================================== */
  function scorePlace(p) {
    const u = me();
    let score = 0;
    const reasons = [];

    // 1) 고양이 초기 가중치
    const cw = u.catType ? (CATS[u.catType].weights[p.category] || 0) : 0;
    score += cw * 2;

    // 2) 방문 기록 (카테고리 습관) — 강한 신호
    const catVisits = state.records.filter((r) => r.userId === ME && placeById(r.placeId)?.category === p.category).length;
    score += catVisits * 3;

    // 3) 저장/리액션 — 중간 신호
    if (state.savedPlaces.includes(p.id)) score += 2;

    // 4) 거리·시간 — 상황 신호
    const mins = walkMinutes(state.myLocation, p.geo);
    if (mins <= 10) score += 2; else if (mins <= 20) score += 1;
    if (isOpenNow(p.hours)) score += 1;

    // 5) 반복 방지 — 이미 방문/최근 조회 감점
    if (isVisited(p.id)) score -= 4;
    if (state.recentlyViewed.includes(p.id)) score -= 1;

    // 6) 클라우더 신호 — 멤버가 기록한 장소 소폭 가중
    const memberIds = new Set(myClowders().flatMap((c) => c.memberIds));
    const friendCount = new Set(state.records.filter((r) => r.placeId === p.id && memberIds.has(r.userId) && r.userId !== ME).map((r) => r.userId)).size;
    if (friendCount) score += friendCount;

    return { place: p, score, catWeight: cw, catVisits, mins, friendCount };
  }

  // 추천 이유 카피 (근거 우선, §09 GOOD 예시)
  function buildReason(p) {
    const s = scorePlace(p);
    if (s.friendCount > 0) {
      const c = myClowders().find((c) => state.records.some((r) => r.placeId === p.id && c.memberIds.includes(r.userId) && r.userId !== ME));
      return { text: `${c ? c.name + " " : ""}친구 ${s.friendCount}명이 다녀왔어요.`, s };
    }
    if (s.catVisits >= 2) return { text: `${p.category} 발자국이 많아 추천해요.`, s };
    if (p.vibe?.includes("무료") || p.vibe?.includes("기간한정")) return { text: `${p.category}를 자주 기록했고, 지금 기간 한정이에요.`, s };
    if (s.mins <= 10 && isOpenNow(p.hours)) return { text: `지금 위치에서 도보 ${s.mins}분이고 아직 영업 중이에요.`, s };
    if (s.catWeight > 0) return { text: `${CATS[me().catType].name}가 좋아할 만한 ${p.category}예요.`, s };
    return { text: `가까운 곳에서 새로 발견한 ${p.category}예요.`, s };
  }

  function renderRecommend() {
    const ranked = state.places.map(scorePlace)
      .filter((s) => s.score > -3)
      .sort((a, b) => b.score - a.score);
    const list = $("#recommend__list");
    list.innerHTML = "";
    const myRecordCount = state.records.filter((r) => r.userId === ME).length;

    // cold start 안내 (§12 상태: cold start / personalized)
    const banner = document.createElement("p");
    banner.className = "muted";
    banner.style.marginBottom = "var(--sp-md)";
    banner.textContent = myRecordCount < 3
      ? `지금은 고양이 취향과 위치로 골랐어요. 발자국이 쌓일수록 더 똑똑해져요.`
      : `내가 남긴 발자국 ${myRecordCount}개를 반영한 맞춤 추천이에요.`;
    list.appendChild(banner);

    ranked.slice(0, Math.max(3, 6)).forEach((s) => list.appendChild(placeCard(s.place, buildReason(s.place).text)));
  }

  /* ========================================================================
     10. 클라우더 피드 (F05) — 탭 + 기록 카드 + 리액션 + 메시지
  ======================================================================== */
  let feedTab = "all";

  function feedRecords() {
    if (feedTab === "all") {
      // 전체 = 내 클라우더에 공유된 기록 + 전체 공개 + 내 기록
      const myC = new Set(myClowders().map((c) => c.id));
      return state.records.filter((r) =>
        r.visibility === "public" || r.userId === ME ||
        (r.clowderIds || []).some((cid) => myC.has(cid)));
    }
    return state.records.filter((r) => (r.clowderIds || []).includes(feedTab));
  }

  function renderFeed() {
    // 탭
    const tabs = $("#feed__clowder-tabs");
    tabs.innerHTML = "";
    const mk = (label, val) => {
      const b = document.createElement("button");
      b.className = "chip" + (feedTab === val ? " is-active" : "");
      b.textContent = label;
      b.onclick = () => { feedTab = val; renderFeed(); };
      return b;
    };
    tabs.appendChild(mk("전체", "all"));
    myClowders().forEach((c) => tabs.appendChild(mk(c.name, c.id)));

    // 카드
    const ul = $("#feed__record-list");
    ul.innerHTML = "";
    const recs = feedRecords().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!recs.length) {
      ul.innerHTML = emptyState("🐾", "첫 발자국을 남겨볼까요?", "마음에 든 곳에 발자국을 남기면 친구들과 여기서 나눠요.");
      return;
    }
    recs.forEach((r) => ul.appendChild(feedCard(r)));
  }

  function feedCard(r) {
    const p = placeById(r.placeId), u = userById(r.userId);
    const li = document.createElement("li");
    li.className = "feed__record-card";
    const art = document.createElement("article");
    art.className = "record-card";

    // header
    const header = document.createElement("div");
    header.className = "record-card__header meta-row";
    header.innerHTML = `<span class="cat-avatar">${CAT_EMOJI(u.catType)}</span>
      <div><strong style="color:var(--color-ink)">${esc(u.nickname)}</strong>
      <div class="muted" style="font-size:var(--fs-caption)">${esc(p?.name || "장소")} · ${timeAgo(r.createdAt)}</div></div>`;
    art.appendChild(header);

    // photo
    if (r.photo) {
      const fig = document.createElement("figure"); fig.className = "record-card__photo"; fig.style.background = "none";
      fig.innerHTML = `<img src="${r.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r-md)">`;
      art.appendChild(fig);
    }

    // oneline + rating
    const line = document.createElement("p"); line.className = "record-card__oneline";
    line.innerHTML = `${esc(r.oneLine)} ${r.rating ? `<span class="muted">★${r.rating}</span>` : ""}`;
    line.style.cursor = "pointer";
    line.onclick = () => navigate("/place/" + r.placeId);
    art.appendChild(line);

    // reactions (F05: 1인 1개, 재탭 취소, 변경 시 교체 §08)
    const rx = document.createElement("div");
    rx.className = "record-card__reactions"; rx.setAttribute("role", "group");
    const myReaction = state.reactions.find((x) => x.recordId === r.id && x.userId === ME);
    REACTIONS.forEach((def) => {
      const count = state.reactions.filter((x) => x.recordId === r.id && x.type === def.type).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = myReaction?.type === def.type ? "is-selected" : "";
      b.innerHTML = `${def.label} ${count ? `<span class="reaction-count">${count}</span>` : ""}`;
      b.onclick = () => toggleReaction(r.id, def.type);
      rx.appendChild(b);
    });
    art.appendChild(rx);

    // messages (100자, 최신 2개 미리보기 §08)
    art.appendChild(messageBlock(r.id));

    li.appendChild(art);
    return li;
  }

  function toggleReaction(recordId, type) {
    const existing = state.reactions.find((x) => x.recordId === recordId && x.userId === ME);
    if (existing && existing.type === type) {
      state.reactions = state.reactions.filter((x) => x !== existing);   // 재탭 취소
    } else if (existing) {
      existing.type = type; existing.createdAt = new Date().toISOString(); // 교체
    } else {
      state.reactions.push({ id: uid("rx"), recordId, userId: ME, type, createdAt: new Date().toISOString() });
    }
    // '나도 갈래냥' → 가보고 싶은 곳 저장 토글 (§08)
    const rec = recordById(recordId);
    if (type === "wanna-go" && rec) {
      const now = state.reactions.find((x) => x.recordId === recordId && x.userId === ME && x.type === "wanna-go");
      if (now && !state.savedPlaces.includes(rec.placeId)) { state.savedPlaces.push(rec.placeId); toast("가보고 싶은 곳에 저장했어요"); }
      else if (!now) state.savedPlaces = state.savedPlaces.filter((x) => x !== rec.placeId);
    }
    save();
    renderFeed();
  }

  function messageBlock(recordId) {
    const wrap = document.createElement("div");
    wrap.className = "record-card__messages";
    const msgs = state.messages.filter((m) => m.recordId === recordId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    let expanded = false;
    const render = () => {
      const shown = expanded ? msgs : msgs.slice(-2);
      wrap.innerHTML = shown.map((m) =>
        `<div class="msg-line"><strong>${esc(userById(m.userId).nickname)}</strong> ${esc(m.text)}</div>`).join("");
      if (!expanded && msgs.length > 2) {
        const more = document.createElement("button");
        more.className = "msg-toggle"; more.textContent = `메시지 ${msgs.length - 2}개 더 보기`;
        more.onclick = () => { expanded = true; render(); };
        wrap.appendChild(more);
      }
      const row = document.createElement("div"); row.className = "msg-input-row";
      const input = document.createElement("input");
      input.className = "msg-input"; input.maxLength = 100; input.placeholder = "짧은 메시지를 남겨보세요";
      const send = document.createElement("button"); send.className = "msg-send"; send.textContent = "보내기";
      const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        state.messages.push({ id: uid("m"), recordId, userId: ME, text, createdAt: new Date().toISOString() });
        save(); expanded = true; render();
      };
      send.onclick = doSend;
      input.onkeydown = (e) => { if (e.key === "Enter") doSend(); };
      row.appendChild(input); row.appendChild(send);
      wrap.appendChild(row);
    };
    render();
    return wrap;
  }

  /* ========================================================================
     11. 탐험 일지 (F06) — 내 기록 + 기간/카테고리/지역 필터
  ======================================================================== */
  let journalFilter = { period: "all", category: "all" };

  function renderMyRecords() {
    const filterBar = $("#my-records__filter");
    filterBar.innerHTML = "";
    const mk = (label, key, val) => {
      const b = document.createElement("button");
      b.className = "chip" + (journalFilter[key] === val ? " is-active" : "");
      b.textContent = label;
      b.onclick = () => { journalFilter[key] = val; renderMyRecords(); };
      return b;
    };
    filterBar.appendChild(mk("전체 기간", "period", "all"));
    filterBar.appendChild(mk("이번 달", "period", "month"));
    filterBar.appendChild(mk("전체 카테고리", "category", "all"));
    [...new Set(state.records.filter((r) => r.userId === ME).map((r) => placeById(r.placeId)?.category).filter(Boolean))]
      .forEach((c) => filterBar.appendChild(mk(c, "category", c)));

    const now = new Date();
    let recs = state.records.filter((r) => r.userId === ME);
    if (journalFilter.period === "month")
      recs = recs.filter((r) => { const d = new Date(r.visitDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    if (journalFilter.category !== "all")
      recs = recs.filter((r) => placeById(r.placeId)?.category === journalFilter.category);
    recs.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

    const list = $("#my-records__list");
    list.innerHTML = "";
    if (!recs.length) {
      list.innerHTML = emptyState("📖", "탐험 일지를 채워볼까요?", "다녀온 곳을 기록하면 여기에 차곡차곡 쌓여요.");
      return;
    }
    recs.forEach((r) => {
      const p = placeById(r.placeId);
      const li = document.createElement("li");
      const card = placeCard(p, r.oneLine);
      // 방문일/별점 메타 덧붙이기
      card.querySelector(".place-card__meta").textContent = `${r.visitDate} · ${r.rating ? "★" + r.rating : "평가 없음"} · ${esc(p?.address || "")}`;
      li.appendChild(card);
      list.appendChild(li);
    });
  }

  /* ========================================================================
     12. 검색 결과 (F: 검색) — 키워드/지역
  ======================================================================== */
  function renderSearch(_id, params) {
    const q = (params.get("q") || "").trim();
    $("#screen-search__title").textContent = q ? `🔍 "${q}" 검색 결과` : "🔍 검색 결과";
    const list = $("#search__result-list");
    list.innerHTML = "";
    const hits = state.places.filter((p) =>
      [p.name, p.category, p.address, ...(p.vibe || [])].join(" ").toLowerCase().includes(q.toLowerCase()));
    if (!hits.length) {
      list.innerHTML = emptyState("🔍", q ? "다른 이름으로 찾아볼까요?" : "무엇을 찾아볼까요?", "장소 이름, 카테고리, 지역으로 찾을 수 있어요.");
    } else {
      hits.forEach((p) => { const li = document.createElement("li"); li.appendChild(placeCard(p)); list.appendChild(li); });
    }
    $("#search__back-to-map").onclick = () => navigate("/");
  }

  /* ========================================================================
     13. 클라우더 관리 (F07) — 생성 / 초대 / 목록
  ======================================================================== */
  function renderClowders() {
    const list = $("#clowders__list");
    list.innerHTML = "";
    const cs = myClowders();
    if (!cs.length) list.innerHTML = emptyState("😺", "함께 다닐 그룹을 만들어볼까요?", "클라우더를 만들면 친구와 발자국을 나눌 수 있어요.");
    cs.forEach((c) => {
      const li = document.createElement("li");
      const b = document.createElement("button"); b.className = "place-card";
      b.onclick = () => navigate("/clowders/" + c.id);
      b.innerHTML = `<div class="place-card__thumb">😺</div>
        <div class="place-card__body"><div class="place-card__name">${esc(c.name)}</div>
        <div class="place-card__meta">멤버 ${c.memberIds.length}명 · ${esc(c.description || "")}</div></div>`;
      li.appendChild(b); list.appendChild(li);
    });
    $("#clowders__create-btn").onclick = openCreateClowder;
  }

  function openCreateClowder() {
    openModal("클라우더 만들기", [
      { key: "name", label: "이름", type: "text", placeholder: "예: 을지로 산책단" },
      { key: "description", label: "소개", type: "textarea", placeholder: "어떤 취향을 나누는 그룹인가요?" },
    ], (vals) => {
      if (!vals.name.trim()) { toast("이름을 입력해주세요"); return false; }
      const c = { id: uid("c"), name: vals.name.trim(), ownerId: ME, memberIds: [ME], description: vals.description.trim() };
      state.clowders.push(c); save();
      toast("클라우더를 만들었어요");
      navigate("/clowders/" + c.id);
      return true;
    });
  }

  /* ========================================================================
     14. 클라우더 상세 (F07) — 멤버 + 피드 + 초대
  ======================================================================== */
  function renderClowderDetail(id) {
    const c = state.clowders.find((x) => x.id === id);
    if (!c) { navigate("/clowders"); return; }
    $("#screen-clowder-detail__title").textContent = "😻 " + c.name;

    const members = $("#clowder-detail__members");
    members.innerHTML = `<h3 style="font-size:var(--fs-feature);font-weight:600;color:var(--color-ink);margin-bottom:var(--sp-md)">멤버 ${c.memberIds.length}</h3>`
      + `<div class="meta-row" style="flex-wrap:wrap;gap:var(--sp-md)">` + c.memberIds.map((mid) => {
        const u = userById(mid);
        return `<span class="meta-row"><span class="cat-avatar cat-avatar--sm">${CAT_EMOJI(u.catType)}</span>${esc(u.nickname)}${mid === c.ownerId ? ' <span class="tag">관리자</span>' : ""}</span>`;
      }).join("") + `</div>`;

    const feed = $("#clowder-detail__feed");
    feed.innerHTML = `<h3 style="font-size:var(--fs-feature);font-weight:600;color:var(--color-ink);margin-bottom:var(--sp-md)">클라우더 피드</h3>`;
    const recs = state.records.filter((r) => (r.clowderIds || []).includes(c.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (recs.length) recs.forEach((r) => feed.appendChild(feedCard(r)));
    else feed.innerHTML += `<p class="faint">여기에 공유하면 멤버들과 발자국을 나눠요.</p>`;

    // 초대 (링크 생성) — F07
    $("#clowder-detail__invite-btn").onclick = () => {
      const link = location.origin + location.pathname + "#/clowders/" + c.id + "?invite=" + uid("inv");
      copy(link); toast("초대 링크를 복사했어요");
    };
    // 설정 (관리자만 삭제) — §08
    $("#clowder-detail__settings-btn").onclick = () => {
      if (c.ownerId !== ME) { toast("클라우더를 만든 사람만 설정할 수 있어요"); return; }
      openModal("클라우더 설정", [], null, [
        { label: "클라우더 삭제", danger: true, onClick: () => {
          if (confirm(`'${c.name}'를 삭제할까요? 되돌릴 수 없어요.`)) {
            state.clowders = state.clowders.filter((x) => x.id !== c.id);
            state.records.forEach((r) => { r.clowderIds = (r.clowderIds || []).filter((x) => x !== c.id); });
            save(); toast("삭제했어요"); navigate("/clowders");
          }
        } },
      ]);
    };
  }

  /* ========================================================================
     15. 알림 (F08) — 목록 / 읽음 / 배지
  ======================================================================== */
  const NOTI_TEXT = {
    reactions:  (n) => `${userById(n.fromUserId).nickname}님이 내 발자국에 반응했어요`,
    messages:   (n) => `${userById(n.fromUserId).nickname}님이 메시지를 남겼어요`,
    newRecords: (n) => `${userById(n.fromUserId).nickname}님이 새 발자국을 남겼어요`,
  };

  function unreadCount() { return state.notifications.filter((n) => !n.read).length; }
  function updateBadge() {
    const badge = $("#global-header__notification-badge");
    badge.hidden = unreadCount() === 0;
  }

  function renderNotifications() {
    const settings = me().notificationSettings || { reactions: true, messages: true, newRecords: true };
    const list = $("#notifications__list");
    list.innerHTML = "";
    const items = state.notifications
      .filter((n) => settings[n.type] !== false)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!items.length) { list.innerHTML = emptyState("🔔", "새 소식을 기다리고 있어요", "친구들의 반응과 메시지가 오면 여기로 알려줄게요."); return; }
    items.forEach((n) => {
      const li = document.createElement("li");
      li.className = "noti-item" + (n.read ? "" : " is-unread");
      li.innerHTML = `<span class="noti-item__dot"></span>
        <div class="noti-item__body">${esc((NOTI_TEXT[n.type] || (() => "알림"))(n))}
          <div class="noti-item__time">${timeAgo(n.createdAt)}</div></div>`;
      li.onclick = () => {
        n.read = true; save(); updateBadge();
        const rec = recordById(n.recordId);
        if (rec) navigate("/place/" + rec.placeId); else renderNotifications();
      };
      list.appendChild(li);
    });
  }

  /* ========================================================================
     16. 프로필 (F: 프로필/설정) + 고양이 변경 + 알림 설정 + 데이터(F10)
  ======================================================================== */
  function renderProfile() {
    const u = me();
    // 헤더 아바타 (::before 대신 실제 이모지)
    $("#screen-profile__title").textContent = u.nickname;
    const header = $("#profile__header");
    let av = header.querySelector(".cat-avatar");
    if (!av) { av = document.createElement("span"); av.className = "cat-avatar cat-avatar--lg"; header.insertBefore(av, header.firstChild); }
    av.textContent = CAT_EMOJI(u.catType);

    // 통계 (표시용, §06 레벨/칭호는 단순 통계)
    const myRecs = state.records.filter((r) => r.userId === ME);
    const cats = new Set(myRecs.map((r) => placeById(r.placeId)?.category).filter(Boolean));
    $("#profile__stats").innerHTML = `
      <div class="stat-grid">
        <div class="stat-cell"><div class="stat-cell__num">${myRecs.length}</div><div class="stat-cell__label">발자국</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${cats.size}</div><div class="stat-cell__label">방문 카테고리</div></div>
        <div class="stat-cell"><div class="stat-cell__num">${myClowders().length}</div><div class="stat-cell__label">클라우더</div></div>
      </div>
      <p class="muted" style="text-align:center;margin-top:var(--sp-sm)">
        ${CATS[u.catType].emoji} ${CATS[u.catType].name}</p>`;

    $("#profile__settings-cat").onclick = () => navigate("/onboarding");
    $("#profile__settings-clowder").onclick = () => navigate("/clowders");
    $("#profile__settings-data").onclick = openDataModal;
    $("#profile__settings-notification").onclick = openNotiSettings;
  }

  function openNotiSettings() {
    const s = me().notificationSettings;
    openModal("알림 설정", [], null, [
      { label: (s.reactions ? "☑" : "☐") + " 리액션 알림",   ghost: true, onClick: () => { s.reactions = !s.reactions; save(); toast("바꿨어요"); }, keepOpen: true },
      { label: (s.messages ? "☑" : "☐") + " 메시지 알림",     ghost: true, onClick: () => { s.messages = !s.messages; save(); toast("바꿨어요"); }, keepOpen: true },
      { label: (s.newRecords ? "☑" : "☐") + " 새 기록 알림",  ghost: true, onClick: () => { s.newRecords = !s.newRecords; save(); toast("바꿨어요"); }, keepOpen: true },
    ]);
  }

  /* ---- 데이터 관리 (F10) — 엑셀 내보내기/불러오기 + JSON 폴백 ---- */
  function openDataModal() {
    openModal("데이터 관리", [], null, [
      { label: "엑셀로 내보내기", ghost: true, onClick: exportData },
      { label: "엑셀에서 불러오기", ghost: true, onClick: importData },
    ]);
  }

  function loadSheetJS() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error("SheetJS 로드 실패"));
      document.head.appendChild(s);
    });
  }

  async function exportData() {
    try {
      const XLSX = await loadSheetJS();
      const wb = XLSX.utils.book_new();
      const sheet = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
      sheet("records", state.records.map((r) => ({ ...r, clowderIds: (r.clowderIds || []).join(","), photo: r.photo ? "[image]" : "" })));
      sheet("places", state.places.map((p) => ({ ...p, geo: `${p.geo.lat},${p.geo.lng}`, hours: p.hours ? `${p.hours.open}-${p.hours.close}` : "", vibe: (p.vibe || []).join(",") })));
      sheet("clowders", state.clowders.map((c) => ({ ...c, memberIds: c.memberIds.join(",") })));
      XLSX.writeFile(wb, "clowdery_export.xlsx");
      toast("엑셀로 내보냈어요");
    } catch (e) {
      // 폴백: JSON 다운로드 (§13 복구 — 데이터 손실 방지)
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "clowdery_backup.json"; a.click();
      toast("엑셀 대신 JSON으로 백업했어요");
    }
  }

  function importData() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".xlsx,.xls,.json";
    input.onchange = async () => {
      const f = input.files[0]; if (!f) return;
      const snapshot = JSON.stringify(state); // 원본 보존 (§13)
      try {
        if (f.name.endsWith(".json")) {
          const text = await f.text();
          const data = JSON.parse(text);
          if (!data.records || !data.places) throw new Error("형식 오류");
          state = data; save(); toast("불러왔어요"); router();
        } else {
          const XLSX = await loadSheetJS();
          const buf = await f.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const recs = XLSX.utils.sheet_to_json(wb.Sheets["records"] || {});
          if (!recs.length) throw new Error("records 시트가 없어요");
          recs.forEach((r) => { r.clowderIds = r.clowderIds ? String(r.clowderIds).split(",") : []; });
          state.records = recs; save(); toast("불러왔어요"); router();
        }
      } catch (e) {
        state = JSON.parse(snapshot); // 오류 시 원본 복구
        toast("불러오지 못했어요. 기존 데이터는 그대로 뒀어요");
      }
    };
    input.click();
  }

  /* ========================================================================
     17. 외부 공유 (F09) + 공유 랜딩
  ======================================================================== */
  function shareRecord(recordId) {
    const link = location.origin + location.pathname + "#/share/" + recordId;
    copy(link);
    toast("공유 링크를 복사했어요");
  }

  function renderShareLanding(recordId) {
    const r = recordById(recordId);
    const p = r ? placeById(r.placeId) : null;
    // 개인정보(프로필) 비노출 (§10, §13)
    $("#share-landing__photo").innerHTML = r?.photo
      ? `<img src="${r.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--r-lg)">`
      : `<span style="font-size:44px">🐾</span>`;
    $("#share-landing__oneline").textContent = r ? r.oneLine : "기록을 찾지 못했어요";
    $("#share-landing__place").textContent = p ? `${p.name} · ${p.category}` : "";
    $("#share-landing__open-app").onclick = () => navigate("/");
  }

  /* ========================================================================
     18. 범용 모달 / 클립보드 헬퍼
  ======================================================================== */
  function openModal(title, fields, onSubmit, actions) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay"; overlay.id = "generic-modal";
    const panel = document.createElement("div"); panel.className = "modal-panel";
    panel.innerHTML = `<h3>${esc(title)}</h3>`;
    const inputs = {};
    fields.forEach((f) => {
      const lab = document.createElement("label"); lab.textContent = f.label;
      const inp = f.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
      if (f.type !== "textarea") inp.type = "text";
      inp.placeholder = f.placeholder || "";
      inputs[f.key] = inp;
      panel.appendChild(lab); panel.appendChild(inp);
    });
    const bar = document.createElement("div"); bar.className = "modal-actions";
    if (onSubmit) {
      const ok = document.createElement("button"); ok.className = "btn-primary"; ok.textContent = "만들기";
      ok.onclick = () => { const vals = {}; Object.keys(inputs).forEach((k) => vals[k] = inputs[k].value); if (onSubmit(vals) !== false) closeModal(); };
      bar.appendChild(ok);
    }
    (actions || []).forEach((a) => {
      const btn = document.createElement("button");
      btn.className = a.danger ? "btn-primary" : "btn-ghost";
      if (a.danger) btn.style.background = "#C0392B";
      btn.textContent = a.label;
      btn.onclick = () => { a.onClick(); if (!a.keepOpen) closeModal(); };
      bar.appendChild(btn);
    });
    const close = document.createElement("button"); close.className = "btn-ghost"; close.textContent = "닫기";
    close.onclick = closeModal; bar.appendChild(close);
    panel.appendChild(bar);
    overlay.appendChild(panel);
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
    document.body.appendChild(overlay);
    if (fields[0]) inputs[fields[0].key].focus();
  }
  function closeModal() { $("#generic-modal")?.remove(); }

  function copy(text) {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
    else { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e) {} t.remove(); }
  }

  /* ========================================================================
     19. 위치 권한 (F01 전제, §12 상태)
  ======================================================================== */
  function requestLocation() {
    if (!navigator.geolocation) { state.locationStatus = "denied"; save(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { state.myLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }; state.locationStatus = "granted"; save(); if (parseHash().path === "/") renderHome(); },
      ()    => { state.locationStatus = "denied"; save(); }, // 거부 시 기본 위치 유지
      { timeout: 5000 }
    );
  }

