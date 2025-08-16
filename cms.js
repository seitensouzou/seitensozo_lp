// cms.js (最終完成版 - スキーマ定義に完全一致)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@sanity/client@6/+esm';
import { qs, qsa } from './app.js';

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

function linksToPillsHtml(links = []) {
    const serviceMap = {
        youtube: { label: 'YouTube', color: '#FF0000' },
        spotify: { label: 'Spotify', color: '#1DB954' },
        apple: { label: 'Apple Music', color: '#FA2D48' },
        deezer: { label: 'Deezer', color: '#FF1F1F' },
        amazon: { label: 'Amazon Music', color: '#146EB4' }
    };
    const pills = (links || []).map(link => {
        const service = serviceMap[link.service];
        if (!service) return '';
        return `<a class="pill" style="background:${service.color}" href="${link.url}" target="_blank" rel="noopener">${service.label}</a>`;
    }).join('');
    return pills ? `<div class="streams mt-4">${pills}</div>` : '';
}

// ===== GROQ =====
// スキーマ(model.ts)のフィールド名に完全に一致させる
const qModels = `*[_type == "model"]|order(order asc){
  _id, 
  name, 
  role, 
  "imageUrl": cover.asset->url,
  youtube,
  sections,
  streams
}`;
const qNews = `*[_type == "news"]|order(date desc){_id,title,body,tag,date}`;
const qGallery = `*[_type == "galleryItem"]|order(order asc){ "imageUrl": image.asset->url, caption }`;

// ===== RENDER FUNCTIONS =====
async function renderModels() {
  const wrap = qs('#modelsCards');
  if (!wrap) return;
  try {
    const data = await client.fetch(qModels);
    console.info("[CMS] models fetched:", data); // データの中身を確認
    if (!data || !data.length) {
      wrap.innerHTML = `<p class="small" style="color:#6b7280">公開済みのモデルはまだありません。</p>`;
      return;
    }
    wrap.innerHTML = data.map(m => {
      const cover = m.imageUrl || "https://placehold.co/800x1000/E0E0E0/333?text=MODEL";
      const yt = extractYouTubeId(m.youtube || "");
      return `
        <article class="card flip" data-card>
          <div class="wrap3d">
            <div class="face front">
              <img src="${cover}" alt="${m.name || ''}" class="cover">
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
                  ${(m.sections || []).map(s => `
                    <div class="carded">
                      <h5>${s.title || ''}</h5>
                      <p>${safeBR(s.body || '')}</p>
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
                ${linksToPillsHtml(m.streams)}
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

    async function renderGallery() {
  const grid = qs('#galleryGrid');
  if (!grid) return;

  try {
    const data = await client.fetch(qGallery);
    if (!data || !data.length) {
      grid.innerHTML = `<p class="small">まだ写真がありません。</p>`;
      return;
    }

    grid.innerHTML = data.map(item => `
      <a href="${item.imageUrl}" class="gallery-item">
        <img src="${item.imageUrl}" alt="${item.caption || 'ギャラリー画像'}">
      </a>
    `).join('');

    // ポップアップ機能
    const lightbox = qs('#lightbox');
    const lightboxImage = qs('#lightboxImage');
    const lightboxClose = qs('#lightboxClose');

    if (!lightbox) return; // ポップアップ要素がなければ処理を中断

    grid.addEventListener('click', e => {
      e.preventDefault();
      const link = e.target.closest('.gallery-item');
      if (link) {
        lightboxImage.src = link.href;
        lightbox.style.display = 'flex';
      }
    });

    const closeLightbox = () => {
      lightbox.style.display = 'none';
      lightboxImage.src = '';
    };

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });

  } catch (err) {
    console.error("[CMS] gallery fetch error:", err);
    grid.innerHTML = `<p class="small" style="color:#b91c1c">ギャラリーの読み込みに失敗しました。</p>`;
  }
}

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
  await Promise.all([renderModels(), renderNews(), renderGallery()]);
})();
