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
const qModels = `*[_type == "model"]|order(order asc){_id, name, role, coverType, "imageUrl": coverImage.asset->url, "videoUrl": coverVideo.asset->url, youtube, sections, streams}`;
const qNews = `*[_type == "news"]|order(date desc){_id,title,body,tag,date}`;
const qGallery = `*[_type == "galleryItem"]|order(order asc){ itemType, "imageUrl": image.asset->url, "videoUrl": videoFile.asset->url, caption }`;


// ===== RENDER FUNCTIONS =====
async function renderModels() {
  const container = qs('#modelsContainer');
  if (!container) return;

  try {
    const data = await client.fetch(qModels);
    console.info("[CMS] models fetched:", data);

    if (!data || !data.length) {
      container.innerHTML = `<p class="small" style="color:#6b7280">公開済みのモデルはまだありません。</p>`;
      return;
    }

    const cardsHtml = data.map(m => {
      let coverElement = `<img src="${m.imageUrl || 'https://placehold.co/800x1000/E0E0E0/333?text=MODEL'}" alt="${m.name || ''}" class="cover">`;
      if (m.coverType === 'video' && m.videoUrl) {
        coverElement = `<video src="${m.videoUrl}" muted loop playsinline class="cover"></video>`;
      }
      
      const yt = extractYouTubeId(m.youtube || "");

      // ▼▼▼ 修正箇所 ▼▼▼
      // 常に <article> タグでカードの中身を生成
      return `
        <article class="card flip" data-card>
          <div class="wrap3d">
            <div class="face front">
              ${coverElement}
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
                  ${(m.sections || []).map(s => `<div class="carded"><h5>${s.title || ''}</h5><p>${safeBR(s.body || '')}</p></div>`).join("")}
                </div>
                ${yt ? `<div class="yt mt-2"><iframe width="100%" height="260" src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${m.name} YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>` : ""}
                ${linksToPillsHtml(m.streams)}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");


    if (data.length >= 4) {
      // 4人以上の場合：SwiperのHTML構造を生成し、その中にカードを注入
      const swiperSlidesHtml = data.map(m => `<div class="swiper-slide">${m}</div>`).join('');
      container.innerHTML = `
        <div class="swiper models-swiper">
          <div id="modelsCards" class="swiper-wrapper">${swiperSlidesHtml}</div>
          <div class="swiper-button-prev"></div>
          <div class="swiper-button-next"></div>
        </div>
      `;
      
      new Swiper('.models-swiper', {
        loop: true,
        slidesPerView: 3,
        spaceBetween: 30,
        centeredSlides: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        breakpoints: {
          860: { slidesPerView: 1, spaceBetween: 20 },
          1024: { slidesPerView: 2, spaceBetween: 20 }
        }
      });

    } else {
      // 3人以下の場合：静的グリッドのコンテナを生成し、その中にカードを注入
      container.innerHTML = `<div id="modelsCards" class="models-grid">${cardsHtml}</div>`;
    }

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

    const modelCards = qsa('#modelsCards .card, .models-swiper .card');
    modelCards.forEach(card => {
      const video = card.querySelector('video.cover');
      if (video) {
        card.addEventListener('mouseenter', () => video.play());
        card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
      }
    });

  } catch (err) {
    console.error("[CMS] models fetch error:", err);
    container.innerHTML = `<p class="small" style="color:#b91c1c">モデルの読み込みに失敗しました。</p>`;
  }
}


async function renderNews() {
// ... (変更なし) ...
}

async function renderGallery() {
// ... (変更なし) ...
}

// ===== 実行 =====
(async () => {
  await Promise.all([renderModels(), renderNews(), renderGallery()]);
})();
