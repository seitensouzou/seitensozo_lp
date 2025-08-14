// app.js (ES Module版)

// 他ファイルで使えるように関数をエクスポートする
export const qs = (s, sc = document) => sc.querySelector(s);
export const qsa = (s, sc = document) => [...sc.querySelectorAll(s)];

/* ===== Mobile menu ===== */
(() => {
  const body = document.body,
    h = qs("#hamb"),
    mask = qs("#mmask"),
    nav = qs("#mnav"),
    x = qs("#mclose");
  const open = () => {
    body.classList.add("menu-open");
    mask.hidden = false;
    nav.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden";
  };
  const close = () => {
    body.classList.remove("menu-open");
    mask.hidden = true;
    nav.setAttribute("aria-hidden", "true");
    body.style.overflow = "auto";
  };
  h?.addEventListener("click", open);
  x?.addEventListener("click", close);
  mask?.addEventListener("click", close);
  qsa(".mlink").forEach(a => a.addEventListener("click", close));
  matchMedia("(min-width:768px)").addEventListener?.("change", e => {
    if (e.matches) close();
  });
})();

/* ===== CF counter & progress ===== */
(() => {
  const targetDate = new Date("2025-09-28T23:59:59");
  const dd = qs("#dd"),
    hh = qs("#hh"),
    mm = qs("#mm"),
    ss = qs("#ss"),
    nowEl = qs("#cfNow"),
    tgtEl = qs("#cfTarget"),
    bar = qs("#cfBar");
  if (!dd) return; // 要素がなければ何もしない
  const current = 325000,
    target = 10000000;
  nowEl.textContent = "¥" + current.toLocaleString();
  tgtEl.textContent = "¥" + target.toLocaleString();
  requestAnimationFrame(() => {
    bar.style.width = Math.min(100, (current / target) * 100) + "%";
    bar.style.transition = "width 1.2s cubic-bezier(.2,.7,0,1)";
  });
  function tick() {
    const d = +targetDate - +new Date(),
      Z = n => String(n).padStart(2, "0");
    if (d > 0) {
      dd.textContent = Z(Math.floor(d / 86400000));
      hh.textContent = Z(Math.floor(d / 3600000) % 24);
      mm.textContent = Z(Math.floor(d / 60000) % 60);
      ss.textContent = Z(Math.floor(d / 1000) % 60);
    } else {
      dd.textContent = hh.textContent = mm.textContent = ss.textContent = "00";
    }
  }
  tick();
  setInterval(tick, 1000);
})();

/* ===== Philosophy accordion ===== */
(() => {
  const acc = qs("#acc-phil"),
    btn = acc?.querySelector(".plus");
  btn?.addEventListener("click", () => {
    acc.classList.toggle("open");
    btn.setAttribute("aria-expanded", acc.classList.contains("open"));
  });
})();

/* ===== Footer year ===== */
const yearEl = qs("#year");
if(yearEl) yearEl.textContent = new Date().getFullYear();

/* ===== Modal (Privacy / Terms) ===== */
(() => {
  const body = document.body,
    mask = qs("#modalMask"),
    modal = qs("#modal"),
    title = qs("#modalTitle"),
    content = qs("#modalBody"),
    close = qs("#modalClose");
  const openPrivacy = qs("#openPrivacy");
  const openTerms = qs("#openTerms");

  if (!mask) return; // 要素がなければ何もしない

  const open = (t, html) => {
    title.textContent = t;
    content.innerHTML = html;
    mask.hidden = false;
    body.classList.add("modal-open");
    modal.setAttribute("aria-hidden", "false");
    body.style.overflow = "hidden";
  };
  const hide = () => {
    mask.hidden = true;
    body.classList.remove("modal-open");
    modal.setAttribute("aria-hidden", "true");
    body.style.overflow = "auto";
  };
  openPrivacy?.addEventListener("click", e => {
    e.preventDefault();
    open("Privacy Policy",
      `<p>当サイトでは、お問い合わせ対応およびサービス提供のために必要な範囲で個人情報を取得・利用します。法令に基づく場合を除き、本人の同意なく第三者提供は行いません。</p>
        <p>Cookie等によるアクセス解析は現時点では行っていません。将来的に導入する場合は本ポリシーを更新します。</p>
        <p>開示・訂正・削除のご請求はお問い合わせフォームよりご連絡ください。</p>`);
  });
  openTerms?.addEventListener("click", e => {
    e.preventDefault();
    open("Terms of Service",
      `<p>本サイトの情報は現状有姿で提供され、正確性や完全性を保証しません。利用により生じたいかなる損害についても責任を負いません。</p>
        <p>コンテンツの著作権は特段の明示がない限り晴天想造ENTERTAINMENT.に帰属します。</p>
        <p>外部サービスの利用には各サービスの規約が適用されます。</p>`);
  });
  mask.addEventListener("click", hide);
  close.addEventListener("click", hide);
  window.addEventListener("keydown", e => {
    if (e.key === "Escape") hide();
  });
})();
