/* ========= Sanity Client (no-token, read-only) ========= */
const SANITY = {
  projectId: "9iu2dx4s",        // ← あなたの Project ID
  dataset:   "production",       // ← データセット
  apiVersion:"2024-08-01",       // 任意の固定日付（CDN向け）
  useCdn:    true
};

// 便利: GROQ を実行（失敗時は空配列/undefinedを返す）
async function querySanity(groq, params = {}) {
  const base = `https://${SANITY.projectId}.api.sanity.io/${SANITY.apiVersion}/data/query/${SANITY.dataset}`;
  const url  = new URL(base);
  url.searchParams.set("query", groq);
  if (params && Object.keys(params).length) {
    url.searchParams.set("params", JSON.stringify(params));
  }
  try {
    const res = await fetch(url.toString(), { cache: "force-cache" });
    if (!res.ok) throw new Error(await res.text());
    const { result } = await res.json();
    return result;
  } catch (e) {
    console.warn("[Sanity] query error:", e.message);
    return undefined;
  }
}

/* ========= フォーマッタ等 ========= */
const fmt = {
  date(d) {
    try {
      return new Intl.DateTimeFormat("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit" })
        .format(new Date(d)).replace(/\//g, ".");
    } catch { return d || ""; }
  }
};
function escapeHtml(s=""){ return s.replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

/* ========= News ========= */
// あなたのスキーマに合わせて必要なら調整
const Q_NEWS = `
  *[_type=="news" && !(_id in path("drafts.**"))]
  | order(date desc)[0..9]{
    _id, title, date, tag, body
  }
`;
async function hydrateNews() {
  const container =
    document.querySelector('[data-cms="news"]') ||
    document.querySelector("#news .newslist");
  if (!container) return; // 置き場所がなければ何もしない

  const items = await querySanity(Q_NEWS);
  if (!Array.isArray(items) || !items.length) return;

  const tagClass = (t) => {
    const s = String(t||"").toLowerCase();
    if (s.includes("press"))   return "press";
    if (s.includes("music"))   return "music";
    if (s.includes("project")) return "project";
    return "press";
  };

  container.innerHTML = items.map(n=>`
    <article class="news">
      <button class="news-head" aria-expanded="false">
        <div class="news-date small">${fmt.date(n.date)}</div>
        <div style="flex:1">
          <div class="news-title">${escapeHtml(n.title || "")}</div>
          <div class="badges"><span class="badge ${tagClass(n.tag)}">${escapeHtml((n.tag||"").toUpperCase())}</span></div>
        </div>
        <span class="news-toggle">＋</span>
      </button>
      <div class="news-panel small">
        ${escapeHtml(n.body || "")}
      </div>
    </article>
  `).join("");

  // 既存コードと同じトグル挙動を付与
  container.querySelectorAll(".news").forEach(n=>{
    const head = n.querySelector(".news-head");
    const tgl  = n.querySelector(".news-toggle");
    head?.addEventListener("click", ()=>{
      n.classList.toggle("open");
      head.setAttribute("aria-expanded", n.classList.contains("open"));
      if (tgl) tgl.textContent = n.classList.contains("open") ? "×" : "＋";
    });
  });
}

/* ========= Models ========= */
// あなたのスキーマに合わせて必要なら調整
const Q_MODELS = `
  *[_type=="model" && !(_id in path("drafts.**"))]{
    _id, name, role, profile, youtube,
    "imageUrl": image.asset->url
  }
`;
function setIf(el, cb){ try{ if(el) cb(el); }catch{} }
function ytEmbed(url=""){
  try{
    // youtu.be/xxxx, youtube.com/watch?v=xxxx 両対応
    const id = url.match(/(?:youtu\.be\/|v=)([A-Za-z0-9_-]{6,})/)?.[1];
    if(!id) return "";
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
  }catch{ return ""; }
}
async function hydrateModels() {
  const cards = [...document.querySelectorAll('[data-model]')];
  if (!cards.length) return;

  const rows = await querySanity(Q_MODELS);
  if (!Array.isArray(rows) || !rows.length) return;

  const byName = Object.fromEntries(
    rows.map(m => [String(m.name||"").toLowerCase(), m])
  );

  cards.forEach(card=>{
    const key = String(card.getAttribute("data-model")||"").toLowerCase();
    const data = byName[key];
    if (!data) return;

    // FRONT
    setIf(card.querySelector(".face.front img"), img=>{
      if (data.imageUrl) img.src = `${data.imageUrl}?w=1200&auto=format`;
    });
    setIf(card.querySelector(".face.front .small"), el=>{
      if (data.role) el.textContent = data.role;
    });

    // BACK: プロフィール本文
    const profileTarget =
      card.querySelector("[data-model-profile]") ||
      card.querySelector(".face.back p.small, .face.back p");
    setIf(profileTarget, el=>{
      if (data.profile) el.textContent = data.profile;
    });

    // BACK: YouTube
    setIf(card.querySelector("[data-model-youtube]"), iframe=>{
      const src = ytEmbed(data.youtube || "");
      if (src) iframe.src = src;
    });
  });
}

/* ========= Services ========= */
// あなたのスキーマに合わせて必要なら調整
const Q_SERVICES = `
  *[_type=="service" && !(_id in path("drafts.**"))]{
    _id, t, d, detail
  }
`;
async function hydrateServices() {
  // data-svc-key="音楽活動" のように一致させる
  const svcNodes = [...document.querySelectorAll("[data-svc-key]")];
  if (!svcNodes.length) return;

  const rows = await querySanity(Q_SERVICES);
  if (!Array.isArray(rows) || !rows.length) return;

  const byKey = Object.fromEntries(rows.map(s => [String(s.t||"").trim(), s]));

  svcNodes.forEach(node=>{
    const k = String(node.getAttribute("data-svc-key")||"").trim();
    const s = byKey[k];
    if (!s) return;

    setIf(node.querySelector(".svc-title"), el => el.textContent = s.t || k);
    setIf(node.querySelector(".svc-head .small"), el => el.textContent = s.d || "");
    setIf(node.querySelector(".svc-panel"), el => el.innerHTML = escapeHtml(s.detail || ""));
  });
}

/* ========= Boot ========= */
(async function bootCMS(){
  await Promise.all([
    hydrateNews(),
    hydrateModels(),
    hydrateServices(),
  ]);
  // ここまで失敗してもサイト全体は壊れない
})();
