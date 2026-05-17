/*
  Sistema automático de generación de noticias.
  - Consume Google News RSS (fuente gratuita y pública).
  - Filtra duplicados.
  - Crea resumen original de 150-250 palabras.
  - Genera miniatura automática con Lorem Picsum.
  - Crea archivos HTML en /news con fs.writeFile.
  - Actualiza automáticamente cada 30 minutos.

  Uso:
  1) Abre terminal en la carpeta del proyecto.
  2) Ejecuta: node generate-news.js
*/

const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const NEWS_DIR = path.join(ROOT_DIR, "news");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");
const INDEX_FILE = path.join(NEWS_DIR, "news-index.json");
const SCORES_FILE = path.join(NEWS_DIR, "category-scores.json");
const LANDINGS_DIR = ROOT_DIR;
const REFRESH_INTERVAL_MS = 1_800_000;
const MAX_ITEMS_PER_CATEGORY = 3;
// Número de ejecuciones con artículos para que se genere la landing SEO de una categoría.
const SCORE_THRESHOLD = 1;

const CATEGORIES = [
  { name: "Tecnología", query: "tecnologia OR innovación OR software" },
  { name: "Inteligencia Artificial", query: "inteligencia artificial OR machine learning OR IA" },
  { name: "Deportes", query: "deportes OR futbol OR baloncesto OR liga" },
  { name: "Finanzas", query: "finanzas OR economia OR mercados OR bolsa" },
  { name: "Videojuegos", query: "videojuegos OR gaming OR esports" },
  { name: "Entretenimiento", query: "entretenimiento OR cine OR series" },
  { name: "Salud", query: "salud OR medicina OR bienestar OR sanidad" },
  { name: "Cripto", query: "criptomonedas OR bitcoin OR blockchain OR ethereum" }
];

function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ─── Category Score System ───────────────────────────────────────────────────

function loadCategoryScores() {
  if (!fs.existsSync(SCORES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, "utf8"));
  } catch {
    return {};
  }
}

function updateCategoryScore(scores, categoryName, articlesCount) {
  if (!scores[categoryName]) {
    scores[categoryName] = { score: 0, landingGenerated: false, lastUpdated: null };
  }
  if (articlesCount > 0) {
    scores[categoryName].score += articlesCount;
    scores[categoryName].lastUpdated = new Date().toISOString();
  }
}

