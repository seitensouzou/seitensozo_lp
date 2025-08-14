// cms.js (最終完成版)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@sanity/client@6/+esm';
import { qs, qsa } from './app.js'; // app.jsからヘルパー関数を読み込む

// ====== 設定 ======
const SANITY = {
  projectId: "9iu2dx4s",
  dataset: "production",
  apiVersion: "2023-10-01",
  useCdn: true,
};

const client = createClient(SANITY);
console.info("[CMS] Sanity client initialized via ES Module");

// ===== ヘルパー =====
const safeBR = (t = "") => String(t || "").replace(/\n/g, "<br>");

function extractYouTubeId(url = "") {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/embed\/([^?/]+)/);
    return m ? m[1] : "";
  } catch { return ""; }
}

function splitProfileToSections(profile = '') {
  const raw = (profile || '').trim();
  const labels = [
    { key: '音楽性', re: /^\s*(音楽性|music|musicality)\s*[:：]/i },
    { key: 'テーマ', re: /^\s*(テーマ|theme)\s*[:：]/i },
    { key: 'スタイル', re: /^\s*(スタイル|style|ビジュアル|visual)\s*[:：]/i },
    { key: 'パーソナリティ', re: /^\s*(パーソナリティ|personality)\s*[:：]/i },
  ];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const map = { 音楽性: '', テーマ: '', スタイル: '', パーソナリティ: '' };
  let current = null;
  for (const line of lines) {
    const hit = labels.find(l => l.re.test(line));
    if (hit) {
      current = hit.key;
      const body = line.replace(hit.re, '').trim();
      if (body) map[current] += (map[current] ? '\n' : '') + body;
      continue;
    }
    if (current) map[current] += (map[current] ? '\n' : '') + line;
    else map.音楽性 += (map.音楽性 ? '\n' : '') + line;
  }
  return [
    { title: '音楽性', body: map.音楽性 },
    { title: 'テーマ', body: map.テーマ },
    { title: 'スタイル', body: map.スタイル },
    { title: 'パーソナリティ', body: map.パーソナリティ },
  ].filter(x => x.body && x.body.trim());
}

function linksToPillsHtml(links = {}) {
  const defs = [
    { key: 'spotify', label: 'Spotify', color: '#1DB954' },
    { key: 'applemusic', label: 'Apple Music', color: '#FA2D48' },
    { key: 'deezer', label: 'Deezer', color: '#FF1F1F' },
    { key: 'amazonmusic', label: 'Amazon Music', color: '#146EB4' },
  ];
  const pills = defs.filter(d => links[d.key]).map(d =>
    `<a class="pill" style="background:${d.color}" href="${links[d.key]}" target="_blank" rel="noopener">${d.label}</a>`
  ).join('');
  return pills ? `<div class="streams mt-4">${pills}</div>` : '';
}

// ===== GROQ =====
const qModels = `*[_type == "model"]|order(order asc){_id, name, role, profile, youtubeUrl, links, image{asset->{url}}}`;
const qNews = `*[_type == "news"]|order(date desc){_id,title,body,tag,date}`;

// ===== RENDER FUNCTIONS =====
async function renderModels() {
  const wrap = qs('#modelsCards');
  if (!wrap) return;
  try {
    const data = await client.fetch(qModels);
    console.info("[CMS] models fetched:", data?.length);
    if (!data || !data.length) {
      wrap.innerHTML = `<p class="small" style="color:#6b7280">公開済みのモデルはまだありません。</p>`;
      return;
    }
    wrap.innerHTML = data.map(m => {
      const cover = m.image?.asset?.url || "https://placehold.co/800x1000/E0E0E0/333?text=MODEL";
      const sections = splitProfileToSections(m.profile || "");
      const yt = extractYouTubeId(m.youtubeUrl || "");
      return `
        <article class="card flip" data-card>
          <div class="wrap3d">
            <div class="face front">
              <img src="${cover}" alt="${m.name}" class="cover">
              <div class="meta">
                <div>
                  <div class="font-serif" style="font-size:20px">${m.name || ''}</div>
                  <p class="small meta-sub">${m.role || ""}</p>
                </div>
                <button class="openbtn" title="開く">＋</button>
              </div>
            </div>
            <div class="face back">
              <button class="close" title="閉じる">×</button>
              <div class="back-inner">
                <div><div class="font-serif" style="font-size:20px">${m.name || ''}</div><p class="small">${m.role || ""}</p></div>
                <div class="profile grid">
                  ${sections.map(s => `
                    <div class="carded">
                      <h5>${s.title}</h5>
                      <p>${safeBR(s.body)}</p>
                    </div>`).join("")}
                </div>
                ${yt ? `
                <div class="yt mt-2">
                  <iframe width="100%" height="260"
                    src="https://www.youtube-nocookie.com/embed/${yt}?rel=0"
                    title="${m.name} YouTube" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>` : ""}
                ${linksToPillsHtml(m.links || {})}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // Flip card logic
    const cards = qsa('#modelsCards [data-card]');
    const closeAll = (except) => cards.forEach(c => { if (c !== except) c.classList.remove('open'); });
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const openBtn = e.target.closest('.openbtn');
        const closeBtn = e.target.closest('.close');
        if (openBtn) {
          const isOpen = card.classList.contains('open');
          closeAll(card);
          if (!isOpen) card.classList.add('open');
          return;
        }
        if (closeBtn) { card.classList.remove('open'); return; }
      }, { passive: true });
    });

  } catch (err) {
    console.error("[CMS] models fetch error:", err);
    wrap.innerHTML = `<p class="small" style="color:#b91c1c">モデルの読み込みに失敗しました。</p>`;
  }
}

async function renderNews() {
  const list = qs("#newsList");
  if (!list) return;
  try {
    const data = await client.fetch(qNews);
    console.info("[CMS] news fetched:", data?.length);
    if (!data?.length) {
      list.innerHTML = "<p class='small' style='color:#6b7280'>お知らせはまだありません。</p>";
      return;
    }
    list.innerHTML = data.map(n => {
      return `
        <article class="news">
          <button class="news-head" aria-expanded="false">
            <div class="news-date small">${(n.date || "").split('T')[0].replaceAll("-", ".")}</div>
            <div class="news-main">
              <div class="news-title">${n.title}</div>
              <div class="badges mt-2">${
                (n.tag || "").toLowerCase() === "press" ? '<span class="badge press">PRESS</span>' :
                (n.tag || "").toLowerCase() === "music" ? '<span class="badge music">MUSIC</span>' :
                (n.tag || "").toLowerCase() === "project" ? '<span class="badge project">PROJECT</span>' :
                n.tag ? `<span class="badge press">${String(n.tag).toUpperCase()}</span>` : ""
              }</div>
            </div>
            <span class="news-toggle">＋</span>
          </button>
          <div class="news-panel small">${safeBR(n.body)}</div>
        </article>
      `;
    }).join("");

    // Accordion logic for news
    qsa("#newsList .news").forEach(n => {
      const head = n.querySelector(".news-head");
      const t = n.querySelector(".news-toggle");
      head.addEventListener("click", () => {
        n.classList.toggle("open");
        head.setAttribute("aria-expanded", n.classList.contains("open"));
        t.textContent = n.classList.contains("open") ? "×" : "＋";
      });
    });

  } catch (e) {
    console.error("[CMS] news fetch error:", e);
    list.innerHTML = "<p class='small' style='color:#b91c1c'>お知らせの読み込みに失敗しました。</p>";
  }
}

// ===== 実行 =====
(async () => {
  await Promise.all([renderModels(), renderNews()]);
})();
