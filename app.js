(() => {
  'use strict';

  const menu = window.CAFE_MENU || [];
  const settings = window.CAFE_SETTINGS || { reviewMode: true, whatsappNumber: '' };
  const liveReady = settings.ordersEnabled === true && /^92\d{10}$/.test(settings.whatsappNumber);
  const byId = (id) => document.getElementById(id);
  const money = (amount) => `PKR ${amount.toLocaleString('en-PK')}`;
  const menuList = byId('menu-list');
  const cartDialog = byId('order-dialog');
  const cartItems = byId('cart-items');
  const orderForm = byId('order-form');
  const preview = byId('message-preview');
  const toast = byId('toast');
  const storageKey = 'cafe-and-co-review-cart-v1';
  const categoryLabels = { coffee: 'Coffee & tea', cold: 'Over ice', bakery: 'Something sweet', food: 'A good bite' };
  let activeCategory = 'all';
  let cart = loadCart();
  let toastTimer;

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const clean = {};
      for (const item of menu) {
        const quantity = Number(saved[item.id]);
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 99) clean[item.id] = quantity;
      }
      return clean;
    } catch (_) { return {}; }
  }

  function saveCart() {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch (_) { /* Storage may be disabled. */ }
  }

  function quantityTotal() { return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0); }
  function priceTotal() { return menu.reduce((sum, item) => sum + item.price * (cart[item.id] || 0), 0); }

  function menuCard(item) {
    const row = document.createElement('article');
    row.className = 'product-card';
    row.innerHTML = `<div class="product-photo"><img src="${item.image}" alt="${item.name}" loading="lazy" decoding="async" width="960" height="720"><span class="product-category">${categoryLabels[item.category]}</span><span class="product-count" data-count="${item.id}" ${cart[item.id] ? '' : 'hidden'}>${cart[item.id] || 0} in bag</span></div><div class="product-copy"><h3>${item.name}</h3><p>${item.description}</p><div class="product-bottom"><span class="price">${money(item.price)}</span><button class="product-add" type="button" data-add="${item.id}" aria-label="Add ${item.name} to order">Add to bag <span aria-hidden="true">+</span></button></div></div>`;
    return row;
  }

  function renderMenu(category = activeCategory) {
    activeCategory = category;
    const query = byId('menu-search').value.trim().toLowerCase();
    const matches = menu.filter(item => (category === 'all' || item.category === category) && `${item.name} ${item.description}`.toLowerCase().includes(query));
    menuList.replaceChildren(...matches.map(menuCard));
    byId('menu-empty').hidden = matches.length > 0;
    byId('menu-result-count').textContent = `${matches.length} ${matches.length === 1 ? 'item' : 'items'} to explore`;
    const toolbar = document.querySelector('.menu-toolbar');
    const headerBottom = document.querySelector('.site-header').getBoundingClientRect().bottom;
    if (menuList.getBoundingClientRect().top < headerBottom + toolbar.offsetHeight) {
      window.scrollTo({ top: menuList.getBoundingClientRect().top + window.scrollY - headerBottom - toolbar.offsetHeight - 16, behavior: 'instant' });
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
  }

  function updateBadge() {
    const count = quantityTotal();
    byId('bag-count').textContent = String(count);
    document.querySelectorAll('[data-count]').forEach(badge => { const quantity = cart[badge.dataset.count] || 0; badge.hidden = !quantity; badge.textContent = `${quantity} in bag`; });
    byId('open-cart').setAttribute('aria-label', `Open order bag, ${count} ${count === 1 ? 'item' : 'items'}`);
  }

  function setQuantity(id, quantity) {
    if (!menu.some((item) => item.id === id)) return;
    if (quantity <= 0) delete cart[id];
    else cart[id] = Math.min(99, quantity);
    saveCart();
    updateBadge();
    renderCart();
    preview.hidden = true;
  }

  function renderCart() {
    cartItems.replaceChildren();
    const selected = menu.filter((item) => cart[item.id]);
    byId('empty-cart').hidden = selected.length > 0;
    byId('filled-cart').hidden = selected.length === 0;
    for (const item of selected) {
      const row = document.createElement('div');
      row.className = 'cart-item';
      const copy = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = item.name;
      const unit = document.createElement('p');
      unit.textContent = `${money(item.price)} each`;
      copy.append(title, unit);
      const side = document.createElement('div');
      side.className = 'cart-item-side';
      const subtotal = document.createElement('strong');
      subtotal.textContent = money(item.price * cart[item.id]);
      const controls = document.createElement('div');
      controls.className = 'quantity';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.dataset.quantity = item.id;
      minus.dataset.change = '-1';
      minus.setAttribute('aria-label', `Remove one ${item.name}`);
      const number = document.createElement('span');
      number.textContent = String(cart[item.id]);
      number.setAttribute('aria-label', `${cart[item.id]} ${item.name}`);
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.dataset.quantity = item.id;
      plus.dataset.change = '1';
      plus.setAttribute('aria-label', `Add one ${item.name}`);
      controls.append(minus, number, plus);
      side.append(subtotal, controls);
      const photo = document.createElement('img');
      photo.className = 'cart-thumb'; photo.src = item.image; photo.alt = '';
      row.append(photo, copy, side);
      cartItems.append(row);
    }
    byId('cart-total').textContent = money(priceTotal());
  }

  function openCart() {
    renderCart();
    if (!cartDialog.open) cartDialog.showModal();
    document.body.classList.add('dialog-open');
  }

  function closeCart() {
    cartDialog.close();
    document.body.classList.remove('dialog-open');
  }

  function localMinDateTime() {
    const date = new Date(Date.now() + 30 * 60 * 1000);
    const nextMinute = date.getMinutes() + (date.getSeconds() || date.getMilliseconds() ? 1 : 0);
    date.setMinutes(Math.ceil(nextMinute / 5) * 5, 0, 0);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return local.toISOString().slice(0, 16);
  }

  function updatePickupChoice() {
    const scheduled = orderForm.elements.pickup.value === 'scheduled';
    const row = byId('schedule-row');
    const input = byId('pickup-datetime');
    row.hidden = !scheduled;
    input.required = scheduled;
    input.min = localMinDateTime();
    preview.hidden = true;
  }

  function formatPickupTime(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function makeOrderMessage(details) {
    const selected = menu.filter((item) => cart[item.id]);
    const itemLines = selected.map((item) => `${cart[item.id]} × ${item.name} — ${money(cart[item.id] * item.price)}`);
    const pickup = details.pickup === 'asap' ? 'ASAP' : formatPickupTime(details.datetime);
    const lines = [
      'Hello Café & Co! I would like to request a pickup order:',
      '',
      ...itemLines,
      '',
      `Estimated total: ${money(priceTotal())}`,
      `Name: ${details.name.trim()}`,
      `Phone: ${details.phone.trim()}`,
      `Requested pickup: ${pickup}`
    ];
    if (details.notes.trim()) lines.push(`Notes: ${details.notes.trim()}`);
    lines.push('', 'Please confirm the order and pickup time.');
    return lines.join('\n');
  }

  function readOrderDetails() {
    return {
      name: byId('customer-name').value,
      phone: byId('customer-phone').value,
      pickup: orderForm.elements.pickup.value,
      datetime: byId('pickup-datetime').value,
      notes: byId('order-notes').value
    };
  }

  function updateMessagePreview(event) {
    event.preventDefault();
    if (!quantityTotal()) return;
    updatePickupChoice();
    const details = readOrderDetails();
    if (details.pickup === 'scheduled' && new Date(details.datetime).getTime() < Date.now() + 30 * 60 * 1000) {
      byId('pickup-datetime').setCustomValidity('Choose a time at least 30 minutes from now.');
    } else byId('pickup-datetime').setCustomValidity('');
    if (!orderForm.reportValidity()) return;
    const message = makeOrderMessage(details);
    byId('message-text').textContent = message;
    preview.hidden = false;
    preview.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    const sendButton = preview.querySelector('button');
    if (liveReady) {
      sendButton.disabled = false;
      sendButton.className = 'button button-dark';
      sendButton.textContent = 'Send order on WhatsApp ↗';
      sendButton.onclick = () => window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    }
  }

  menuList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add]');
    if (!button) return;
    const item = menu.find((entry) => entry.id === button.dataset.add);
    setQuantity(item.id, (cart[item.id] || 0) + 1);
    showToast(`${item.name} added to your order`);
  });

  document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach((filter) => {
      const active = filter === button;
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    const category = button.dataset.filter;
    renderMenu(category);
  }));

  byId('menu-search').addEventListener('input', () => renderMenu());
  byId('clear-menu').addEventListener('click', () => { byId('menu-search').value = ''; document.querySelector('[data-filter="all"]').click(); });
  const navToggle = byId('nav-toggle');
  function closeNav() { navToggle.setAttribute('aria-expanded', 'false'); byId('main-nav').classList.remove('is-open'); }
  navToggle.addEventListener('click', () => { const open = navToggle.getAttribute('aria-expanded') !== 'true'; navToggle.setAttribute('aria-expanded', String(open)); byId('main-nav').classList.toggle('is-open', open); });
  byId('main-nav').addEventListener('click', closeNav);
  document.addEventListener('keydown', event => { if(event.key === 'Escape') closeNav(); });

  cartItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-quantity]');
    if (!button) return;
    const id = button.dataset.quantity;
    setQuantity(id, (cart[id] || 0) + Number(button.dataset.change));
  });
  byId('open-cart').addEventListener('click', openCart);
  byId('pickup-order-button').addEventListener('click', openCart);
  byId('close-cart').addEventListener('click', closeCart);
  byId('browse-menu').addEventListener('click', () => { closeCart(); byId('menu').scrollIntoView({ behavior: 'smooth' }); });
  cartDialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  cartDialog.addEventListener('click', (event) => { if (event.target === cartDialog) closeCart(); });
  orderForm.addEventListener('change', (event) => { if (event.target.name === 'pickup') updatePickupChoice(); else preview.hidden = true; });
  orderForm.addEventListener('input', (event) => { if (event.target.id === 'pickup-datetime') event.target.setCustomValidity(''); preview.hidden = true; });
  orderForm.addEventListener('submit', updateMessagePreview);
  byId('year').textContent = String(new Date().getFullYear());
  function initReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((element) => element.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    elements.forEach((element) => observer.observe(element));
  }

  function initHero() {
    const stage = byId('hero-stage');
    const hero = document.querySelector('.hero');
    const video = byId('hero-video');
    const status = byId('hero-status');
    const beats = Array.from(document.querySelectorAll('.hero-beat'));
    let ready = false;
    let target = 0;
    let frame = 0;
    let beatIndex = -1;
    let objectUrl;

    // The owner's requested default is scroll-controlled video on every screen.
    // The final frame coincides with the sticky section release; no extra hold.
    video.pause();
    video.loop = false;
    video.muted = true;
    hero.classList.add('scroll-story');

    function progress() {
      const travel = hero.offsetHeight - stage.offsetHeight;
      const distance = -hero.getBoundingClientRect().top;
      return travel > 0 ? Math.max(0, Math.min(1, distance / travel)) : 0;
    }

    function seek() {
      frame = 0;
      if (!ready || video.seeking || document.hidden) return;
      if (Math.abs(video.currentTime - target) > .012) video.currentTime = target;
    }

    function queueSeek() {
      if (!frame && ready && !document.hidden) frame = requestAnimationFrame(seek);
    }

    function update() {
      const p = progress();
      stage.style.setProperty('--hero-progress', `${Math.round(p * 100)}%`);
      const nextBeat = p < .32 ? 0 : p < .67 ? 1 : 2;
      if (nextBeat !== beatIndex) {
        beatIndex = nextBeat;
        beats.forEach((beat, index) => {
          beat.classList.toggle('active', index === nextBeat);
          beat.setAttribute('aria-hidden', String(index !== nextBeat));
        });
        const counter = stage.querySelector('.hero-scroll > span:last-child');
        if (counter) counter.textContent = `0${nextBeat + 1} / 03`;
      }
      target = p * Math.max(0, (video.duration || 6) - .045);
      queueSeek();
    }

    async function loadVideo() {
      const controller = new AbortController();
      let cleanupDecode = () => {};
      let rejectDecode;
      const timeout = setTimeout(() => {
        controller.abort();
        if (rejectDecode) rejectDecode(new Error('Video loading timed out'));
      }, 20000);
      status.textContent = 'Loading coffee story…';
      try {
        let source = 'assets/hero-video-hq.mp4';
        if (location.protocol !== 'file:') {
          const response = await fetch(source, { signal: controller.signal });
          if (!response.ok) throw new Error('Video unavailable');
          objectUrl = URL.createObjectURL(await response.blob());
          source = objectUrl;
        }
        await new Promise((resolve, reject) => {
          rejectDecode = reject;
          const loaded = () => resolve();
          const failed = () => reject(new Error('Video cannot play'));
          cleanupDecode = () => {
            video.removeEventListener('loadeddata', loaded);
            video.removeEventListener('error', failed);
          };
          video.addEventListener('loadeddata', loaded, { once: true });
          video.addEventListener('error', failed, { once: true });
          video.preload = 'auto';
          video.src = source;
          video.load();
        });
        ready = true;
        stage.classList.add('hero-stage-video');
        status.textContent = '';
        update();
      } catch (_) {
        status.textContent = 'Video unavailable. You can still explore the menu.';
        stage.classList.remove('hero-stage-video');
        hero.classList.add('hero-fallback');
      } finally {
        clearTimeout(timeout);
        cleanupDecode();
      }
    }

    // Only one seek is in flight; if scrolling changes the target, catch up next.
    video.addEventListener('seeked', queueSeek);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else update();
    });
    window.addEventListener('pagehide', (event) => {
      if (!event.persisted && objectUrl) URL.revokeObjectURL(objectUrl);
    });
    update();
    loadVideo();
  }

  renderMenu();
  renderCart();
  updateBadge();
  updatePickupChoice();
  initReveal();
  initHero();
  window.CafeOrder = { money, makeOrderMessage, priceTotal, setQuantity, getCart: () => ({ ...cart }) };
})();
