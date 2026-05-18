// URL del índice generado por el script de Node.js.
const NEWS_INDEX_URL = "news/news-index.json";
const REFRESH_INTERVAL_MS = 1_800_000;

const container = document.getElementById("news-container");
const cardTemplate = document.getElementById("news-card-template");
const lastUpdateEl = document.getElementById("last-update");
const refreshBtn = document.getElementById("refresh-btn");
const videoContainer = document.getElementById("video-container");
const videoPrevBtn = document.getElementById("video-prev");
const videoNextBtn = document.getElementById("video-next");
let heroVideoIntervalId = null;

const VIRAL_CLIPS = [
  {
    title: "Impacto global",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
  },
  {
    title: "Tendencia del día",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  },
  {
    title: "Última hora internacional",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
  },
  {
    title: "Cobertura en vivo",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
  }
];

const VIDEO_CATEGORIES = [
  "Tecnología",
  "Inteligencia Artificial",
  "Deportes",
  "Finanzas",
  "Videojuegos",
  "Entretenimiento",
  "Salud",
  "Cripto"
];

const TRACK_ENDPOINT = "/.netlify/functions/track-event";

function sendMetric(payload) {
  try {
    fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (error) {}
}

function trackPageView() {
  sendMetric({
    type: "page_view",
    path: location.pathname,
    referrer: document.referrer || ""
  });
}

function trackOutboundClicks() {
  document.addEventListener("click", (event) => {
    const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    if (!/^https?:\/\//i.test(href)) return;
    if (href.includes(location.host)) return;

    sendMetric({
      type: "outbound_click",
      path: location.pathname,
      referrer: href
    });
  });
}

// ─── Smart Ad CTR Tracker ────────────────────────────────────────────────────
const AdCtr = {
  KEY: "adCtrData_v1",
  load() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || "{}"); } catch { return {}; }
  },
  save(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch {}
  },
  recordImpression(category, position) {
    const data = this.load();
    const key = `${category}::${position}`;
    if (!data[key]) data[key] = { impressions: 0, clicks: 0 };
    data[key].impressions++;
    this.save(data);
  },
  recordClick(category, position) {
    const data = this.load();
    const key = `${category}::${position}`;
    if (!data[key]) data[key] = { impressions: 0, clicks: 0 };
    data[key].clicks++;
    this.save(data);
  },
  getCtr(category, position) {
    const data = this.load();
    const entry = data[`${category}::${position}`];
    if (!entry || entry.impressions === 0) return 0;
    return entry.clicks / entry.impressions;
  },
  // Devuelve categorías ordenadas de mayor a menor CTR en posición "mid"
  sortByCtr(categories) {
    return [...categories].sort(
      (a, b) => this.getCtr(b, "mid") - this.getCtr(a, "mid")
    );
  }
};

function initCookieBanner() {
  const banner = document.getElementById("cookie-banner");
  if (!banner) return;

  const KEY = "cookieConsent_v1";

  try {
    if (!localStorage.getItem(KEY)) {
      banner.hidden = false;
    }
  } catch (error) {
    banner.hidden = false;
  }

  banner.addEventListener("click", (event) => {
    const action = event.target?.getAttribute?.("data-cookie-action");
    if (!action) return;

    try {
      localStorage.setItem(KEY, action === "accept" ? "accepted" : "rejected");
    } catch (error) {}

    banner.hidden = true;
  });
}

// Crea un bloque de anuncio inteligente con seguimiento de impresiones y clics.
function createSmartAdBlock(category, position) {
  const wrapper = document.createElement("section");
  wrapper.className = "ad-shell ad-inline";
  wrapper.setAttribute("aria-label", "Espacio publicitario");
  wrapper.innerHTML = `
    <p class="ad-label">Publicidad</p>
    <ins
      class="adsbygoogle"
      style="display:block"
      data-ad-client="ca-pub-3049130201122598"
      data-ad-slot="1234567890"
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-ad-category="${category}"
      data-ad-position="${position}"
    ></ins>`;

  // Registro de impresiones cuando el bloque entra en viewport
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            AdCtr.recordImpression(category, position);
            obs.disconnect();
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              wrapper.querySelector("ins").dataset.adsLoaded = "true";
            } catch (e) {
              console.debug("AdSense smart-block:", e?.message || e);
            }
          }
        });
      },
      { threshold: 0.3 }
    );
    obs.observe(wrapper);
  }

  // Registro de clics
  wrapper.addEventListener("click", () => AdCtr.recordClick(category, position), { once: true });

  return wrapper;
}