// Genera la landing SEO de una categoría con JSON-LD BreadcrumbList + CollectionPage.
function buildCategoryLandingHtml(categoryName, categorySlug, articles) {
  const baseUrl = "https://noticias.artillerosdelcaos.es/";
  const safeCategory = escapeHtml(categoryName);

  const articlesHtml = articles
    .map((item) => {
      const imgSrc = /^https?:\/\//i.test(item.thumbnail) ? item.thumbnail : `../${item.thumbnail}`;
      return `    <article class="landing-card">
      <a href="news/${escapeHtml(item.fileName)}">
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.seoTitle)}" loading="lazy" />
      </a>
      <div class="landing-card-body">
        <h2><a href="news/${escapeHtml(item.fileName)}">${escapeHtml(item.seoTitle)}</a></h2>
        <p class="lc-summary">${escapeHtml(item.shortSummary)}</p>
        <time datetime="${escapeHtml(item.generatedAt)}">${new Date(item.generatedAt).toLocaleString("es-ES")}</time>
      </div>
    </article>`;
    })
    .join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: baseUrl },
          { "@type": "ListItem", position: 2, name: categoryName, item: `${baseUrl}${categorySlug}.html` }
        ]
      },
      {
        "@type": "CollectionPage",
        name: `Noticias de ${categoryName} – Última hora y análisis`,
        url: `${baseUrl}${categorySlug}.html`,
        description: `Las últimas noticias de ${categoryName} actualizadas automáticamente cada 30 minutos con análisis y contexto editorial.`,
        inLanguage: "es",
        publisher: { "@type": "Organization", name: "Noticias Automáticas" },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: articles.slice(0, 20).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${baseUrl}news/${item.fileName}`,
            name: item.seoTitle
          }))
        }
      }
    ]
  };

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Noticias de ${safeCategory} – Última hora y análisis</title>
    <meta name="description" content="Las noticias más recientes de ${safeCategory}. Cobertura automática actualizada cada 30 minutos con contexto editorial." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${baseUrl}${categorySlug}.html" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Noticias de ${safeCategory} – Última hora" />
    <meta property="og:description" content="Cobertura automática de ${safeCategory}. Actualización cada 30 minutos." />
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3049130201122598" crossorigin="anonymous"></script>
    <meta name="google-adsense-account" content="ca-pub-3049130201122598" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
  </head>
  <body>
    <div class="bg-orb orb-1" aria-hidden="true"></div>
    <div class="bg-orb orb-2" aria-hidden="true"></div>

    <header class="site-header">
      <p class="eyebrow">Actualización automática cada 30 minutos</p>
      <h1>Noticias de ${safeCategory}</h1>
      <p class="lead">Cobertura en tiempo real con análisis y contexto editorial. Sección: ${safeCategory}.</p>
      <nav class="category-nav" aria-label="Categorías principales">
        <a href="index.html">Inicio</a>
        <a href="deportes.html">Deportes</a>
        <a href="salud.html">Salud</a>
        <a href="finanzas.html">Finanzas</a>
        <a href="cripto.html">Cripto</a>
        <a href="tecnologia.html">Tecnología</a>
        <a href="entretenimiento.html">Entretenimiento</a>
      </nav>
    </header>

    <main>
      <section class="ad-shell" aria-label="Espacio publicitario superior">
        <p class="ad-label">Publicidad</p>
        <ins class="adsbygoogle" style="display:block"
          data-ad-client="ca-pub-3049130201122598"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-ad-category="${safeCategory}"
          data-ad-position="top"
        ></ins>
      </section>

      <section class="landing-grid" aria-label="Artículos de ${safeCategory}">
${articlesHtml}
      </section>

      <section class="ad-shell ad-shell-bottom" aria-label="Espacio publicitario inferior">
        <p class="ad-label">Publicidad</p>
        <ins class="adsbygoogle" style="display:block"
          data-ad-client="ca-pub-3049130201122598"
          data-ad-slot="1234567890"
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-ad-category="${safeCategory}"
          data-ad-position="bottom"
        ></ins>
      </section>
    </main>

    <footer class="site-footer">
      <p>Noticias de ${safeCategory} – Actualización automática cada 30 minutos.</p>
      <p><a href="index.html" style="color:var(--brand);font-weight:700;">← Volver al inicio</a></p>
    </footer>

    <script>
      document.querySelectorAll("ins.adsbygoogle").forEach(function (block) {
        if (block.dataset.adsLoaded === "true") return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          block.dataset.adsLoaded = "true";
        } catch (e) {
          console.debug("AdSense no disponible:", e && e.message ? e.message : e);
        }
      });
    </script>
  </body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Convierte fs.writeFile (callback) en promesa para usar async/await sin perder el requisito.
function writeFileAsync(filePath, content) {
  return new Promise((resolve, reject) => {
    const encoding = Buffer.isBuffer(content) ? undefined : "utf8";
    fs.writeFile(filePath, content, encoding, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

function ensureDirectories() {
  if (!fs.existsSync(NEWS_DIR)) {
    fs.mkdirSync(NEWS_DIR, { recursive: true });
  }

  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

function decodeHtmlEntities(text = "") {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(text = "") {
  return decodeHtmlEntities(text.replace(/<[^>]*>/g, " "));
}

function slugify(input = "") {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function formatDateForFile(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function createThumbnail(category, slug) {
  const seed = encodeURIComponent(`${category}-${slug}`);
  return `https://picsum.photos/seed/${seed}/1200/675`;
}

async function resolveThumbnailUrl(category, slug) {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!unsplashKey) {
    return createThumbnail(category, slug);
  }

  try {
    const query = encodeURIComponent(category);
    const endpoint = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${unsplashKey}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`Unsplash no disponible (${response.status})`);
    }

    const payload = await response.json();
    return payload?.urls?.regular || createThumbnail(category, slug);
  } catch (error) {
    console.error(`Fallback a Picsum para miniatura de ${category}:`, error.message);
    return createThumbnail(category, slug);
  }
}

