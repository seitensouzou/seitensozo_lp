// app.js (修正版)

const qs =(s,sc=document)=>sc.querySelector(s);
const qsa=(s,sc=document)=>[...sc.querySelectorAll(s)];

/* ===== Hero fallback image (if poster missing) ===== */
(()=>{
  const hero=qs("#heroImg");
  if(!hero) return;
  setTimeout(()=>{
    if(!hero.complete || hero.naturalWidth===0){
      hero.src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop";
    }
  },800);
  hero.addEventListener("error",()=>hero.src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop");
})();

/* ===== Mobile menu (slide from right, ease-in-out) ===== */
(()=>{
  const body=document.body,h=qs("#hamb"),mask=qs("#mmask"),nav=qs("#mnav"),x=qs("#mclose");
  const open=()=>{ body.classList.add("menu-open"); mask.hidden=false; nav.setAttribute("aria-hidden","false"); body.style.overflow="hidden"; };
  const close=()=>{ body.classList.remove("menu-open"); mask.hidden=true; nav.setAttribute("aria-hidden","true"); body.style.overflow="auto"; };
  h?.addEventListener("click",open);
  x?.addEventListener("click",close);
  mask?.addEventListener("click",close);
  qsa(".mlink").forEach(a=>a.addEventListener("click",close));
  matchMedia("(min-width:768px)").addEventListener?.("change",e=>{if(e.matches) close();});
})();

/* ===== CF counter & progress ===== */
(()=>{
  const targetDate=new Date("2025-09-28T23:59:59");
  const dd=qs("#dd"),hh=qs("#hh"),mm=qs("#mm"),ss=qs("#ss"),
        nowEl=qs("#cfNow"), tgtEl=qs("#cfTarget"), bar=qs("#cfBar");
  const current=325000, target=10000000;
  nowEl.textContent="¥"+current.toLocaleString();
  tgtEl.textContent="¥"+target.toLocaleString();
  requestAnimationFrame(()=>{
    bar.style.width=Math.min(100,(current/target)*100)+"%";
    bar.style.transition="width 1.2s cubic-bezier(.2,.7,0,1)";
  });
  function tick(){
    const d=+targetDate-+new Date(),Z=n=>String(n).padStart(2,"0");
    if(d>0){
      dd.textContent=Z(Math.floor(d/86400000));
      hh.textContent=Z(Math.floor(d/3600000)%24);
      mm.textContent=Z(Math.floor(d/60000)%60);
      ss.textContent=Z(Math.floor(d/1000)%60);
    }else{
      dd.textContent=hh.textContent=mm.textContent=ss.textContent="00";
    }
  }
  tick(); setInterval(tick,1000);
})();

/* ===== Philosophy accordion ===== */
(()=>{
  const acc=qs("#acc-phil"),btn=acc?.querySelector(".plus");
  btn?.addEventListener("click",()=>{
    acc.classList.toggle("open");
    btn.setAttribute("aria-expanded",acc.classList.contains("open"));
  });
})();

/* ===== Services accordion ===== */
/* =========================
    SERVICES（+ ボタンのみで開閉／安定版）
    ========================= */
(() => {
  const grid = document.querySelector('#services .grid');
  if (!grid) return;

  // 古いリスナーを除去：各 .svc-head をクローン置換
  grid.querySelectorAll('.svc-item .svc-head').forEach(head => {
    const clone = head.cloneNode(true);   // 子孫はコピー（イベントはコピーされない）
    head.replaceWith(clone);
  });

  // 初期化（+ の表示/ARIA）
  grid.querySelectorAll('.svc-item').forEach(item => {
    const btn = item.querySelector('.svc-toggle');
    if (btn) {
      btn.type = 'button';
      btn.textContent = '＋';
      btn.setAttribute('aria-expanded','false');
      btn.style.cursor = 'pointer';
    }
    item.classList.remove('open');
  });

  // 委譲クリック：＋ のみ反応
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.svc-toggle');
    if (!btn || !grid.contains(btn)) return;

    e.preventDefault();
    e.stopPropagation();

    const item = btn.closest('.svc-item');
    const open = !item.classList.contains('open');
    item.classList.toggle('open', open);
    btn.textContent = open ? '×' : '＋';
    btn.setAttribute('aria-expanded', String(open));
  }, { passive: true });

  // 見出し（アイコン周辺）をクリックしても反応させない（誤発火防止）
  grid.addEventListener('click', (e) => {
    const head = e.target.closest('.svc-head');
    if (head && !e.target.closest('.svc-toggle')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });
})();
/* =========================
    MODELS（＋/× 安定版・委譲1本）
    ========================= */
