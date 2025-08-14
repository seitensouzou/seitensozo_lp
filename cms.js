// cms.js  —  index.html と同じ階層
// そのままコピペOK。Sanityの projectId / dataset はあなたの値をセット済み。

import {createClient} from "https://cdn.jsdelivr.net/npm/@sanity/client@6/+esm";

// ====== Sanity 設定 ======
const projectId = "9iu2dx4s";
const dataset   = "production";
const apiVersion = "2025-08-14";

// dataset を「Public（読み取り可）」にしていれば token は不要
// Private の場合は Read 権限の token を入れてください（漏洩注意！）
const token = undefined;

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: true });

// ====== DOM ショートカット ======
const $  = (s, sc=document) => sc.querySelector(s);
const $$ = (s, sc=document) => [...sc.querySelectorAll(s)];

// ====== Sanity 画像ref → URL 変換（image型にも対応）======
function sanityImageUrl(ref) {
  // ref 例: "image-<hash>-<width>x<height>-<format>"
  try {
    if (!ref || !ref.startsWith("image-")) return "";
    const [, id, size, format] = ref.split("-");
    const [w, h] = (size || "1200x1200").split("x");
    return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}.${format}?w=${w}&h=${h}&auto=format`;
  } catch {
    return "";
  }
}

// ====== GROQ クエリ ======
/* === MODELS (CMS) — BEGIN (for profile/links/youtubeUrl schema) === */

/** GROQ（既存スキーマ） */
const qModels = `
*[_type == "model"]|order(order asc){
  _id, name, role, profile, youtubeUrl,
  links{spotify, applemusic, deezer, amazonmusic},
  "imageUrl": coalesce(imageUrl, image.asset->url, "")
}
`;

/** profile を 4カードに分割する（音楽性/テーマ/スタイル/パーソナリティ） */
function splitProfileToSections(profile=''){
  const raw = (profile || '').trim();

  // ラベル候補（日本語と英語のゆらぎも拾う）
  const labels = [
    {key:'音楽性', re:/^\s*(音楽性|music|musicality)\s*[:：]/i},
    {key:'テーマ', re:/^\s*(テーマ|theme)\s*[:：]/i},
    {key:'スタイル', re:/^\s*(スタイル|style|ビジュアル|visual)\s*[:：]/i},
    {key:'パーソナリティ', re:/^\s*(パーソナリティ|personality)\s*[:：]/i},
  ];

  // 行単位で解析
  const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

  // 収集用
  const map = { 音楽性:'', テーマ:'', スタイル:'', パーソナリティ:'' };
  let current = null;

  for(const line of lines){
    const hit = labels.find(l => l.re.test(line));
    if(hit){
      current = hit.key;
      // 見出しを除いた本文
      const body = line.replace(hit.re,'').trim();
      if(body) map[current] += (map[current]?'\n':'') + body;
      continue;
    }
    if(current){
      map[current] += (map[current]?'\n':'') + line;
    }else{
      // 見出しが無く全部1行のときのフォールバック：音楽性に入れる
      map.音楽性 += (map.音楽性?'\n':'') + line;
    }
  }

  // 表示順で配列に
  return [
    {title:'音楽性', body:map.音楽性},
    {title:'テーマ', body:map.テーマ},
    {title:'スタイル', body:map.スタイル},
    {title:'パーソナリティ', body:map.パーソナリティ},
  ].filter(s => s.body && s.body.trim());
}

/** ストリーミングリンク（links{} → pills） */
function linksToPillsHtml(links={}){
  const defs = [
    {key:'spotify',     label:'Spotify',      color:'#1DB954'},
    {key:'applemusic',  label:'Apple Music',  color:'#FA2D48'},
    {key:'deezer',      label:'Deezer',       color:'#FF1F1F'},
    {key:'amazonmusic', label:'Amazon Music', color:'#146EB4'},
  ];
  const pills = defs
    .filter(d => links[d.key])
    .map(d => `<a class="pill" style="background:${d.color}" href="${links[d.key]}" target="_blank" rel="noopener">${d.label}</a>`)
    .join('');
  return pills ? `<div class="streams mt-4">${pills}</div>` : '';
}



/** Models の描画 */
async function renderModels(){
  const wrap = document.querySelector('#modelsCards');
  if(!wrap) return;

  const models = await client.fetch(qModels);
  if(!models?.length){ wrap.innerHTML=''; return; }

  wrap.innerHTML = models.map(m=>{
    const cover = m.imageUrl || 'https://placehold.co/800x1000/E0E0E0/333?text=MODEL';
    const sections = splitProfileToSections(m.profile || '');
    const yt = extractYouTubeId(m.youtubeUrl || '');

    return `
    <article class="card flip" data-card>
      <div class="wrap3d">
        <!-- FRONT -->
        <div class="face front">
          <img src="${cover}" alt="${m.name}" class="cover">
          <div class="meta">
            <div>
              <div class="font-serif" style="font-size:20px">${m.name}</div>
              <p class="small meta-sub">${m.role || ''}</p>
            </div>
            <button class="openbtn" title="開く">＋</button>
          </div>
        </div>

        <!-- BACK -->
        <div class="face back">
          <button class="close" title="閉じる">×</button>
          <div class="back-inner">
            <div><div class="font-serif" style="font-size:20px">${m.name}</div><p class="small">${m.role || ''}</p></div>

            <div class="profile grid">
              ${sections.map(s => `
                <div class="carded">
                  <h5>${s.title}</h5>
                  <p>${s.body.replace(/\n/g,'<br>')}</p>
                </div>
              `).join('')}
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
    </article>`;
  }).join('');

  attachModelFlipHandlers();
}

/** フリップの挙動（既存の書き方に合わせて） */
function attachModelFlipHandlers(){
  const cards = [...document.querySelectorAll('[data-card]')];
  const closeAll = (except)=> cards.forEach(c => { if(c!==except) c.classList.remove('open'); });
  cards.forEach(card=>{
    card.addEventListener('click',(e)=>{
      const openBtn  = e.target.closest('.openbtn');
      const closeBtn = e.target.closest('.close');
      if(openBtn){
        const isOpen = card.classList.contains('open');
        closeAll(card);
        if(!isOpen) card.classList.add('open');
        return;
      }
      if(closeBtn){
        card.classList.remove('open');
        return;
      }
    }, {passive:true});
  });
}
/* === MODELS (CMS) — END === */

`;

const qNews = `
*[_type == "news"]|order(date desc){
  _id, title, body, tag, date
}
`;

const qServices = `
*[_type == "service"]|order(order asc){
  _id, title, summary, detail, icon
}
`;

// ====== レンダリング ======
async function renderModels() {
  const wrap = $("#modelsCards");
  if (!wrap) return;
  const data = await client.fetch(qModels);

  // ない場合はそのまま
  if (!data?.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = data.map(m => {
    const img =
      m.imageUrl?.startsWith("image-") ? sanityImageUrl(m.imageUrl) :
      (m.imageUrl || "https://placehold.co/800x1000/E0E0E0/333?text=MODEL");
    const links = m.links || {};
    return `
      <article class="card flip" data-card>
        <div class="wrap3d">
          <div class="face front">
            <img src="${img}" alt="${m.name}" style="width:100%;height:100%;object-fit:cover">
            <div class="meta">
              <div>
                <div class="font-serif" style="font-size:20px">${m.name}</div>
                <p class="small" style="color:#e5e7eb">${m.role ?? ""}</p>
              </div>
              <button class="openbtn" title="開く">＋</button>
            </div>
          </div>
          <div class="face back">
            <button class="close" title="閉じる">×</button>
            <div style="position:absolute;inset:0;padding:18px;display:flex;flex-direction:column">
              <div>
                <div class="font-serif" style="font-size:20px">${m.name}</div>
                <p class="small">${m.role ?? ""}</p>
              </div>

              <div class="mt-2" style="border:1px solid var(--line);border-radius:12px;padding:12px">
                <p class="small"><strong>音楽性</strong>・<strong>テーマ</strong>・<strong>スタイル/ビジュアル</strong>・<strong>パーソナリティ</strong> などを自由に記述：<br>${(m.profile ?? "").replace(/\n/g,"<br>")}</p>
              </div>

              ${m.youtubeUrl ? `
                <div class="mt-3">
                  <div class="small" style="margin-bottom:6px;color:var(--muted)">YouTube</div>
                  <div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;border:1px solid var(--line)">
                    <iframe src="https://www.youtube-nocookie.com/embed/${extractYouTubeId(m.youtubeUrl)}" title="${m.name} YouTube"
                      frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                      style="position:absolute;inset:0;width:100%;height:100%"></iframe>
                  </div>
                </div>` : ""}

              <div class="streams mt-4" style="margin-top:auto">
                ${links.spotify     ? `<a style="background:#1DB954"  href="${links.spotify}"     target="_blank" rel="noreferrer">Spotify</a>`      : ""}
                ${links.applemusic  ? `<a style="background:#FA2D48"  href="${links.applemusic}"  target="_blank" rel="noreferrer">Apple Music</a>`  : ""}
                ${links.deezer      ? `<a style="background:#FF1F1F"  href="${links.deezer}"      target="_blank" rel="noreferrer">Deezer</a>`       : ""}
                ${links.amazonmusic ? `<a style="background:#146EB4"  href="${links.amazonmusic}" target="_blank" rel="noreferrer">Amazon Music</a>` : ""}
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // フリップの挙動を付与（あなたの既存JSと同じ動き）
  attachModelFlipHandlers();
}

function attachModelFlipHandlers() {
  const cards = $$("[data-card]");
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
      if (closeBtn){
        card.classList.remove("open");
        return;
      }
    }, {passive:true});
  });
}

async function renderServices() {
  const grid = $("#servicesGrid");
  if (!grid) return;
  const data = await client.fetch(qServices);
  if (!data?.length) { grid.innerHTML = ""; return; }

  grid.innerHTML = data.map(s => `
    <div class="svc-item">
      <div class="svc-head">
        <div style="display:flex;gap:10px;align-items:flex-start">
          ${pickIconSvg(s.icon)}
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

  // アコーディオン挙動
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

async function renderNews() {
  const list = $("#newsList");
  if (!list) return;
  const data = await client.fetch(qNews);
  if (!data?.length) { list.innerHTML = ""; return; }

  list.innerHTML = data.map(n => `
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

  // NEWS のトグル
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

// ====== ユーティリティ ======
function extractYouTubeId(url=""){
  try{
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    // /embed/<id>
    const m = u.pathname.match(/\/embed\/([^?/]+)/);
    return m ? m[1] : "";
  }catch{ return ""; }
}

function formatDate(d){
  if(!d) return "";
  // Sanityのdate型 → YYYY-MM-DD 形式を想定
  return d.replaceAll("-", ".");
}

function renderBadge(tag=""){
  const t = (tag || "").toLowerCase();
  if (t === "press")   return `<span class="badge press">PRESS</span>`;
  if (t === "music")   return `<span class="badge music">MUSIC</span>`;
  if (t === "project") return `<span class="badge project">PROJECT</span>`;
  return t ? `<span class="badge press">${t.toUpperCase()}</span>` : "";
}

// サービスのピクト（簡易的に5種類）
function pickIconSvg(icon=""){
  const n = icon.toLowerCase();
  const base = `class="svc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"`;
  if (n.includes("音楽") || n.includes("music"))        return `<svg ${base}><path d="M9 18V5l11-2v13"/><circle cx="7" cy="18" r="3"/><circle cx="20" cy="16" r="3"/></svg>`;
  if (n.includes("映像") || n.includes("video"))        return `<svg ${base}><path d="M3 10h18v10H3z"/><path d="M3 10l3-7 7 3 7-3v7"/></svg>`;
  if (n.includes("企業") || n.includes("行政")||n.includes("collab")||n.includes("corporate")) return `<svg ${base}><path d="M3 21h18"/><path d="M6 21V8h12v13"/><path d="M9 8V3h6v5"/></svg>`;
  if (n.includes("クリエ")|| n.includes("creative"))     return `<svg ${base}><path d="M12 12l7-7 2 2-7 7"/><path d="M14 10l-8 8H4v-2l8-8"/></svg>`;
  if (n.includes("個人") || n.includes("personal"))      return `<svg ${base}><path d="M12 21s-6-4.35-9-7.35a6 6 0 019-8.65 6 6 0 019 8.65C18 16.65 12 21 12 21z"/></svg>`;
  // デフォルト音楽
  return `<svg ${base}><path d="M9 18V5l11-2v13"/><circle cx="7" cy="18" r="3"/><circle cx="20" cy="16" r="3"/></svg>`;
}

// ====== 実行 ======
(async function init(){
  try {
    await Promise.all([renderModels(), renderServices(), renderNews()]);
  } catch (e) {
    console.error("CMS load error:", e);
  }
})();