async function saveThumbnailLocally(imageUrl, slug) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar miniatura (${response.status})`);
    }

    const bytes = await response.arrayBuffer();
    const fileName = `thumb-${slug}.jpg`;
    const absolutePath = path.join(ASSETS_DIR, fileName);

    await writeFileAsync(absolutePath, Buffer.from(bytes));
    return `assets/${fileName}`;
  } catch (error) {
    console.error(`No se pudo guardar miniatura local (${slug}):`, error.message);
    return imageUrl;
  }
}

function extractTag(xmlBlock, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xmlBlock.match(regex);
  return match ? decodeHtmlEntities(match[1]) : "";
}

function parseRssItems(rssXml = "") {
  const blocks = rssXml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  return blocks.map((block) => {
    const title = extractTag(block, "title");
    const description = extractTag(block, "description");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");

    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const source = sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : "Google News";

    return {
      title: stripHtml(title),
      description: stripHtml(description),
      link,
      pubDate,
      source
    };
  });
}

// Reescribe el contenido para obtener un bloque de 150-250 palabras y tono editorial original.
function buildSummary({ title, description, category, source }) {
  const cleanTitle = stripHtml(title);
  const cleanDescription = stripHtml(description);
  const dateText = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  let parts = [
    `En ${category}, la noticia "${cleanTitle}" ha captado una alta atención durante ${dateText}.`,
    cleanDescription || "Los primeros reportes señalan un movimiento relevante dentro del sector y una reacción inmediata en audiencias digitales.",
    `Según la cobertura inicial de ${source}, el contexto muestra una tendencia que podría marcar conversaciones durante las próximas jornadas.`,
    "El impacto no se limita al titular principal: también influye en decisiones de usuarios, marcas y actores clave del mercado.",
    `En términos prácticos, este desarrollo dentro de ${category} abre escenarios de seguimiento para profesionales, creadores y público general.`,
    "Por ahora, los datos disponibles indican un crecimiento en interés, búsquedas relacionadas y menciones en plataformas especializadas.",
    "Se espera que nuevas actualizaciones aporten precisión sobre alcance, consecuencias y próximos pasos del caso."
  ];

  const fillerSentences = [
    `Analistas del ámbito de ${category} destacan que la velocidad de respuesta será determinante en la evolución de esta historia.`,
    "La reacción de la audiencia refleja que el tema combina actualidad, utilidad práctica y debate público.",
    "En paralelo, distintos portales han comenzado a comparar este hecho con eventos recientes para proyectar posibles escenarios.",
    "El seguimiento de los próximos comunicados oficiales ayudará a confirmar si la tendencia se consolida o cambia de dirección.",
    "Esta cobertura se actualiza de manera continua para mantener una visión clara, contextualizada y útil para lectura rápida."
  ];

  let summary = parts.join(" ").replace(/\s+/g, " ").trim();

  while (summary.split(/\s+/).length < 150) {
    summary += ` ${fillerSentences[Math.floor(Math.random() * fillerSentences.length)]}`;
  }

  const words = summary.split(/\s+/);
  if (words.length > 250) {
    summary = `${words.slice(0, 250).join(" ")}.`;
  }

  return summary;
}

function createSeoTitle(title, category) {
  const base = stripHtml(title).replace(/\s+/g, " ").trim();
  return `${base} | Última hora de ${category} y análisis`;
}

function createMetaDescription(summary) {
  const words = summary.split(/\s+/);
  return words.slice(0, 24).join(" ") + "...";
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLegalLinks(basePath = "") {
  return `
    <nav class="legal-nav" aria-label="Enlaces legales">
      <a href="${basePath}aviso-legal.html">Aviso legal</a>
      <a href="${basePath}privacidad.html">Privacidad</a>
      <a href="${basePath}cookies.html">Cookies</a>
    </nav>`;
}

function buildNewsHtml(newsItem) {
  const articleImagePath = /^https?:\/\//i.test(newsItem.thumbnail)
    ? newsItem.thumbnail
    : `../${newsItem.thumbnail}`;

  const safeTitle = escapeHtml(newsItem.seoTitle);
  const safeMetaDescription = escapeHtml(newsItem.metaDescription);
  const safeCategory = escapeHtml(newsItem.category);
  const safeSummary = escapeHtml(newsItem.fullSummary);
  const safeSourceName = escapeHtml(newsItem.sourceName);
  const safeSourceUrl = escapeHtml(newsItem.sourceUrl);
  const safeImagePath = escapeHtml(articleImagePath);
  const safeVideoUrl = escapeHtml(getYouTubeSearchEmbedUrl(newsItem.category));

  const videoEmbedUrl = getYouTubeSearchEmbedUrl(newsItem.category);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        headline: newsItem.seoTitle,
        datePublished: newsItem.generatedAt,
        dateModified: newsItem.generatedAt,
        inLanguage: "es",
        image: [articleImagePath],
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `./${newsItem.fileName}`
        },
        author: { "@type": "Organization", name: "Noticias Automáticas" },
        publisher: { "@type": "Organization", name: "Noticias Automáticas" },
        description: newsItem.metaDescription,
        articleSection: newsItem.category
      },
      {
        "@type": "VideoObject",
        name: `Video relacionado: ${newsItem.seoTitle}`,
        description: `Cobertura en video de noticias sobre ${newsItem.category} – ${newsItem.metaDescription}`,
        embedUrl: videoEmbedUrl,
        thumbnailUrl: articleImagePath,
        uploadDate: newsItem.generatedAt,
        inLanguage: "es",
        publisher: { "@type": "Organization", name: "Noticias Automáticas" }
      }
    ]
  };

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeMetaDescription}" />
    <meta name="robots" content="index, follow" />
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3049130201122598"
      crossorigin="anonymous"></script>
    <meta name="google-adsense-account" content="ca-pub-3049130201122598" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Fraunces:opsz,wght@9..144,700&display=swap" rel="stylesheet" />
    <style>
      body { margin: 0; font-family: "Space Grotesk", "Segoe UI", sans-serif; background: #f4efe6; color: #17223b; background-image: radial-gradient(circle at 10% 10%, #ffe6b5 0%, rgba(255,230,181,0) 42%); }
      .wrapper { max-width: 900px; margin: 2rem auto; padding: 1rem; }
      article { background: #fffdf8; border: 1px solid #d8ceb8; border-radius: 18px; padding: 1rem; box-shadow: 0 14px 40px rgba(23,34,59,.14); }
      h1 { font-family: "Fraunces", Georgia, serif; line-height: 1.2; margin: .2rem 0 .7rem; }
      .meta { color: #4c5c73; margin-bottom: 1rem; font-size: .92rem; }
      img { width: 100%; border-radius: 12px; aspect-ratio: 16 / 9; object-fit: cover; }
      p { line-height: 1.75; color: #27344c; }
      .video-shell { margin-top: .9rem; border: 1px solid #d8ceb8; border-radius: 14px; overflow: hidden; background: #fff; }
      .video-shell iframe { width: 100%; aspect-ratio: 16 / 9; border: 0; display: block; }
      .video-caption { margin: 0; padding: .55rem .75rem; color: #4c5c73; font-size: .85rem; font-weight: 700; }
      .ad-slot { border: 1px dashed #d8ceb8; border-radius: 14px; padding: .55rem; margin: .9rem 0; background: #fffcf4; }
      .ad-label { margin: 0 0 .4rem; color: #4c5c73; font-size: .74rem; text-transform: uppercase; font-weight: 700; letter-spacing: .04em; }
      .actions { margin-top: 1.2rem; display: flex; gap: .8rem; flex-wrap: wrap; }
      .btn { text-decoration: none; background: #17223b; color: #fff; padding: .6rem 1rem; border-radius: 999px; font-weight: 700; }
      .btn.alt { background: #0b7285; }
      .legal-nav { margin-top: .9rem; display: flex; flex-wrap: wrap; gap: .55rem; }
      .legal-nav a { color: #0b7285; text-decoration: none; font-weight: 700; font-size: .85rem; }
      .legal-nav a:hover { text-decoration: underline; }
      .ad-micro-grid { display: grid; gap: .9rem; margin: .9rem 0; }
      footer { margin-top: 1rem; color: #4c5c73; font-size: .9rem; }
    </style>
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
  </head>
  <body>
    <main class="wrapper">
      <article>
        <header>
          <p>${safeCategory}</p>
          <h1>${safeTitle}</h1>
          <p class="meta">Publicado: ${new Date(newsItem.generatedAt).toLocaleString("es-ES")}</p>
        </header>
        <section>
          <img src="${safeImagePath}" alt="Imagen de ${safeCategory}" loading="lazy" />
          <div class="ad-slot" aria-label="Espacio publicitario en contenido">
            <p class="ad-label">Publicidad</p>
            <ins
              class="adsbygoogle"
              style="display:block"
              data-ad-client="ca-pub-3049130201122598"
              data-ad-slot="1234567890"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
          <div class="ad-slot" aria-label="Espacio publicitario intermedio">
            <p class="ad-label">Publicidad</p>
            <ins
              class="adsbygoogle"
              style="display:block"
              data-ad-client="ca-pub-3049130201122598"
              data-ad-slot="1234567890"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
          <div class="video-shell" aria-label="Video relacionado">
            <iframe
              loading="lazy"
              src="${safeVideoUrl}"
              title="Video relacionado de ${safeCategory}"
              referrerpolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
            <p class="video-caption">Video relacionado: ${safeCategory}</p>
          </div>
          <p>${safeSummary}</p>
        </section>
        <footer>
          <div class="ad-slot" aria-label="Espacio publicitario inferior">
            <p class="ad-label">Publicidad</p>
            <ins
              class="adsbygoogle"
              style="display:block"
              data-ad-client="ca-pub-3049130201122598"
              data-ad-slot="1234567890"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
          <div class="actions">
            <a class="btn" href="../index.html">Volver al inicio</a>
            <a class="btn alt" href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer">Ver fuente original</a>
          </div>
          ${renderLegalLinks("../")}
          <p>Fuente: ${safeSourceName}</p>
        </footer>
      </article>
    </main>
    <script>
      document.querySelectorAll("ins.adsbygoogle").forEach((block) => {
        if (block.dataset.adsLoaded === "true") return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          block.dataset.adsLoaded = "true";
        } catch (error) {
          console.debug("AdSense no disponible:", error && error.message ? error.message : error);
        }
      });
    </script>
  </body>
</html>`;
}