(() => {
  const wrap = document.querySelector('#models .cards');
  if (!wrap) return;

  // 既存のボタンに付いている古いリスナーを完全除去
  wrap.querySelectorAll('.openbtn, .close').forEach(el => {
    const clone = el.cloneNode(true);  // イベントはコピーされない
    el.replaceWith(clone);
  });

  const cards = [...wrap.querySelectorAll('[data-card]')];
  const closeAll = (except) =>
    cards.forEach(c => { if (c !== except) c.classList.remove('open'); });

  // 委譲クリック：＋で開く、×で閉じる（他は無視）
  wrap.addEventListener('click', (e) => {
    const openBtn  = e.target.closest('.openbtn');
    const closeBtn = e.target.closest('.close');
    if (!openBtn && !closeBtn) return;

    e.preventDefault();
    e.stopPropagation();

    if (openBtn) {
      const card   = openBtn.closest('[data-card]');
      const wasOpen = card.classList.contains('open');
      closeAll(card);
      if (!wasOpen) card.classList.add('open');
      return;
    }
    if (closeBtn) {
      const card = closeBtn.closest('[data-card]');
      card.classList.remove('open');
      return;
    }
  }, { passive: true });
})();


/* =========================
    NEWS（+ / × の同期／安定版）
    ========================= */
(() => {
  const list = document.querySelector('#news .newslist');
  if (!list) return;

  // 古いリスナーを除去：各 .news-head をクローン置換
  list.querySelectorAll('.news .news-head').forEach(head => {
    const clone = head.cloneNode(true);
    head.replaceWith(clone);
  });

  // 初期化（+ の表示/ARIA）
  list.querySelectorAll('.news').forEach(row => {
    row.classList.remove('open');
    const head = row.querySelector('.news-head');
    const tgl  = row.querySelector('.news-toggle');
    if (head) head.setAttribute('aria-expanded','false');
    if (tgl)  tgl.textContent = '＋';
  });

  // 委譲クリック：行の見出しクリックで開閉
  list.addEventListener('click', (e) => {
    const head = e.target.closest('.news-head');
    if (!head || !list.contains(head)) return;

    e.preventDefault();
    e.stopPropagation();

    const row = head.closest('.news');
    const open = !row.classList.contains('open');
    row.classList.toggle('open', open);
    head.setAttribute('aria-expanded', String(open));
    const t = row.querySelector('.news-toggle');
    if (t) t.textContent = open ? '×' : '＋';
  }, { passive: true });
})();


/* ===== Footer year ===== */
qs("#year").textContent=new Date().getFullYear();

/* ===== Center modal (Privacy / Terms) ===== */
(()=>{
  const body=document.body,mask=qs("#modalMask"),modal=qs("#modal"),title=qs("#modalTitle"),content=qs("#modalBody"),close=qs("#modalClose");
  const open=(t,html)=>{
    title.textContent=t; content.innerHTML=html;
    mask.hidden=false; body.classList.add("modal-open");
    modal.setAttribute("aria-hidden","false"); body.style.overflow="hidden";
  };
  const hide=()=>{
    mask.hidden=true; body.classList.remove("modal-open");
    modal.setAttribute("aria-hidden","true"); body.style.overflow="auto";
  };
  qs("#openPrivacy").addEventListener("click",e=>{
    e.preventDefault();
    open("Privacy Policy",
      `<p>当サイトでは、お問い合わせ対応およびサービス提供のために必要な範囲で個人情報を取得・利用します。法令に基づく場合を除き、本人の同意なく第三者提供は行いません。</p>
       <p>Cookie等によるアクセス解析は現時点では行っていません。将来的に導入する場合は本ポリシーを更新します。</p>
       <p>開示・訂正・削除のご請求はお問い合わせフォームよりご連絡ください。</p>`);
  });
  qs("#openTerms").addEventListener("click",e=>{
    e.preventDefault();
    open("Terms of Service",
      `<p>本サイトの情報は現状有姿で提供され、正確性や完全性を保証しません。利用により生じたいかなる損害についても責任を負いません。</p>
       <p>コンテンツの著作権は特段の明示がない限り晴天想造ENTERTAINMENT.に帰属します。</p>
       <p>外部サービスの利用には各サービスの規約が適用されます。</p>`);
  });
  mask.addEventListener("click",hide);
  close.addEventListener("click",hide);
  window.addEventListener("keydown",e=>{if(e.key==="Escape") hide();});
})();
