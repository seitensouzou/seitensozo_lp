// cms.js (ES Module版)

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

// (ここから下のコードは、関数定義や実行部分など、これまでと同じです)
// ...

// ===== GROQ =====
const qModels = `*[_type == "model"]|order(order asc){_id, name, role, profile, youtubeUrl, links, "imageUrl": coalesce(imageUrl, image.asset->url, "")}`;
const qNews = `*[_type == "news"]|order(date desc){_id,title,body,tag,date}`;
const qServices = `*[_type == "service"]|order(order asc){_id,title,summary,detail,icon}`;


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
    // 以下、モデルを描画するHTML生成ロジック...
    // (ここでは省略しますが、あなたの元のコードをそのまま使えます)
    wrap.innerHTML = "モデルのデータを描画中...";
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
            <div class="news-date small">${(n.date||"").replaceAll("-",".")}</div>
            <div class="news-main">
              <div class="news-title">${n.title}</div>
              <div class="badges mt-2">${
                (n.tag||"").toLowerCase()==="press"    ? '<span class="badge press">PRESS</span>' :
                (n.tag||"").toLowerCase()==="music"    ? '<span class="badge music">MUSIC</span>' :
                (n.tag||"").toLowerCase()==="project" ? '<span class="badge project">PROJECT</span>' :
                n.tag ? `<span class="badge press">${String(n.tag).toUpperCase()}</span>` : ""
              }</div>
            </div>
            <span class="news-toggle">＋</span>
          </button>
          <div class="news-panel small">${safeBR(n.body)}</div>
        </article>
      `;
    }).join("");
    // (Accordion logic can be added here if needed)
  } catch (e) {
    console.error("[CMS] news fetch error:", e);
    list.innerHTML = "<p class='small' style='color:#b91c1c'>お知らせの読み込みに失敗しました。</p>";
  }
}

async function renderServices() {
    const grid = qs("#servicesGrid");
    if(!grid) return;
    try {
        const data = await client.fetch(qServices);
        console.info("[CMS] services fetched:", data?.length);
        if(!data?.length){ grid.innerHTML=""; return; }
        // 以下、サービスを描画するHTML生成ロジック...
        grid.innerHTML = "サービスデータを描画中...";
    } catch (e) { console.error("[CMS] services fetch error:", e); }
}

// ===== 実行 =====
(async () => {
  await Promise.all([renderModels(), renderServices(), renderNews()]);
})();
