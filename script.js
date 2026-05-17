// URL del índice generado por el script de Node.js.
const NEWS_INDEX_URL = "news/news-index.json";
const REFRESH_INTERVAL_MS = 1_800_000;

const container = document.getElementById("news-container");
const cardTemplate = document.getElementById("news-card-template");
const lastUpdateEl = document.getElementById("last-update");
const refreshBtn = document.getElementById("refresh-btn");
const videoContainer = document.getElementById("video-container");

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
}

// Limita una cadena por palabras para no cortar de forma brusca en medio.
function truncateByWords(text, maxWords = 30) {
  const words = (text || "").trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

// Renderiza una tarjeta de estado (cargando, vacío o error).
function renderStatus(message) {
  container.innerHTML = `<article class="status-card"><p>${message}</p></article>`;
}

function getYouTubeSearchEmbedUrl(category) {
  const query = encodeURIComponent(`noticias ${category} hoy`);
  return `https://www.youtube.com/embed?listType=search&list=${query}&rel=0&modestbranding=1`;
}

function renderVideos() {
  if (!videoContainer) return;

  videoContainer.innerHTML = "";
  for (const category of VIDEO_CATEGORIES) {
    const card = document.createElement("article");
    card.className = "video-card";
    card.innerHTML = `
      <iframe
        loading="lazy"
        src="${getYouTubeSearchEmbedUrl(category)}"
        title="Video recomendado de ${category}"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
      <p class="video-caption">Video recomendado: ${category}</p>
    `;
    videoContainer.appendChild(card);
  }
}

// Crea las tarjetas de noticias con datos cargados del índice JSON.
// Inyecta smart-ads cada AD_EVERY tarjetas usando el CTR acumulado por categoría.
const AD_EVERY = 2; // Insertar un bloque de anuncio cada N tarjetas

function renderNews(newsList, activeCategory = null) {
  container.innerHTML = "";

  const uniqueMap = new Map();
  for (const item of newsList) {
    if (!uniqueMap.has(item.slug)) {
      uniqueMap.set(item.slug, item);
    }
  }

  let sortedNews = Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)
  );

  // Filtrar por categoría activa si hay una seleccionada
  if (activeCategory) {
    sortedNews = sortedNews.filter((item) => item.category === activeCategory);
  }

  if (!sortedNews.length) {
    renderStatus(
      activeCategory
        ? `No hay noticias de "${activeCategory}" todavía.`
        : "No hay noticias disponibles todavía. Ejecuta generate-news.js para publicarlas."
    );
    return;
  }

  let cardCount = 0;
  for (const item of sortedNews) {
    // Inyectar anuncio inteligente cada AD_EVERY tarjetas
    if (cardCount > 0 && cardCount % AD_EVERY === 0) {
      const adBlock = createSmartAdBlock(item.category, `mid_${Math.floor(cardCount / AD_EVERY)}`);
      container.appendChild(adBlock);
    }

    const fragment = cardTemplate.content.cloneNode(true);

    const image = fragment.querySelector(".news-image");
    const category = fragment.querySelector(".news-category");
    const title = fragment.querySelector(".news-title");
    const summary = fragment.querySelector(".news-summary");
    const date = fragment.querySelector(".news-date");
    const link = fragment.querySelector(".news-link");

    image.src = item.thumbnail;
    image.alt = `Miniatura: ${item.seoTitle}`;
    category.textContent = item.category;
    title.textContent = item.seoTitle;
    summary.textContent = truncateByWords(item.shortSummary, 36);
    date.textContent = new Date(item.generatedAt).toLocaleString("es-ES");
    link.href = `news/${item.fileName}`;

    container.appendChild(fragment);
    cardCount++;
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
renderVideos();
loadNews();
initAds();
setInterval(() => {
  loadNews();
}, REFRESH_INTERVAL_MS);

initCookieBanner();

