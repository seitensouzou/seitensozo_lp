// cms.js (最終修正版・合図を待つバージョン)
window.cms = {
  init: function() {
    // ====== 設定 ======
    const SANITY = {
      projectId: "9iu2dx4s",
      dataset:   "production",
      apiVersion:"2023-10-01",
      token:     undefined,
      useCdn:    true,
    };

    // UMDが無ければ終了
    if (!window.sanityClient || !window.sanityClient.createClient) {
      console.error("[CMS] Sanity UMD が読み込まれていません。");
      return;
    }
    const client = window.sanityClient.createClient(SANITY);
    console.info("[CMS] client init successful", SANITY.projectId);

    // ===== ヘルパー =====
    const safeBR = (t="") => String(t||"").replace(/\n/g,"<br>");

    function extractYouTubeId(url="") {
      try {
        const u = new URL(url);
        if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
        if (u.searchParams.get("v")) return u.searchParams.get("v");
        const m = u.pathname.match(/\/embed\/([^?/]+)/);
        return m ? m[1] : "";
      } catch { return ""; }
    }

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
      for (const line of lines){
        const hit = labels.find(l => l.re.test(line));
        if (hit){
          current = hit.key;
          const body = line.replace(hit.re,'').trim();
          if (body) map[current] += (map[current]?'\n':'') + body;
          continue;
        }
        if (current) map[current] += (map[current]?'\n':'') + line;
        else map.音楽性 += (map.音楽性?'\n':'') + line;
      }
      return [
        {title:'音楽性', body:map.音楽性},
        {title:'テーマ', body:map.テーマ},
        {title:'スタイル', body:map.スタイル},
        {title:'パーソナリティ', body:map.パーソナリティ},
      ].filter(x=>x.body && x.body.trim());
    }

    function linksToPillsHtml(links={}){
      const defs = [
        {key:'spotify',     label:'Spotify',      color:'#1DB954'},
        {key:'applemusic',  label:'Apple Music',  color:'#FA2D48'},
        {key:'deezer',      label:'Deezer',       color:'#FF1F1F'},
        {key:'amazonmusic', label:'Amazon Music', color:'#146EB4'},
      ];
      const pills = defs.filter(d=>links[d.key]).map(d =>
        `<a class="pill" style="background:${d.color}" href="${links[d.key]}" target="_blank" rel="noopener">${d.label}</a>`
      ).join('');
      return pills ? `<div class="streams mt-4">${pills}</div>` : '';
    }

    // ===== GROQ =====
    const qModels = `*[_type == "model"]|order(order asc){_id, name, role, profile, youtubeUrl, links, "imageUrl": coalesce(imageUrl, image.asset->url, "")}`;
    const qNews = `*[_type == "news"]|order(date desc){_id,title,body,tag,date}`;
    const qServices = `*[_type == "service"]|order(order asc){_id,title,summary,detail,icon}`;

    // ===== RENDER FUNCTIONS =====
    async function renderModels(){
      const wrap = qs('#modelsCards');
      if(!wrap) return;
      try {
        const data = await client.fetch(qModels);
        console.info("[CMS] models fetched:", data?.length);
        if(!data || !data.length){
          wrap.innerHTML = `<p class="small" style="color:#6b7280">公開済みのモデルはまだありません。</p>`;
          return;
        }
        wrap.innerHTML = data.map(m=>{
          const cover = m.imageUrl || "https://placehold.co/800x1000/E0E0E0/333?text=MODEL";
          const sections = splitProfileToSections(m.profile || "");
          const yt = extractYouTubeId(m.youtubeUrl || "");
          return `<article class="card flip" data-card> ... </article>`; // (中身は省略)
        }).join("");
      } catch(err){
        console.error("[CMS] models fetch error:", err);
        wrap.innerHTML = `<p class="small" style="color:#b91c1c">モデルの読み込みに失敗しました。</p>`;
      }
    }

    async function renderServices(){
      const grid = qs("#servicesGrid");
      if(!grid) return;
      try {
        const data = await client.fetch(qServices);
        console.info("[CMS] services fetched:", data?.length);
        if(!data?.length){ grid.innerHTML=""; return; }
        grid.innerHTML = data.map(s=>`<div class="svc-item"> ... </div>`).join(""); // (中身は省略)
      } catch (e) { console.error("[CMS] services fetch error:", e); }
    }

    async function renderNews(){
      const list = qs("#newsList");
      if(!list) return;
      try {
        const data = await client.fetch(qNews);
        console.info("[CMS] news fetched:", data?.length);
        if(!data?.length){ list.innerHTML="<p class='small' style='color:#6b7280'>お知らせはまだありません。</p>"; return; }
        list.innerHTML = data.map(n=>{
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
      } catch (e) {
        console.error("[CMS] news fetch error:", e);
        list.innerHTML = "<p class='small' style='color:#b91c1c'>お知らせの読み込みに失敗しました。</p>";
      }
    }

    // ===== 実行 =====
    (async()=>{
      console.log("Running render functions...");
      await Promise.all([renderModels(), renderServices(), renderNews()]);
    })();
  }
};