function buildLegalPageHtml({ title, description, heading, sections }) {
  const sectionHtml = sections
    .map(
      (section) => `
        <section class="legal-panel">
          <h2>${escapeHtml(section.title)}</h2>
          ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n")}
        </section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
    <style>
      body { margin: 0; font-family: "Space Grotesk", "Segoe UI", sans-serif; color: #17223b; min-height: 100vh; background: radial-gradient(circle at 12% 12%, #ffe4b8 0%, rgba(255, 228, 184, 0) 45%), radial-gradient(circle at 90% 25%, #cbe6f0 0%, rgba(203, 230, 240, 0) 50%), linear-gradient(160deg, #f4efe6 0%, #efe6d6 100%); padding: 1.3rem; }
      .wrapper { max-width: 920px; margin: 0 auto; }
      .hero { border: 1px solid #d8ceb8; border-radius: 18px; background: rgba(255,253,248,.9); padding: 1.2rem; box-shadow: 0 14px 40px rgba(23,34,59,.14); }
      .eyebrow { margin: 0; color: #0b7285; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; font-size: .78rem; }
      h1 { margin: .35rem 0; font-family: "Fraunces", Georgia, serif; font-size: clamp(1.8rem, 4vw, 2.8rem); line-height: 1.1; }
      .lead { margin: 0; color: #4c5c73; max-width: 72ch; }
      .legal-nav { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: 1rem; }
      .legal-nav a { color: #0b7285; text-decoration: none; font-weight: 700; }
      .legal-nav a:hover { text-decoration: underline; }
      .legal-panel { margin-top: 1rem; border: 1px solid #d8ceb8; border-radius: 18px; background: #fffdf8; padding: 1rem; box-shadow: 0 14px 40px rgba(23,34,59,.12); }
      .legal-panel h2 { margin: 0 0 .55rem; font-size: 1.05rem; }
      .legal-panel p { margin: .45rem 0; line-height: 1.75; color: #27344c; }
      footer { margin-top: 1rem; color: #4c5c73; font-size: .92rem; }
      footer a { color: #0b7285; font-weight: 700; text-decoration: none; }
      footer a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <main class="wrapper">
      <section class="hero">
        <p class="eyebrow">Información legal</p>
        <h1>${escapeHtml(heading)}</h1>
        <p class="lead">${escapeHtml(description)}</p>
        ${renderLegalLinks("")}
      </section>

      <div class="ad-micro-grid">
        <section class="ad-slot" aria-label="Espacio publicitario legal superior">
          <p class="ad-label">Publicidad</p>
          <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-3049130201122598" data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true"></ins>
        </section>
      </div>

${sectionHtml}

      <footer>
        <p>Noticias Automáticas. Sitio informativo con actualización automática cada 30 minutos.</p>
        ${renderLegalLinks("")}
        <p><a href="index.html">← Volver al inicio</a></p>
      </footer>
    </main>
    <script>
      document.querySelectorAll("ins.adsbygoogle").forEach(function (block) {
        if (block.dataset.adsLoaded === "true") return;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          block.dataset.adsLoaded = "true";
        } catch (e) {
          console.debug("AdSense no disponible:", e && e.message ? e.message : e);
        }
      });
    </script>
  </body>
</html>`;
}

function getYouTubeSearchEmbedUrl(category) {
  const query = encodeURIComponent(`noticias ${category} hoy`);
  return `https://www.youtube.com/embed?listType=search&list=${query}&rel=0&modestbranding=1`;
}

async function fetchCategoryNews(category) {
  const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(category.query)}&hl=es-419&gl=MX&ceid=MX:es-419`;
  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "Mozilla/5.0 (NewsBot/1.0)"
    }
  });

  if (!response.ok) {
    throw new Error(`Error al consultar RSS para ${category.name}: ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parseRssItems(xml);

  return parsed.slice(0, MAX_ITEMS_PER_CATEGORY).map((item) => ({
    ...item,
    category: category.name
  }));
}

