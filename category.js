const NEWS_INDEX_URL = "news/news-index.json";

const category = document.body?.dataset?.category || "";
const categorySlug = document.body?.dataset?.categorySlug || "";
const categoryLabel = document.body?.dataset?.categoryLabel || category || "Categoría";

const heroEl = document.getElementById("category-hero");
const gridEl = document.getElementById("category-grid");
const linksEl = document.getElementById("category-links");
const videosEl = document.getElementById("category-videos");
const updateEl = document.getElementById("last-update");

const CATEGORY_ALIASES = {
  finanzas: ["Finanzas", "Economía"],
  "inteligencia-artificial": ["Inteligencia Artificial"],
  tecnologia: ["Tecnología"],
  deportes: ["Deportes"],
  videojuegos: ["Videojuegos"],
  entretenimiento: ["Entretenimiento"],
  salud: ["Salud"],
  cripto: ["Cripto"]
};

function resolveAcceptedCategories() {
  const aliasBySlug = CATEGORY_ALIASES[categorySlug] || [];
  const unique = new Set([category, ...aliasBySlug].filter(Boolean));
  return Array.from(unique);
}

function truncateByWords(text, maxWords = 22) {
  const words = (text || "").trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function toDateText(dateIso) {
  try {
    return new Date(dateIso).toLocaleString("es-ES");
  } catch {
    return "";
  }
}

function getYouTubeSearchEmbedUrl(query) {
  const q = encodeURIComponent(`noticias ${query} hoy`);
  return `https://www.youtube.com/embed?listType=search&list=${q}&rel=0&modestbranding=1`;
}

function initAds() {
  document.querySelectorAll("ins.adsbygoogle").forEach((block) => {
    if (block.dataset.adsLoaded === "true") return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      block.dataset.adsLoaded = "true";
    } catch (error) {
      console.debug("AdSense no disponible:", error?.message || error);
    }
  });
}

function renderHero(item) {
  if (!heroEl) return;

  if (!item) {
    heroEl.innerHTML = `
      <div class="category-hero-copy">
        <p class="hero-story__kicker">Sin destacados por ahora</p>
        <h3 class="category-hero-title">Actualizando cobertura de ${categoryLabel}</h3>
        <p>Estamos procesando nuevas noticias para esta sección. Vuelve en unos minutos para ver el bloque destacado.</p>
      </div>`;
    return;
  }

  heroEl.innerHTML = `
    <a class="category-hero-media" href="news/${item.fileName}">
      <img src="${item.thumbnail}" alt="${item.seoTitle}" loading="lazy" />
    </a>
    <div class="category-hero-copy">
      <p class="hero-story__kicker">Destacado ${categoryLabel}</p>
      <h3 class="category-hero-title">${item.seoTitle}</h3>
      <p>${truncateByWords(item.shortSummary || item.fullSummary, 35)}</p>
      <div class="hero-story__actions">
        <a class="cta" href="news/${item.fileName}">LEER MÁS</a>
        <span class="hero-story__meta">${toDateText(item.generatedAt)}</span>
      </div>
    </div>`;
}

function renderGrid(items) {
  if (!gridEl) return;

  if (!items.length) {
    gridEl.innerHTML = `<article class="status-card"><p>No hay noticias disponibles en ${categoryLabel} por ahora.</p></article>`;
    return;
  }

  gridEl.innerHTML = items
    .slice(0, 6)
    .map(
      (item) => `
      <article class="category-card">
        <a href="news/${item.fileName}"><img src="${item.thumbnail}" alt="${item.seoTitle}" loading="lazy" /></a>
        <div class="category-card-copy">
          <h3>${item.seoTitle}</h3>
          <p>${truncateByWords(item.shortSummary || item.fullSummary, 18)}</p>
          <a class="cta cta--small" href="news/${item.fileName}">LEER MÁS</a>
        </div>
      </article>`
    )
    .join("");
}

function renderLinks(items) {
  if (!linksEl) return;

  if (!items.length) {
    linksEl.innerHTML = `<a href="index.html">Ir a portada mientras llegan nuevas noticias</a>`;
    return;
  }

  linksEl.innerHTML = items
    .slice(0, 4)
    .map((item) => `<a href="news/${item.fileName}">${truncateByWords(item.seoTitle, 11)}</a>`)
    .join("");
}

function renderVideos(items) {
  if (!videosEl) return;

  const queries = [
    categoryLabel,
    items[0]?.seoTitle || categoryLabel
  ];

  videosEl.innerHTML = `
    <h3>Videos de ${categoryLabel}</h3>
    <div class="category-video-grid">
      ${queries
        .map(
          (q) => `
            <iframe
              src="${getYouTubeSearchEmbedUrl(q)}"
              title="Video sobre ${categoryLabel}"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen
            ></iframe>`
        )
        .join("")}
    </div>`;
}

async function loadCategoryPage() {
  if (!category) return;

  const acceptedCategories = resolveAcceptedCategories();

  try {
    const response = await fetch(`${NEWS_INDEX_URL}?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${NEWS_INDEX_URL}: ${response.status}`);
    }

    const payload = await response.json();
    const allNews = payload.news || [];
    const filtered = allNews
      .filter((item) => acceptedCategories.includes(item.category))
      .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

    const featured = filtered[0] || null;
    const related = filtered.slice(1);

    renderHero(featured);
    renderGrid(related.length ? related : filtered);
    renderLinks(filtered);
    renderVideos(filtered);

    if (updateEl) {
      const stamp = payload.updatedAt ? toDateText(payload.updatedAt) : toDateText(new Date().toISOString());
      updateEl.textContent = `Ultima actualizacion: ${stamp}`;
    }

    initAds();
  } catch (error) {
    console.error(error);
    if (gridEl) {
      gridEl.innerHTML = `<article class="status-card"><p>No fue posible cargar noticias de ${categoryLabel}. Intenta de nuevo en unos minutos.</p></article>`;
    }
  }
}

loadCategoryPage();