// Inicializa anuncios de AdSense sin romper la página si hay bloqueadores o falta configuración.
function initAds() {
  const adBlocks = document.querySelectorAll("ins.adsbygoogle");
  for (const block of adBlocks) {
    if (block.dataset.adsLoaded === "true") continue;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      block.dataset.adsLoaded = "true";
    } catch (error) {
      console.debug("AdSense no inicializado todavía:", error?.message || error);
    }
  }

  if ("IntersectionObserver" in window) {
    const seen = new WeakSet();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (seen.has(entry.target)) return;
          seen.add(entry.target);

          sendMetric({
            type: "ad_impression",
            path: location.pathname,
            slot: entry.target.getAttribute("data-ad-slot") || "",
            position: entry.target.getAttribute("data-ad-position") || ""
          });
        });
      },
      { threshold: 0.35 }
    );

    adBlocks.forEach((block) => {
      observer.observe(block);
      const parent = block.closest(".ad-shell") || block.parentElement;
      if (parent && !parent.dataset.metricClickBound) {
        parent.dataset.metricClickBound = "true";
        parent.addEventListener("click", () => {
          sendMetric({
            type: "ad_click",
            path: location.pathname,
            slot: block.getAttribute("data-ad-slot") || "",
            position: block.getAttribute("data-ad-position") || ""
          });
        }, { once: true });
      }
    });
  }
}

