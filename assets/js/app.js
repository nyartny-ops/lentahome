/* Дом Лента · лендинг с блогерами. Чистый JS, без сборки и бэкенда. */
(() => {
  "use strict";
  document.documentElement.classList.remove("no-js");

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { PRODUCTS, STAGES, AUTHORS, SITE } = window;
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const stageLabel = Object.fromEntries(STAGES.map((s) => [s.id, s.label]));
  const fmt = (n) => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " " + SITE.currency;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- Store (список) ---------------- */
  const KEY = "domlenta-kit-v1";
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* приватный режим */ } };
  const listeners = [];
  const emit = () => { save(); listeners.forEach((fn) => fn()); };
  const has = (id) => (cart[id] || 0) > 0;
  const add = (id, q) => { cart[id] = (cart[id] || 0) + (q || byId[id].qty || 1); emit(); };
  const setQty = (id, q) => { if (q <= 0) delete cart[id]; else cart[id] = q; emit(); };
  const toggle = (id) => { if (has(id)) setQty(id, 0); else add(id); };
  const totals = () => Object.entries(cart).reduce((a, [id, q]) => { if (byId[id]) { a.sum += byId[id].price * q; a.n += 1; } return a; }, { sum: 0, n: 0 });

  /* ---------------- Toast ---------------- */
  const toastEl = $("[data-toast]");
  let toastT;
  const toast = (msg) => {
    toastEl.innerHTML = `<i class="ph-fill ph-check-circle" aria-hidden="true"></i>${esc(msg)}`;
    toastEl.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  };

  /* ---------------- Nav ---------------- */
  const nav = $(".nav");
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;height:8px;width:1px";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);

  const navLinks = $$(".nav__links a");
  const sections = navLinks.map((a) => $(a.getAttribute("href")));
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => s && navIO.observe(s));

  /* ---------------- Reveal ---------------- */
  const revIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); revIO.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".reveal").forEach((el) => {
    const sib = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--d", sib.indexOf(el));
    revIO.observe(el);
  });

  /* ---------------- Story: этапы и прогресс ---------------- */
  const steps = $$("[data-step]");
  const railLinks = $$("[data-step-link]");
  const bar = $("[data-rail-bar]");
  const stepIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const idx = steps.indexOf(e.target);
      railLinks.forEach((a, i) => {
        a.classList.toggle("is-active", i === idx);
        a.classList.toggle("is-done", i < idx);
      });
      if (bar) bar.style.setProperty("--p", ((idx + 1) / steps.length).toFixed(3));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  steps.forEach((s) => stepIO.observe(s));

  // Товары этапа внутри истории
  $$("[data-used]").forEach((box) => {
    const stage = box.dataset.used;
    const items = PRODUCTS.filter((p) => p.stage === stage);
    box.innerHTML = `
      <div class="used__title">Что понадобилось</div>
      <div class="chips">${items.map((p) => `
        <button class="chip" type="button" data-chip="${p.id}" aria-pressed="false">
          <i class="ph ${p.icon}" aria-hidden="true"></i>${esc(p.name)}
        </button>`).join("")}</div>
      <button class="used__all" type="button" data-add-stage="${stage}">Добавить этап в список</button>`;
  });
  document.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-chip]");
    if (chip) {
      const id = chip.dataset.chip;
      const was = has(id);
      toggle(id);
      toast(was ? "Убрано из списка" : "Добавлено в список");
      return;
    }
    const st = e.target.closest("[data-add-stage]");
    if (st) {
      PRODUCTS.filter((p) => p.stage === st.dataset.addStage && !has(p.id)).forEach((p) => (cart[p.id] = p.qty));
      emit();
      toast(`Этап «${stageLabel[st.dataset.addStage]}» в списке`);
    }
  });

  // Счётчики результата
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const to = +e.target.dataset.count;
      if (reduce) return;
      const t0 = performance.now(), dur = 1100;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        e.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      e.target.textContent = "0";
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------------- Kit: вкладки и товары ---------------- */
  const tabsEl = $("[data-tabs]");
  const prodEl = $("[data-products]");
  let activeStage = "all";

  tabsEl.innerHTML = STAGES.map((s) => {
    const n = s.id === "all" ? PRODUCTS.length : PRODUCTS.filter((p) => p.stage === s.id).length;
    return `<button class="tab" role="tab" type="button" id="tab-${s.id}" aria-selected="${s.id === activeStage}" aria-controls="products" data-tab="${s.id}">
      <i class="ph ${s.icon}" aria-hidden="true"></i>${esc(s.label)} <small>${n}</small></button>`;
  }).join("");
  prodEl.id = "products";
  prodEl.setAttribute("role", "tabpanel");

  const renderProducts = () => {
    const list = activeStage === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.stage === activeStage);
    prodEl.setAttribute("aria-labelledby", "tab-" + activeStage);
    prodEl.innerHTML = list.map((p, i) => `
      <article class="prod ${has(p.id) ? "is-in" : ""}" style="--i:${i}" data-prod="${p.id}">
        <div class="prod__icon"><i class="ph ${p.icon}" aria-hidden="true"></i></div>
        <div class="prod__stage">${esc(stageLabel[p.stage])}</div>
        <h4>${esc(p.name)}</h4>
        <p>${esc(p.spec)}</p>
        <div class="prod__foot">
          <div class="prod__price">${fmt(p.price)} <small>/ ${esc(p.unit)}</small></div>
          <button class="add" type="button" data-add="${p.id}" aria-pressed="${has(p.id)}" aria-label="${has(p.id) ? "Убрать из списка" : "Добавить в список"}: ${esc(p.name)}">
            ${has(p.id) ? '<i class="ph ph-check" aria-hidden="true"></i>В списке' : '<i class="ph ph-plus" aria-hidden="true"></i>'}
          </button>
        </div>
      </article>`).join("");
  };
  const syncProducts = () => {
    $$("[data-prod]", prodEl).forEach((card) => {
      const id = card.dataset.prod, inn = has(id);
      card.classList.toggle("is-in", inn);
      const b = $("[data-add]", card);
      b.setAttribute("aria-pressed", inn);
      b.setAttribute("aria-label", `${inn ? "Убрать из списка" : "Добавить в список"}: ${byId[id].name}`);
      b.innerHTML = inn ? '<i class="ph ph-check" aria-hidden="true"></i>В списке' : '<i class="ph ph-plus" aria-hidden="true"></i>';
    });
  };

  tabsEl.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (!t || t.dataset.tab === activeStage) return;
    activeStage = t.dataset.tab;
    $$("[data-tab]", tabsEl).forEach((b) => b.setAttribute("aria-selected", b === t));
    t.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
    renderProducts();
  });
  tabsEl.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const tabs = $$("[data-tab]", tabsEl);
    const i = tabs.findIndex((b) => b.getAttribute("aria-selected") === "true");
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    n.focus(); n.click();
  });
  prodEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const was = has(b.dataset.add);
    toggle(b.dataset.add);
    toast(was ? "Убрано из списка" : "Добавлено в список");
  });
  renderProducts();

  /* ---------------- Cart ---------------- */
  const itemsEl = $("[data-cart-items]");
  const emptyEl = $("[data-cart-empty]");
  const footEl = $("[data-cart-foot]");
  const totalEl = $("[data-cart-total]");
  const countEls = $$("[data-list-count]");
  const fab = $(".cart-fab");
  const fabTotal = $("[data-fab-total]");
  $("[data-catalog]").href = SITE.catalogUrl;
  $("[data-catalog]").target = "_blank";
  $("[data-catalog]").rel = "noopener";

  let prevN = -1;
  const renderCart = () => {
    const ids = PRODUCTS.map((p) => p.id).filter(has);
    const { sum, n } = totals();
    itemsEl.innerHTML = ids.map((id) => {
      const p = byId[id], q = cart[id];
      return `<li class="ci">
        <div class="ci__name">${esc(p.name)}</div>
        <div class="ci__sum">${fmt(p.price * q)}</div>
        <div class="ci__ctrl">
          <button class="qty" type="button" data-dec="${id}" aria-label="Меньше"><i class="ph ph-minus"></i></button>
          <span class="ci__q">${q} ${esc(p.unit)}</span>
          <button class="qty" type="button" data-inc="${id}" aria-label="Больше"><i class="ph ph-plus"></i></button>
          <button class="ci__rm" type="button" data-rm="${id}">Убрать</button>
        </div>
      </li>`;
    }).join("");
    emptyEl.hidden = n > 0;
    footEl.hidden = n === 0;
    totalEl.textContent = fmt(sum);
    countEls.forEach((c) => {
      c.textContent = n;
      if (prevN !== -1 && n !== prevN && !reduce) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
    });
    prevN = n;
    fabTotal.textContent = n ? fmt(sum) : "";
    $("[data-fab-label]").textContent = n ? `Список · ${n}` : "Мой список";
    $$("[data-chip]").forEach((c) => {
      const inn = has(c.dataset.chip);
      c.classList.toggle("is-in", inn);
      c.setAttribute("aria-pressed", inn);
      $("i", c).className = `ph ${inn ? "ph-check" : byId[c.dataset.chip].icon}`;
    });
  };
  listeners.push(renderCart, syncProducts);

  itemsEl.addEventListener("click", (e) => {
    const d = e.target.closest("[data-dec]"), i = e.target.closest("[data-inc]"), r = e.target.closest("[data-rm]");
    if (d) setQty(d.dataset.dec, cart[d.dataset.dec] - 1);
    if (i) setQty(i.dataset.inc, cart[i.dataset.inc] + 1);
    if (r) setQty(r.dataset.rm, 0);
  });
  $("[data-add-all]").addEventListener("click", () => {
    PRODUCTS.forEach((p) => (cart[p.id] = p.qty));
    emit();
    toast("Набор Артёма в списке");
  });
  $("[data-clear]").addEventListener("click", () => { cart = {}; emit(); toast("Список очищен"); });
  $("[data-copy]").addEventListener("click", async () => {
    const { sum } = totals();
    const lines = PRODUCTS.filter((p) => has(p.id)).map((p) => `• ${p.name} (${p.spec}): ${cart[p.id]} ${p.unit}, ${fmt(p.price * cart[p.id])}`);
    const text = `Список Дом Лента: новый пол\n\n${lines.join("\n")}\n\nИтого: ${fmt(sum)}`;
    try { await navigator.clipboard.writeText(text); toast("Список скопирован"); }
    catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand("copy"); toast("Список скопирован"); } catch (e2) { toast("Не удалось скопировать"); }
      ta.remove();
    }
  });

  // Мобильная шторка списка
  const cartEl = $("[data-cart]");
  const scrim = $("[data-scrim]");
  const mobile = matchMedia("(max-width: 1024px)");
  const openList = () => {
    if (!mobile.matches) { $("#kit").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); return; }
    cartEl.classList.add("is-open"); scrim.hidden = false; document.body.style.overflow = "hidden";
    $(".cart__close").focus();
  };
  const closeList = () => { cartEl.classList.remove("is-open"); scrim.hidden = true; document.body.style.overflow = ""; };
  $$("[data-open-list]").forEach((b) => b.addEventListener("click", openList));
  $("[data-close-list]").addEventListener("click", closeList);
  scrim.addEventListener("click", closeList);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeList(); });
  mobile.addEventListener("change", closeList);

  // FAB виден, когда секция подборки или история на экране
  const fabIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.target._vis = e.isIntersecting));
    fab.classList.toggle("is-visible", $$("#story,#kit").some((s) => s._vis));
  }, { threshold: 0 });
  $$("#story,#kit").forEach((s) => fabIO.observe(s));

  /* ---------------- Authors ---------------- */
  const aTabs = $("[data-author-tabs]");
  const aBox = $("[data-author]");
  let activeAuthor = AUTHORS[0].key;
  aTabs.innerHTML = AUTHORS.map((a) => `
    <button class="atab" role="tab" type="button" aria-selected="${a.key === activeAuthor}" data-atab="${a.key}">
      <img src="${a.photo}" alt="" width="40" height="40" loading="lazy">${esc(a.tab)}
    </button>`).join("");

  const renderAuthor = () => {
    const a = AUTHORS.find((x) => x.key === activeAuthor);
    aBox.innerHTML = `
      <div class="author__photo"><img src="${a.photo}" alt="${esc(a.name)}" loading="lazy"></div>
      <div class="author__body">
        <div class="author__meta">
          <span>${esc(a.role)}</span>
          <span><i class="ph ${a.platform.icon}" aria-hidden="true"></i>${esc(a.platform.label)}</span>
          <span>${esc(a.reach)}</span>
        </div>
        <h3 class="author__name">${esc(a.name)}</h3>
        <p class="author__task">${esc(a.task)}</p>
        <p class="author__quote">${esc(a.quote)}</p>
        <ol class="tips">${a.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
        <div class="author__kit">
          <div class="used__title">Что взял в Дом Лента</div>
          <div class="tagline">${a.kit.map((k) => `<span>${esc(k)}</span>`).join("")}</div>
        </div>
        <div class="author__cta"><a class="btn btn--line" href="${a.link}">${esc(a.linkLabel)} <i class="ph ph-arrow-right" aria-hidden="true"></i></a></div>
      </div>`;
  };
  const setAuthor = (key) => {
    activeAuthor = key;
    $$("[data-atab]", aTabs).forEach((b) => b.setAttribute("aria-selected", b.dataset.atab === key));
    renderAuthor();
  };
  aTabs.addEventListener("click", (e) => {
    const b = e.target.closest("[data-atab]");
    if (b && b.dataset.atab !== activeAuthor) setAuthor(b.dataset.atab);
  });
  $$("[data-goto-author]").forEach((t) => t.addEventListener("click", () => setAuthor(t.dataset.gotoAuthor)));
  renderAuthor();

  // Заглушки соцсетей в макете
  $$('.ugc__social a[href="#"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast("Ссылка появится после запуска"); }));

  renderCart();
})();
