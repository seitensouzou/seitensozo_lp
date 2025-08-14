// cms.js — fetch only (no @sanity/client). Copy-paste as-is.

// ==== Sanity settings ====
const SANITY = {
  projectId: "9iu2dx4s",
  dataset: "production",
  apiVersion: "2023-10-01", // 安定版に固定
  token: undefined,          // Public 読み取りなら不要
};

// ==== DOM helpers ====
const $  = (s, sc=document) => sc.querySelector(s);
const $$ = (s, sc=document) => [...sc.querySelectorAll(s)];

// ==== REST fetcher (GROQ) ====
async function groq(query, params = {}) {
  const base = `https://${SANITY.projectId}.api.sanity.io/${SANITY.apiVersion}/data/query/${SANITY.dataset}`;
  const url  = `${base}?query=${encodeURIComponent(query)}&${new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k,v])=>[`$${k}`, String(v)]))
  )}`;
  const res = await fetch(url, {
    headers: SANITY.token ? { Authorization: `Bearer ${SANITY.token}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sanity error: ${res.status}`);
  const data = await res.json();
  return data.result || [];
}

// ==== YouTube ID extractor ====
function extractYouTubeId(url=""){
  try{
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/embed\/([^?/]+)/);
    return m ? m[1] : "";
  }catch{ return ""; }
}

// ==== Utilities ====
function formatDate(d){ return d ? d.replaceAll("-", ".") : ""; }
function renderBadge(tag=""){
  const t = (tag || "").toLowerCase();
  if (t === "press")   return `<span class="badge press">PRESS</span>`;
  if (t === "music")   return `<span class="badge music">MUSIC</span>`;
  if (t === "project") return `<span class="badge project">PROJECT</span>`;
  return t ? `<span class="badge press">${t.toUpperCase()}</span>` : "";
}
function pickIconSvg(icon=""){
  const n = (icon||"").toLowerCase();
  const base = `class="svc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"`;
  if (n.includes("音楽") || n.includes("music"))        return `<svg ${base}><path d="M9 18V5l11-2v13"/><circle cx="7" cy="18" r="3"/><circle cx="20" cy="16" r="3"/></svg>`;
  if (n.includes("映像") || n.includes("video"))        return `<svg ${base}><path d="M3 10h18v10H3z"/><path d="M3 10l3-7 7 3 7-3v7"/></svg>`;
  if (n.includes("企業") || n.includes("行政")||n.includes("collab")||n.includes("corporate")) return `<svg ${base}><path d="M3 21h18"/><path d="M6 21V8h12v13"/><path d="M9 8V3h6v5"/></svg>`;
  if (n.includes("クリエ")|| n.includes("creative"))     return `<svg ${base}><path d="M12 12l7-7 2 2-7 7"/><path d="M14 10l-8 8H4v-2l8-8"/></svg>`;
  if (n.includes("個人") || n.includes("personal"))      return `<svg ${base}><path d="M12 21s-6-4.35-9-7.35a6 6 0 019-8.65 6 6 0 019 8.65C18 16.65 12 21 12 21z"/></svg>`;
  return `<svg ${base}><path d="M9 18V5l11-2v13"/><circle cx="7" cy="18" r="3"/><circle cx="20" cy="16" r="3"/></svg>`;
}

// ==== profile を4項目に分割 ====
function splitProfileToSections(profile=''){
  const raw = (profile || '').trim();
  const labels = [
    {key:'音楽性', re:/^\s*(音楽性|music|musicality)\s*[:：]/i},
    {key:'テーマ', re:/^\s*(テーマ|theme)\s*[:：]/i},
    {key:'スタイル', re:/^\s*(スタイル|style|ビジュアル|visual)\s*[:：]/i},
    {key:'パーソナリティ', re:/^\s*(パーソナリティ|personality)\s*[:：]/i},
  ];
  const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const map = { 音楽性:'', テーマ:'', スタイル:'', パーソナリティ:'' };
  let current = null;
  for(const line of lines){
    const hit = labels.find(l => l.re.test(line));
    if(hit){
      current = hit.key;
      const body = line.replace(hit.re,'').trim();
      if(body) map[current] += (map[current]?'\n':'') + body;
      continue;
    }
    if(current){
      map[current] += (map[current]?'\n':'') + line;
    }else{
      map.音楽性 += (map.音楽性?'\n':'') + line;
    }
  }
  return [
    {title:'音楽性', body:map.音楽性},
    {title:'テーマ', body:map.テーマ},
    {title:'スタイル', body:map.スタイル},
    {title:'パーソナリティ', body:map.パーソナリティ},
  ].filter(s => s.body && s.body.trim());
}
function linksToPillsHtml(links={}){
  const defs = [
    {key:'spotify',     label:'Spotify',      color:'#1DB954'},
    {key:'applemusic',  label:'Apple Music',  color:'#FA2D48'},
    {key:'deezer',      label:'Deezer',       color:'#FF1F1F'},
    {key:'amazonmusic', label:'Amazon Music', color:'#146EB4'},
  ];
  const pills = defs.filter(d=>links[d.key])
    .map(d=>`<a class="pill" style="background:${d.color}" href="${links[d.key]}" target="_blank" rel="noopener">${d.label}</a>`)
    .join('');
  return pills ? `<div class="streams mt-4">${pills}</div>` : '';
}

// ==== MODELS ====
async function renderModels(){
  const wrap = $("#modelsCards");
  if(!wrap) return;

  const q = `
    *[_type == "model"]|order(order asc){
      _id, name, role, profile, youtubeUrl,
      links{spotify, applemusic, deezer, amazonmusic},
      // 文字列URL or image型どちらでも拾う
      "imageUrl": coalesce(imageUrl, image.asset->url)
    }
  `;
  const models = await groq(q);

  if(!models?.length){ wrap.innerHTML = ""; return; }

  wrap.innerHTML = models.map(m=>{
    const cover = m.imageUrl || 'https://placehold.co/800x1000/E0E0E0/333?text=MODEL';
    const sections = splitProfileToSections(m.profile || '');
    const yt = extractYouTubeId(m.youtubeUrl || '');
    return `
      <article class="card flip" data-card>
        <div class="wrap3d">
          <div class="face front">
            <img src="${cover}" alt="${m.name}" class="cover" style="width:100%;height:100%;object-fit:cover">
            <div class="meta">
              <div>
                <div class="font-serif" style="font-size:20px">${m.name}</div>
                <p class="small meta-sub">${m.role || ''}</p>
              </div>
              <button class="openbtn" title="開く">＋</button>
            </div>
          </div>
          <div class="face back">
            <button class="close" title="閉じる">×</button>
            <div class="back-inner" style="position:absolute;inset:0;padding:18px;display:flex;flex-direction:column">
              <div><div class="font-serif" style="font-size:20px">${m.name}</div><p class="small">${m.role || ''}</p></div>

              <div class="profile grid">
                ${sections.map(s=>`
                  <div class="carded">
                    <h5>${s.title}</h5>
                    <p>${s.body.replace(/\n/g,"<br>")}</p>
                  </div>`).join('')}
              </div>

              ${yt ? `
              <div class="yt mt-2">
                <iframe width="100%" height="260"
                  src="https://www.youtube-nocookie.com/embed/${yt}?rel=0"
                  title="${m.name} YouTube" frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen></iframe>
              </div>` : ''}

              ${linksToPillsHtml(m.links || {})}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // flip 挙動
  const cards = $$("[data-card]", wrap);
  const closeAll = (except)=> cards.forEach(c => { if (c!==except) c.classList.remove("open"); });
  cards.forEach(card=>{
    card.addEventListener("click",(e)=>{
      const openBtn  = e.target.closest(".openbtn");
      const closeBtn = e.target.closest(".close");
      if (openBtn){
        const isOpen = card.classList.contains("open");
        closeAll(card);
        if (!isOpen) card.classList.add("open");
        return;
      }
      if (closeBtn){ card.classList.remove("open"); return; }
    }, {passive:true});
  });
}

// ==== SERVICES ====
async function renderServices(){
  const grid = $("#servicesGrid");
  if(!grid) return;
  const q = `
    *[_type == "service"]|order(order asc){
      _id, title, summary, detail, icon
    }
  `;
  const list = await groq(q);
  if(!list?.length){ grid.innerHTML = ""; return; }

  grid.innerHTML = list.map(s=>`
    <div class="svc-item">
      <div class="svc-head">
        <div style="display:flex;gap:10px;align-items:flex-start">
          ${pickIconSvg(s.icon||"")}
          <div>
            <div class="svc-title">${s.title}</div>
            <p class="small">${s.summary ?? ""}</p>
          </div>
        </div>
        <button class="svc-toggle" aria-label="開閉">＋</button>
      </div>
      <div class="svc-panel small">${(s.detail ?? "").replace(/\n/g,"<br>")}</div>
    </div>
  `).join("");

  $$("#servicesGrid .svc-item").forEach(item=>{
    const btn = item.querySelector(".svc-toggle");
    const head = item.querySelector(".svc-head");
    const toggle = ()=> {
      item.classList.toggle("open");
      btn.textContent = item.classList.contains("open") ? "×" : "＋";
      btn.setAttribute("aria-expanded", item.classList.contains("open"));
    };
    head.addEventListener("click",(e)=>{
      if (e.target.closest(".svc-toggle") || !e.target.closest(".svc-panel")) toggle();
    });
  });
}

// ==== NEWS ====
async function renderNews(){
  const list = $("#newsList");
  if(!list) return;
  const q = `
    *[_type == "news"]|order(date desc){
      _id, title, body, tag, date
    }
  `;
  const news = await groq(q);
  if(!news?.length){ list.innerHTML = ""; return; }

  list.innerHTML = news.map(n=>`
    <article class="news">
      <button class="news-head" aria-expanded="false">
        <div class="news-date small">${formatDate(n.date)}</div>
        <div style="flex:1">
          <div class="news-title">${n.title}</div>
          <div class="badges">${renderBadge(n.tag)}</div>
        </div>
        <span class="news-toggle">＋</span>
      </button>
      <div class="news-panel small">${(n.body ?? "").replace(/\n/g,"<br>")}</div>
    </article>
  `).join("");

  $$("#newsList .news").forEach(n=>{
    const head = n.querySelector(".news-head");
    const t = n.querySelector(".news-toggle");
    head.addEventListener("click",()=>{
      n.classList.toggle("open");
      head.setAttribute("aria-expanded", n.classList.contains("open"));
      t.textContent = n.classList.contains("open") ? "×" : "＋";
    });
  });
}

// ==== init ====
(async function init(){
  try{
    await Promise.all([renderModels(), renderServices(), renderNews()]);
  }catch(e){
    console.error("CMS load error:", e);
  }
})();
