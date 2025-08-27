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
      
      const cardContentHtml = `
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

      if (data.length >= 4) {
        return `<div class="swiper-slide">${cardContentHtml}</div>`;
      } else {
        return cardContentHtml;
      }

    }).join("");


    if (data.length >= 4) {
      container.innerHTML = `
        <div class="swiper models-swiper">
          <div id="modelsCards" class="swiper-wrapper">${cardsHtml}</div>
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
      container.innerHTML = `<div id="modelsCards" class="models-grid">${cardsHtml}</div>`;
    }

    const cards = qsa('#modelsContainer [data-card]');
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

    const modelCards = qsa('#modelsContainer .card');
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

async function renderGallery() {
  const grid = qs('#galleryGrid');
  if (!grid) return;

  try {
    const data = await client.fetch(qGallery);
    console.info("[CMS] gallery fetched:", data);
    if (!data || !data.length) {
      grid.innerHTML = `<p class="small">まだ作品がありません。</p>`;
      return;
    }

    grid.innerHTML = data.map(item => {
      if (item.itemType === 'video') {
        return `
          <a href="${item.videoUrl}" class="gallery-item video-item" data-type="video">
            <video muted playsinline loop autoplay src="${item.videoUrl}#t=0.1" loading="lazy"></video>
            <div class="play-icon">▶</div>
          </a>
        `;
      }
      return `
        <a href="${item.imageUrl}" class="gallery-item" data-type="image">
          <img src="${item.imageUrl}" alt="${item.caption || 'ギャラリー画像'}" loading="lazy">
        </a>
      `;
    }).join('');

    const lightbox = qs('#lightbox');
    const lightboxContent = qs('#lightboxContent');
    const lightboxClose = qs('#lightboxClose');

    if (!lightbox) return;

    grid.addEventListener('click', e => {
      e.preventDefault();
      const link = e.target.closest('.gallery-item');
      if (link) {
        const type = link.dataset.type;
        const url = link.href;
        
        lightboxContent.innerHTML = '';

        if (type === 'video') {
          const video = document.createElement('video');
          video.src = url;
          video.controls = true;
          video.autoplay = true;
          lightboxContent.appendChild(video);
        } else {
          const img = document.createElement('img');
          img.src = url;
          lightboxContent.appendChild(img);
        }
        
        lightbox.style.display = 'flex';
      }
    });

    const closeLightbox = () => {
      lightbox.style.display = 'none';
      lightboxContent.innerHTML = '';
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

// ===== 実行 =====
(async () => {
  await Promise.all([renderModels(), renderNews(), renderGallery()]);
})();
