(function () {
  'use strict';

  // Sanity ClientはHTMLで直接読み込むので、グローバル変数の `SanityClient` を使う
  const { createClient } = window.SanityClient;

  // ====== 設定 ======
  const SANITY = {
    projectId: "9iu2dx4s",
    dataset: "production",
    apiVersion: "2023-10-01", // 日付は文字列として保持
    useCdn: true,
  };
  const client = createClient(SANITY);
  console.info("[CMS] Sanity client initialized");

  // ===== ヘルパー =====
  const safeBR = (t = "") => String(t || "").replace(/\n/g, "  
");

  function extractYouTubeId(url = "") {
    if (!url) return "";
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
      return (links || []).map(link => {
          const service = serviceMap[link.service];
          if (!service) return '';
          return `<a class="pill" style="background:${service.color}" href="${link.url}" target="_blank" rel="noopener">${service.label}</a>`;
      }).join('');
  }

  // ===== GROQ クエリ =====
  const qModels = `*[_type == "model"]|order(order asc){_id, name, role, coverType, "imageUrl": coverImage.asset->url, "videoUrl": coverVideo.asset->url, youtube, sections, streams}`;
  const qNews = `*[_type == "news"]|order(date desc){_id,title,body,tag,date}`;
  const qGallery = `*[_type == "galleryItem"]|order(order asc){ itemType, "imageUrl": image.asset->url, "videoUrl": videoFile.asset->url, caption }`;
  const qCF = `*[_type == "cfSettings"][0]`;

  // ===== レンダリング関数 =====

  async function renderModels() {
    const container = qs('#modelsContainer');
    if (!container) return;
    try {
      const data = await client.fetch(qModels);
      if (!data || !data.length) {
        container.innerHTML = `<p class="small" style="color:#6b7280">公開済みのモデルはまだありません。</p>`;
        return;
      }

      const cardsHtml = data.map(m => {
        const coverElement = (m.coverType === 'video' && m.videoUrl)
          ? `<video src="${m.videoUrl}" muted loop playsinline class="cover"></video>`
          : `<img src="${m.imageUrl || 'https://placehold.co/800x1000/E0E0E0/333?text=MODEL'}" alt="${m.name || ''}" class="cover">`;

        const yt = extractYouTubeId(m.youtube || "" );
        const sectionsHtml = (m.sections || []).map(s => `<div class="carded"><h5>${s.title || ''}</h5><p>${safeBR(s.body || '')}</p></div>`).join("");
        const streamsHtml = linksToPillsHtml(m.streams);
        const ytHtml = yt ? `<div class="yt mt-2"><iframe width="100%" height="260" src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="${m.name} YouTube" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>` : "";

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
                  <div>
                    <div class="font-serif" style="font-size:20px">${m.name || ''}</div>
                    <p class="small">${m.role || ""}</p>
                  </div>
                  <div class="profile grid">${sectionsHtml}</div>
                  ${ytHtml}
                  <div class="streams mt-4">${streamsHtml}</div>
                </div>
              </div>
            </div>
          </article>`;
        
        if (data.length >= 4 ) {
          return `<div class="swiper-slide">${cardContentHtml}</div>`;
        } else {
          return cardContentHtml;
        }
      }).join("");

      if (data.length >= 4) {
        container.innerHTML = `<div class="swiper models-swiper"><div id="modelsCards" class="swiper-wrapper">${cardsHtml}</div><div class="swiper-button-prev"></div><div class="swiper-button-next"></div></div>`;
        new Swiper('.models-swiper', {
          loop: true, slidesPerView: 3, spaceBetween: 30, centeredSlides: true,
          navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
          breakpoints: { 320: { slidesPerView: 1, spaceBetween: 20 }, 861: { slidesPerView: 3, spaceBetween: 30 } }
        });
      } else {
        container.innerHTML = `<div id="modelsCards" class="models-grid">${cardsHtml}</div>`;
      }

      const cards = qsa('#modelsContainer [data-card]');
      cards.forEach(card => {
        const openBtn = card.querySelector('.openbtn');
        const closeBtn = card.querySelector('.close');
        const closeAll = (except) => cards.forEach(c => { if (c !== except) c.classList.remove('open'); });
        
        openBtn?.addEventListener('click', () => {
          const isOpen = card.classList.contains('open');
          closeAll(card);
          if (!isOpen) card.classList.add('open');
        });
        closeBtn?.addEventListener('click', () => card.classList.remove('open'));
      });

      qsa('#modelsContainer .card').forEach(card => {
        const video = card.querySelector('video.cover');
        if (video) {
          card.addEventListener('mouseenter', () => video.play());
          card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
        }
      });
    } catch (err) { console.error("[CMS] models fetch error:", err); container.innerHTML = `<p class="small" style="color:#b91c1c">モデルの読み込みに失敗しました。</p>`; }
  }

  async function renderNews() {
    const list = qs("#newsList");
    if (!list) return;
    try {
      const data = await client.fetch(qNews);
      if (!data?.length) { list.innerHTML = "<p class='small' style='color:#6b7280'>お知らせはまだありません。</p>"; return; }
      list.innerHTML = data.map(n => {
        const tagHtml = (n.tag || "").toLowerCase() === "press" ? '<span class="badge press">PRESS</span>' :
                        (n.tag || "").toLowerCase() === "music" ? '<span class="badge music">MUSIC</span>' :
                        (n.tag || "").toLowerCase() === "project" ? '<span class="badge project">PROJECT</span>' :
                        n.tag ? `<span class="badge press">${String(n.tag).toUpperCase()}</span>` : "";
        return `<article class="news"><button class="news-head" aria-expanded="false"><div class="news-date small">${(n.date || "").split('T')[0].replaceAll("-", ".")}</div><div class="news-main"><div class="news-title">${n.title}</div><div class="badges mt-2">${tagHtml}</div></div><span class="news-toggle">＋</span></button><div class="news-panel small">${safeBR(n.body)}</div></article>`;
      }).join("");
      qsa("#newsList .news").forEach(n => {
        const head = n.querySelector(".news-head"), t = n.querySelector(".news-toggle");
        head.addEventListener("click", () => { n.classList.toggle("open"); head.setAttribute("aria-expanded", n.classList.contains("open")); t.textContent = n.classList.contains("open") ? "×" : "＋"; });
      });
    } catch (e) { console.error("[CMS] news fetch error:", e); list.innerHTML = "<p class='small' style='color:#b91c1c'>お知らせの読み込みに失敗しました。</p>"; }
  }

  async function renderGallery() {
    const grid = qs('#galleryGrid');
    if (!grid) return;
    try {
      const data = await client.fetch(qGallery);
      if (!data || !data.length) { grid.innerHTML = `<p class="small">まだ作品がありません。</p>`; return; }
      grid.innerHTML = data.map(item => item.itemType === 'video' ? `<a href="${item.videoUrl}" class="gallery-item video-item" data-type="video"><video muted playsinline loop autoplay src="${item.videoUrl}#t=0.1" loading="lazy"></video><div class="play-icon">▶</div></a>` : `<a href="${item.imageUrl}" class="gallery-item" data-type="image"><img src="${item.imageUrl}" alt="${item.caption || 'ギャラリー画像'}" loading="lazy"></a>`).join('');
      const lightbox = qs('#lightbox'), lightboxContent = qs('#lightboxContent'), lightboxClose = qs('#lightboxClose');
      if (!lightbox) return;
      const closeLightbox = () => { lightbox.style.display = 'none'; lightboxContent.innerHTML = ''; };
      grid.addEventListener('click', e => {
        e.preventDefault();
        const link = e.target.closest('.gallery-item');
        if (link) {
          const type = link.dataset.type, url = link.href;
          lightboxContent.innerHTML = '';
          if (type === 'video') { const video = document.createElement('video'); video.src = url; video.controls = true; video.autoplay = true; lightboxContent.appendChild(video); }
          else { const img = document.createElement('img'); img.src = url; lightboxContent.appendChild(img); }
          lightbox.style.display = 'flex';
        }
      });
      lightboxClose.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    } catch (err) { console.error("[CMS] gallery fetch error:", err); grid.innerHTML = `<p class="small" style="color:#b91c1c">ギャラリーの読み込みに失敗しました。</p>`; }
  }

  async function renderCF() {
    const cfSection = qs(".cf");
    if (!cfSection) return;
    const dd = qs("#dd"), hh = qs("#hh"), mm = qs("#mm"), ss = qs("#ss");
    const nowEl = qs("#cfNow"), tgtEl = qs("#cfTarget"), supEl = qs("#cfSupporters"), bar = qs("#cfBar");
    try {
      const data = await client.fetch(qCF);
      if (!data) { cfSection.style.display = "none"; return; }
      const { currentAmount, targetAmount, endDate, supporterCount } = data;
      const targetDate = new Date(endDate);
      nowEl.textContent = "¥" + (currentAmount || 0).toLocaleString();
      tgtEl.textContent = "¥" + (targetAmount || 0).toLocaleString();
      supEl.textContent = (supporterCount || 0) + "人";
      requestAnimationFrame(() => {
        const percentage = Math.min(100, ((currentAmount || 0) / (targetAmount || 1)) * 100);
        bar.style.width = percentage + "%";
        bar.style.transition = "width 1.2s cubic-bezier(.2,.7,0,1)";
      });
      const timerInterval = setInterval(() => {
        const d = +targetDate - +new Date();
        const Z = n => String(n).padStart(2, "0");
        if (d > 0) {
          dd.textContent = Z(Math.floor(d / 86400000));
          hh.textContent = Z(Math.floor(d / 3600000) % 24);
          mm.textContent = Z(Math.floor(d / 60000) % 60);
          ss.textContent = Z(Math.floor(d / 1000) % 60);
        } else {
          dd.textContent = hh.textContent = mm.textContent = ss.textContent = "00";
          clearInterval(timerInterval);
        }
      }, 1000);
    } catch (err) { console.error("CFデータの読み込みに失敗しました:", err); cfSection.style.display = "none"; }
  }

  // ===== 実行 =====
  // すべてのレンダリング処理を並行して実行
  Promise.allSettled([
    renderModels(),
    renderNews(),
    renderGallery(),
    renderCF()
  ]);

})();


