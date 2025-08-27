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

/* ===== CF counter & progress (CMS対応版) ===== */
(async () => {
  const cfSection = qs(".cf");
  const dd = qs("#dd"), hh = qs("#hh"), mm = qs("#mm"), ss = qs("#ss");
  const nowEl = qs("#cfNow"), tgtEl = qs("#cfTarget"), supEl = qs("#cfSupporters"), bar = qs("#cfBar");
  
  if (!cfSection) return;

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@sanity/client@6/+esm' );
    const sanityClient = createClient({
      projectId: "9iu2dx4s",
      dataset: "production",
      apiVersion: "2023-10-01",
      useCdn: true,
    });
    const data = await sanityClient.fetch(`*[_type == "cfSettings"][0]`);
    if (!data) {
      console.warn("クラウドファンディング設定が見つかりません。");
      cfSection.style.display = "none";
      return;
    }
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
  } catch (err) {
    console.error("CFデータの読み込みに失敗しました:", err);
    cfSection.style.display = "none";
  }
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

/* ===== Services accordion (Static) - 修正版 ===== */
(() => {
    const grid = qs("#services .grid");
    if (!grid) return;
    grid.addEventListener('click', (e) => {
        const head = e.target.closest('.svc-head');
        if (!head) return;
        
        const item = head.closest('.svc-item');
        if (!item) return;

        const btn = head.querySelector('.svc-toggle');
        
        const open = !item.classList.contains('open');
        item.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
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

  if (!mask) return;

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

/* ===== お問い合わせフォームの非同期送信 ===== */
(() => {
  const form = qs('#contact-form');
  const formStatus = qs('#form-status');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formStatus.textContent = '送信中...';
    formStatus.style.color = '#666';
    const formData = new FormData(form);
    
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        formStatus.textContent = 'ありがとうございます。メッセージは正常に送信されました。';
        formStatus.style.color = '#059669';
        form.reset();
      } else {
        formStatus.textContent = '送信に失敗しました。時間をおいて再度お試しください。';
        formStatus.style.color = '#b91c1c';
      }
    } catch (error) {
      console.error('Form submission error:', error);
      formStatus.textContent = '送信に失敗しました。ネットワーク接続を確認してください。';
      form.style.color = '#b91c1c';
    }
  });
})();

/* ===== マウス追従エフェクト (particles.js) ===== */
if (window.particlesJS) {
  particlesJS("particles-js", {
    "particles": {
      "number": {
        "value": 80,
        "density": {
          "enable": true,
          "value_area": 800
        }
      },
      "color": {
        "value": "#cccccc"
      },
      "shape": {
        "type": "circle",
      },
      "opacity": {
        "value": 0.5,
        "random": false,
      },
      "size": {
        "value": 3,
        "random": true,
      },
      "line_linked": {
        "enable": true,
        "distance": 150,
        "color": "#cccccc",
        "opacity": 0.4,
        "width": 1
      },
      "move": {
        "enable": true,
        "speed": 2,
        "direction": "none",
        "random": false,
        "straight": false,
        "out_mode": "out",
        "bounce": false,
      }
    },
    "interactivity": {
      "detect_on": "canvas",
      "events": {
        "onhover": {
          "enable": true,
          "mode": "repulse"
        },
        "onclick": {
          "enable": true,
          "mode": "push"
        },
        "resize": true
      },
      "modes": {
        "grab": {
          "distance": 140,
          "line_opacity": 1
        },
        "push": {
          "particles_nb": 4
        }
      }
    },
    "retina_detect": true
  });
}