// Limita una cadena por palabras para no cortar de forma brusca en medio.
function truncateByWords(text, maxWords = 30) {
  const words = (text || "").trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function escapeSvgText(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isGenericThumb(url = "") {
  const normalized = String(url).toLowerCase();
  return (
    !normalized ||
    normalized.includes("picsum.photos") ||
    normalized.includes("image.thum.io") ||
    normalized.includes("google-news") ||
    normalized.includes("/logo")
  );
}

function createAICoverSvgDataUrl(item = {}) {
  const title = escapeSvgText(truncateByWords(item.seoTitle || "Noticia de ultima hora", 14));
  const category = escapeSvgText((item.category || "Actualidad").toUpperCase());
  const source = escapeSvgText(item.sourceName || "Fuente verificada");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect x="64" y="64" width="1072" height="547" rx="24" fill="#0b1220" opacity="0.9" stroke="#334155"/>
  <rect x="64" y="64" width="1072" height="10" fill="url(#accent)"/>
  <text x="110" y="150" fill="#f8fafc" font-family="Montserrat, Arial" font-size="42" font-weight="700">${category}</text>
  <text x="110" y="235" fill="#e2e8f0" font-family="Roboto, Arial" font-size="36">${title}</text>
  <text x="110" y="575" fill="#94a3b8" font-family="Roboto, Arial" font-size="22">Fuente: ${source}</text>
  <text x="110" y="605" fill="#64748b" font-family="Roboto, Arial" font-size="18">Portada IA editorial</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resolveDisplayThumbnail(item) {
  if (!item) return createAICoverSvgDataUrl();
  return isGenericThumb(item.thumbnail) ? createAICoverSvgDataUrl(item) : item.thumbnail;
}

// Renderiza una tarjeta de estado (cargando, vacío o error).
function renderStatus(message) {
  container.innerHTML = `<article class="status-card"><p>${message}</p></article>`;
}

function getYouTubeSearchUrl(title, category) {
  const q = encodeURIComponent(`${title || category} noticias`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

function initVideoCarousel() {
  if (!videoContainer || !videoPrevBtn || !videoNextBtn) return;

  const getStep = () => {
    const firstCard = videoContainer.querySelector(".video-card");
    if (!firstCard) return videoContainer.clientWidth;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const styles = window.getComputedStyle(videoContainer);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return cardWidth + gap;
  };

  const move = (direction) => {
    const step = getStep();
    videoContainer.scrollBy({
      left: direction * step,
      behavior: "smooth"
    });
  };

  videoPrevBtn.onclick = () => move(-1);
  videoNextBtn.onclick = () => move(1);
}

function renderVideos(newsList = []) {
  if (!videoContainer) return;

  const latestByCategory = new Map();
  for (const item of [...newsList].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))) {
    if (!latestByCategory.has(item.category)) {
      latestByCategory.set(item.category, item);
    }
  }

  const selectedVideos = Array.from(latestByCategory.values()).slice(0, 8);
  const fallbackCategories = VIDEO_CATEGORIES.slice(0, 8);

  while (selectedVideos.length < 8) {
    const fallbackCategory = fallbackCategories[selectedVideos.length];
    if (!fallbackCategory) break;
    selectedVideos.push({
      category: fallbackCategory,
      seoTitle: `Video destacado: ${fallbackCategory}`,
      shortSummary: `Contenido audiovisual recomendado para ${fallbackCategory}.`,
      fileName: "#videos-title",
      thumbnail: ""
    });
  }

  videoContainer.innerHTML = "";
  selectedVideos.forEach((item) => {
    const card = document.createElement("article");
    card.className = "video-card video-card--featured";
    const ytUrl = getYouTubeSearchUrl(item.seoTitle, item.category || "Noticias");
    const thumb = item.thumbnail || `assets/thumb-placeholder.svg`;
    card.innerHTML = `
      <a class="video-thumb" href="${ytUrl}" target="_blank" rel="noopener noreferrer" aria-label="Ver vídeo sobre ${item.category}">
        <img src="${thumb}" alt="${item.category}" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" onerror="this.style.background='#111';this.style.minHeight='80px';" />
        <span class="video-play">▶</span>
      </a>
      <div class="video-copy">
        <p class="video-kicker">${item.category}</p>
        <h3>${item.seoTitle}</h3>
      </div>`;
    videoContainer.appendChild(card);
  });

  initVideoCarousel();
}

function getArticleByCategory(newsList, allowedCategories = [], keywords = []) {
  const normalized = [...newsList].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  const categoryMatches = normalized.filter((item) => allowedCategories.includes(item.category));
  if (categoryMatches.length) return categoryMatches[0];

  const keywordMatches = normalized.find((item) => {
    const haystack = `${item.seoTitle} ${item.shortSummary} ${item.category} ${item.sourceName}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  });

  return keywordMatches || normalized[0] || null;
}

function createNewsCard(item, extraClass = "") {
  const fragment = cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".news-card");
  const image = fragment.querySelector(".news-image");
  const category = fragment.querySelector(".news-category");
  const title = fragment.querySelector(".news-title");
  const summary = fragment.querySelector(".news-summary");
  const date = fragment.querySelector(".news-date");
  const link = fragment.querySelector(".news-link");

  if (extraClass) {
    card.classList.add(extraClass);
  }

  image.src = resolveDisplayThumbnail(item);
  image.alt = `Miniatura: ${item.seoTitle}`;
  category.textContent = item.category;
  title.textContent = item.seoTitle;
  summary.textContent = truncateByWords(item.shortSummary, 36);
  date.textContent = new Date(item.generatedAt).toLocaleString("es-ES");
  link.href = `news/${item.fileName}`;
  link.textContent = "LEER MÁS";

  return fragment;
}

function initHeroViralControls(videos, currentIndex = 0) {
  const player = document.getElementById("hero-viral-player");
  const categoryEl = document.getElementById("hero-viral-category");
  const titleEl = document.getElementById("hero-viral-title");
  const summaryEl = document.getElementById("hero-viral-summary");
  const linkEl = document.getElementById("hero-viral-link");
  const metaEl = document.getElementById("hero-viral-meta");
  const prevBtn = document.getElementById("hero-viral-prev");
  const nextBtn = document.getElementById("hero-viral-next");

  if (!player || !categoryEl || !titleEl || !summaryEl || !linkEl || !metaEl || !prevBtn || !nextBtn || !videos.length) {
    return;
  }

  const paint = (index) => {
    const safeIndex = (index + videos.length) % videos.length;
    const item = videos[safeIndex];
    const clip = VIRAL_CLIPS[safeIndex % VIRAL_CLIPS.length];
    player.src = clip.url;
    player.poster = resolveDisplayThumbnail(item);
    player.play().catch(() => {});
    categoryEl.textContent = item.category || "VIRAL";
    titleEl.textContent = `${item.seoTitle} · ${clip.title}`;
    summaryEl.textContent = truncateByWords(item.shortSummary || item.fullSummary || "Video viral recomendado para aumentar permanencia.", 35);
    linkEl.href = `news/${item.fileName}`;
    metaEl.textContent = new Date(item.generatedAt).toLocaleString("es-ES");
    return safeIndex;
  };

  let cursor = paint(currentIndex);

  prevBtn.onclick = () => {
    cursor = paint(cursor - 1);
  };

  nextBtn.onclick = () => {
    cursor = paint(cursor + 1);
  };

  if (heroVideoIntervalId) clearInterval(heroVideoIntervalId);
  heroVideoIntervalId = setInterval(() => {
    cursor = paint(cursor + 1);
  }, 18000);
}

function renderFeaturedStory(newsList = []) {
  const featured = document.getElementById("featured-story");
  if (!featured || !newsList.length) return;

  const sorted = [...newsList].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  const heroItem = sorted[0];
  if (!heroItem) return;

  // Seleccionar 2 categorías distintas para los destacados bajo el hero
  const usedCategories = new Set([heroItem.category]);
  const cat2Items = [];
  for (const item of sorted.slice(1)) {
    if (!usedCategories.has(item.category)) {
      usedCategories.add(item.category);
      cat2Items.push(item);
    }
    if (cat2Items.length >= 2) break;
  }
  // Si no hay 2 categorías distintas, usar las siguientes noticias
  while (cat2Items.length < 2 && sorted.length > cat2Items.length + 1) {
    cat2Items.push(sorted[cat2Items.length + 1]);
  }

  const catCardsHTML = cat2Items.map(item => `
    <article class="hero-cat-card">
      <a href="news/${item.fileName}" class="hero-cat-card__link">
        <img src="${resolveDisplayThumbnail(item)}" alt="${item.seoTitle}" loading="lazy" decoding="async" />
        <div class="hero-cat-card__overlay">
          <span class="hero-cat-card__kicker">${item.category}</span>
          <h3>${truncateByWords(item.seoTitle, 10)}</h3>
        </div>
      </a>
    </article>`).join("");

  featured.innerHTML = `
    <article class="hero-story hero-story--news">
      <div class="hero-story__media">
        <img src="${resolveDisplayThumbnail(heroItem)}" alt="Imagen destacada de ${heroItem.seoTitle}" loading="eager" decoding="async" />
        <div class="hero-story__badge">ÚLTIMA HORA</div>
      </div>
      <div class="hero-story__content">
        <p class="hero-story__kicker">${heroItem.category}</p>
        <h2>${heroItem.seoTitle}</h2>
        <p>${truncateByWords(heroItem.shortSummary || heroItem.fullSummary, 30)}</p>
        <div class="hero-story__actions">
          <a class="cta" href="news/${heroItem.fileName}">LEER MÁS</a>
          <span class="hero-story__meta">${new Date(heroItem.generatedAt).toLocaleString("es-ES")}</span>
        </div>
      </div>
    </article>
    ${cat2Items.length ? `<div class="hero-cat-row">${catCardsHTML}</div>` : ""}`;
}

function renderTrendingNow(newsList) {
  const trendPanel = document.getElementById("trending-panel");
  if (!trendPanel) return;

  const topItems = [...newsList].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)).slice(0, 6);
  trendPanel.innerHTML = `
    <div class="panel-head">
      <h2>TENDENCIAS AHORA</h2>
      <p>Titulares breves con mayor actividad y novedad.</p>
    </div>
    <div class="trend-list">
      ${topItems.map((item) => `
        <a class="trend-item" href="news/${item.fileName}">
          <img src="${resolveDisplayThumbnail(item)}" alt="Miniatura de ${item.seoTitle}" loading="lazy" />
          <div>
            <p>${item.category}</p>
            <h3>${truncateByWords(item.seoTitle, 10)}</h3>
          </div>
        </a>`).join("")}
    </div>`;
}

const AD_EVERY = 2;

function renderEditorialGrid(newsList) {
  container.innerHTML = "";

  const editorialSections = [
    { id: "politica", label: "POLÍTICA", categories: ["Economía"], keywords: ["gobierno", "congreso", "estado", "presidente", "reforma"] },
    { id: "economia", label: "ECONOMÍA", categories: ["Economía"], keywords: ["mercado", "bolsa", "finanzas", "inversión", "negocios"] },
    { id: "tecnologia", label: "TECNOLOGÍA", categories: ["Tecnología"], keywords: ["software", "tecnología", "innovación", "digital"] },
    { id: "deportes", label: "DEPORTES", categories: ["Deportes"], keywords: ["liga", "final", "deporte", "partido", "equipo"] },
    { id: "cultura-ciencia", label: "CULTURA Y CIENCIA", categories: ["Inteligencia Artificial", "Entretenimiento"], keywords: ["ciencia", "cultura", "ia", "cine", "investigación"] },
    { id: "internacional", label: "INTERNACIONAL", categories: ["Entretenimiento", "Videojuegos"], keywords: ["mundo", "internacional", "global", "región", "país"] }
  ];

  editorialSections.forEach((section, index) => {
    const item = getArticleByCategory(newsList, section.categories, section.keywords);
    if (!item) return;

    const sectionCard = document.createElement("article");
    sectionCard.className = "section-card";
    sectionCard.id = section.id;
    sectionCard.innerHTML = `
      <div class="section-card__header">
        <p>${section.label}</p>
        <span>${item.category}</span>
      </div>
      <a class="section-card__image" href="news/${item.fileName}">
        <img src="${resolveDisplayThumbnail(item)}" alt="Miniatura de ${item.seoTitle}" loading="lazy" />
      </a>
      <div class="section-card__body">
        <h3><a href="news/${item.fileName}">${item.seoTitle}</a></h3>
        <p>${truncateByWords(item.shortSummary, 22)}</p>
        <a class="cta cta--small" href="news/${item.fileName}">LEER MÁS</a>
      </div>`;

    container.appendChild(sectionCard);

    if ((index + 1) % 4 === 0) {
      const adBlock = document.createElement("section");
      adBlock.className = "ad-shell ad-inline ad-inline--wide";
      adBlock.innerHTML = `
        <p class="ad-label">Publicidad</p>
        <ins
          class="adsbygoogle"
          style="display:block"
          data-ad-client="ca-pub-3049130201122598"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>`;
      container.appendChild(adBlock);
    }
  });
}

function renderFeedList(newsList, activeCategory) {
  container.innerHTML = "";
  const items = [...newsList]
    .filter((item) => !activeCategory || item.category === activeCategory)
    .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

  if (!items.length) {
    renderStatus(activeCategory ? `No hay noticias de "${activeCategory}" todavía.` : "No hay noticias disponibles todavía. Ejecuta generate-news.js para publicarlas.");
    return;
  }

  items.forEach((item, index) => {
    if (index > 0 && index % AD_EVERY === 0) {
      const adBlock = document.createElement("section");
      adBlock.className = "ad-shell ad-inline ad-inline--wide";
      adBlock.innerHTML = `
        <p class="ad-label">Publicidad</p>
        <ins
          class="adsbygoogle"
          style="display:block"
          data-ad-client="ca-pub-3049130201122598"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>`;
      container.appendChild(adBlock);
    }
    container.appendChild(createNewsCard(item));
  });
}

function renderNews(newsList, activeCategory = null) {
  if (activeCategory) {
    renderFeedList(newsList, activeCategory);
  } else {
    renderEditorialGrid(newsList);
  }

  if (lastUpdateEl) {
    lastUpdateEl.textContent = `Última actualización: ${new Date().toLocaleString("es-ES")}`;
  }

  initAds();
}

// ─── Estado global del filtro de categoría ──────────────────────────────────
let activeCategory = null;
let cachedNewsList = [];

// Construye la barra de filtros de categoría y conecta los botones.
function renderCategoryFilters(newsList) {
  const nav = document.getElementById("category-filter-nav");
  if (!nav) return;

  const categories = [...new Set(newsList.map((item) => item.category))];
  // Ordenar categorías por CTR descendente para priorizar las más rentables
  const sorted = AdCtr.sortByCtr(categories);

  nav.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "cat-btn" + (activeCategory === null ? " cat-btn--active" : "");
  allBtn.textContent = "Todas";
  allBtn.addEventListener("click", () => {
    activeCategory = null;
    updateActiveCatButton(nav, null);
    renderNews(cachedNewsList, null);
  });
  nav.appendChild(allBtn);

  for (const cat of sorted) {
    const btn = document.createElement("button");
    btn.className = "cat-btn" + (activeCategory === cat ? " cat-btn--active" : "");
    btn.textContent = cat;
    btn.dataset.category = cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      updateActiveCatButton(nav, cat);
      renderNews(cachedNewsList, cat);
    });
    nav.appendChild(btn);
  }
}

function updateActiveCatButton(nav, category) {
  nav.querySelectorAll(".cat-btn").forEach((btn) => {
    const isActive = category === null ? !btn.dataset.category : btn.dataset.category === category;
    btn.classList.toggle("cat-btn--active", isActive);
  });
}

// Obtiene el índice de noticias y lo pinta en pantalla.
async function loadNews() {
  try {
    renderStatus("Cargando noticias automáticas...");
    const response = await fetch(`${NEWS_INDEX_URL}?t=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`No se pudo leer ${NEWS_INDEX_URL}. Estado: ${response.status}`);
    }

    const payload = await response.json();
    cachedNewsList = payload.news || [];

    renderCategoryFilters(cachedNewsList);
    renderFeaturedStory(cachedNewsList);
    renderTrendingNow(cachedNewsList);
    renderVideos(cachedNewsList);
    renderNews(cachedNewsList, activeCategory);

    // JSON-LD dinámico con @graph: WebSite + ItemList para SEO del listado principal.
    const websiteJsonLdEl = document.getElementById("website-jsonld");
    if (websiteJsonLdEl && Array.isArray(payload.news)) {
      const graph = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            name: "Noticias Automáticas",
            url: "https://noticias.artillerosdelcaos.es/",
            inLanguage: "es",
            description: "Portal automático con noticias resumidas y optimizadas para SEO.",
            publisher: { "@type": "Organization", name: "Noticias Automáticas" }
          },
          {
            "@type": "ItemList",
            itemListElement: payload.news.slice(0, 20).map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `news/${item.fileName}`,
              name: item.seoTitle
            }))
          }
        ]
      };
      websiteJsonLdEl.textContent = JSON.stringify(graph, null, 2);
    }
  } catch (error) {
    console.error(error);
    renderStatus("No fue posible cargar noticias. Verifica que exista news/news-index.json.");
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    loadNews();
  });
}

// Carga inicial + recarga automática cada 30 minutos.
trackPageView();
trackOutboundClicks();
loadNews();
initAds();
setInterval(() => {
  loadNews();
}, REFRESH_INTERVAL_MS);

initCookieBanner();

