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
  "Economía",
  "Videojuegos",
  "Entretenimiento"
];

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
function renderNews(newsList) {
  container.innerHTML = "";

  const uniqueMap = new Map();
  for (const item of newsList) {
    if (!uniqueMap.has(item.slug)) {
      uniqueMap.set(item.slug, item);
    }
  }

  const sortedNews = Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)
  );

  if (!sortedNews.length) {
    renderStatus("No hay noticias disponibles todavía. Ejecuta generate-news.js para publicarlas.");
    return;
  }

  for (const item of sortedNews) {
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
  }

  if (lastUpdateEl) {
    lastUpdateEl.textContent = `Última actualización: ${new Date().toLocaleString("es-ES")}`;
  }

  initAds();
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
    renderNews(payload.news || []);

    // JSON-LD dinámico tipo ItemList para SEO de listados.
    const websiteJsonLdEl = document.getElementById("website-jsonld");
    if (websiteJsonLdEl && Array.isArray(payload.news)) {
      const itemList = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: payload.news.slice(0, 20).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `news/${item.fileName}`,
          name: item.seoTitle
        }))
      };

      websiteJsonLdEl.textContent = JSON.stringify(itemList, null, 2);
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