async function actualizarNoticias() {
  try {
    console.log(`[${new Date().toISOString()}] Iniciando actualización automática...`);
    ensureDirectories();

    const allFetched = [];
    for (const category of CATEGORIES) {
      try {
        const items = await fetchCategoryNews(category);
        allFetched.push(...items);
      } catch (categoryError) {
        console.error(`Fallo en categoría ${category.name}:`, categoryError.message);
      }
    }

    const dedupeMap = new Map();
    for (const item of allFetched) {
      const key = `${slugify(item.title)}::${item.link}`;
      if (!dedupeMap.has(key)) {
        dedupeMap.set(key, item);
      }
    }

    const uniqueNews = Array.from(dedupeMap.values());
    const generatedAt = new Date();
    const dateForFile = formatDateForFile(generatedAt);

    const generatedNews = [];

    for (const raw of uniqueNews) {
      const slug = slugify(raw.title || `${raw.category}-noticia`);
      const seoTitle = createSeoTitle(raw.title, raw.category);
      const remoteThumbnailUrl = await resolveThumbnailUrl(raw.category, slug);
      const thumbnail = await saveThumbnailLocally(remoteThumbnailUrl, slug);
      const fullSummary = buildSummary({
        title: raw.title,
        description: raw.description,
        category: raw.category,
        source: raw.source
      });
      const metaDescription = createMetaDescription(fullSummary);
      const shortSummary = fullSummary.split(" ").slice(0, 35).join(" ") + "...";
      const fileName = `noticia-${dateForFile}-${slug}.html`;

      const item = {
        slug,
        category: raw.category,
        seoTitle,
        shortSummary,
        fullSummary,
        metaDescription,
        thumbnail,
        generatedAt: generatedAt.toISOString(),
        sourceUrl: raw.link,
        sourceName: raw.source || "Google News",
        fileName
      };

      const html = buildNewsHtml(item);
      const targetPath = path.join(NEWS_DIR, fileName);

      // Requisito solicitado: creación automática con fs.writeFile.
      await writeFileAsync(targetPath, html);
      generatedNews.push(item);
    }

    const payload = {
      updatedAt: generatedAt.toISOString(),
      total: generatedNews.length,
      news: generatedNews
    };

    await writeFileAsync(INDEX_FILE, JSON.stringify(payload, null, 2));

    // ── Score tracking + autoexpansión de landings SEO por categoría ──────────
    const scores = loadCategoryScores();

    // Agrupar artículos por categoría
    const byCategory = {};
    for (const item of generatedNews) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }

    for (const [categoryName, items] of Object.entries(byCategory)) {
      updateCategoryScore(scores, categoryName, items.length);

      const catScore = scores[categoryName].score;
      const catSlug = slugify(categoryName);

      // Generar (o regenerar) landing cuando el score alcanza el umbral
      if (catScore >= SCORE_THRESHOLD) {
        const html = buildCategoryLandingHtml(categoryName, catSlug, items);
        const landingPath = path.join(LANDINGS_DIR, `${catSlug}.html`);
        await writeFileAsync(landingPath, html);
        scores[categoryName].landingGenerated = true;
        console.log(`  → Landing SEO generada: ${catSlug}.html (score ${catScore})`);
      }
    }

    await writeFileAsync(SCORES_FILE, JSON.stringify(scores, null, 2));

    const legalPages = [
      {
        fileName: "aviso-legal.html",
        title: "Aviso legal | Noticias Automáticas",
        description: "Aviso legal del sitio Noticias Automáticas.",
        heading: "Aviso legal",
        sections: [
          {
            title: "Titularidad del sitio",
            paragraphs: [
              "Este sitio web es una publicación informativa automática sobre noticias, organizada por categorías y actualizada de forma periódica.",
              "Las noticias, imágenes y enlaces externos provienen de fuentes públicas y servicios de terceros utilizados para agregación y monetización."
            ]
          },
          {
            title: "Condiciones de uso",
            paragraphs: [
              "El acceso al sitio implica la aceptación de este aviso legal y del resto de políticas publicadas.",
              "El contenido se ofrece con carácter informativo. Aunque se intenta mantener la mayor precisión posible, no se garantiza la ausencia total de errores, cambios de origen o interrupciones del servicio."
            ]
          },
          {
            title: "Responsabilidad y propiedad intelectual",
            paragraphs: [
              "Cada fuente citada conserva sus derechos sobre los contenidos originales. Las referencias, títulos y miniaturas se emplean con fines informativos y de enlace hacia la noticia original.",
              "Si detectas un problema de atribución, enlace o uso de contenido, puedes solicitar su revisión a través del sitio de contacto del proyecto."
            ]
          }
        ]
      },
      {
        fileName: "privacidad.html",
        title: "Política de privacidad | Noticias Automáticas",
        description: "Política de privacidad del sitio Noticias Automáticas.",
        heading: "Política de privacidad",
        sections: [
          {
            title: "Datos que puede tratar el sitio",
            paragraphs: [
              "Este sitio puede registrar métricas técnicas básicas de navegación, como visitas, clics y rendimiento, para mejorar la experiencia y la distribución de contenido.",
              "Si se usan formularios de contacto en el futuro, los datos aportados voluntariamente solo se emplearán para responder a la solicitud correspondiente."
            ]
          },
          {
            title: "Servicios de terceros",
            paragraphs: [
              "El sitio integra servicios externos como Google AdSense, contenido embebido de YouTube y fuentes de noticias de terceros.",
              "Estos proveedores pueden procesar información técnica del navegador conforme a sus propias políticas de privacidad."
            ]
          },
          {
            title: "Derechos y contacto",
            paragraphs: [
              "Si quieres solicitar aclaraciones sobre esta política o revisar información que te afecte, puedes hacerlo a través de los canales de contacto del proyecto.",
              "Revisamos esta política cuando cambia la forma en que el sitio procesa o publica información."
            ]
          }
        ]
      },
      {
        fileName: "cookies.html",
        title: "Política de cookies | Noticias Automáticas",
        description: "Política de cookies del sitio Noticias Automáticas.",
        heading: "Política de cookies",
        sections: [
          {
            title: "Cookies utilizadas",
            paragraphs: [
              "El sitio puede usar cookies técnicas para mantener funciones básicas, recordar preferencias de navegación y mejorar el rendimiento.",
              "También pueden emplearse cookies de publicidad y medición asociadas a Google AdSense y otros servicios de terceros integrados en las páginas."
            ]
          },
          {
            title: "Gestión de cookies",
            paragraphs: [
              "Puedes limitar o bloquear cookies desde la configuración de tu navegador. Si lo haces, algunas funciones o anuncios pueden dejar de mostrarse correctamente.",
              "Cuando se añadan mecanismos de consentimiento específicos, estas preferencias se respetarán según lo configurado por el usuario."
            ]
          },
          {
            title: "Actualizaciones",
            paragraphs: [
              "Esta política puede cambiar si se incorporan nuevos proveedores o tecnologías de seguimiento.",
              "Se recomienda revisarla periódicamente para conocer la versión vigente."
            ]
          }
        ]
      }
    ];

    for (const page of legalPages) {
      const html = buildLegalPageHtml(page);
      await writeFileAsync(path.join(ROOT_DIR, page.fileName), html);
    }

    console.log(`Actualización finalizada. Noticias generadas: ${generatedNews.length}`);
  } catch (error) {
    console.error("Error general en la actualización:", error);
  }
}

const runOnce = process.argv.includes("--once");

// Primera ejecución inmediata.
loadDotEnv();
actualizarNoticias();

// Si no se pide modo --once, mantiene la actualización automática cada 30 minutos.
if (!runOnce) {
  setInterval(() => {
    actualizarNoticias();
  }, REFRESH_INTERVAL_MS);
}
