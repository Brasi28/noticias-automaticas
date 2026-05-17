/**
 * INTEGRACIÓN DEL GENERADOR PROFESIONAL CON TU FLUJO ACTUAL
 * 
 * Este script conecta el sistema de 3 capas + imagen
 * con tu pipeline de generación de noticias existente
 */

const { generateProfessionalNews } = require("./news-generator-pro");
const fs = require("fs");
const path = require("path");

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Genera slugs seguros para URLs
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[áàâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

/**
 * Genera nombre de archivo para la noticia
 */
function generateFilename(title) {
  const date = new Date().toISOString().split("T")[0];
  const slug = generateSlug(title);
  return `noticia-${date}-${slug}`;
}

/**
 * Genera HTML completo para la noticia
 */
function generateHTML(news, filename) {
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${news.titulo_final} | Noticias Artilleros del Caos</title>
  <meta name="description" content="${news.entradilla.substring(0, 160)}">
  <meta name="keywords" content="${news.palabras_clave.join(", ")}">
  <meta property="og:title" content="${news.titulo_final}">
  <meta property="og:description" content="${news.entradilla}">
  <meta property="og:type" content="article">
  <meta name="author" content="Noticias Artilleros del Caos">
  <meta name="article:published_time" content="${new Date().toISOString()}">
  <meta name="article:section" content="${news.metadata.categoria}">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <article class="noticia-completa">
    <header class="noticia-header">
      <h1>${news.titulo_final}</h1>
      <div class="noticia-meta">
        <span class="categoria">${news.metadata.categoria}</span>
        <span class="fecha">${today}</span>
      </div>
    </header>

    <figure class="noticia-imagen">
      <img 
        src="../assets/noticias/${filename}.jpg" 
        alt="${news.imagen.alt}"
        loading="lazy"
      >
      <figcaption>${news.imagen.alt}</figcaption>
    </figure>

    <div class="noticia-contenido">
      <p class="entradilla"><strong>${news.entradilla}</strong></p>
      
      <div class="cuerpo">
        ${news.cuerpo
          .split("\n\n")
          .map((parrafo) => `<p>${parrafo}</p>`)
          .join("")}
      </div>

      <footer class="noticia-footer">
        <p class="generador">
          Noticia generada automáticamente con sistema de verificación editorial.
        </p>
        <div class="tags">
          ${news.palabras_clave.map((tag) => `<a href="../index.html?tag=${encodeURIComponent(tag)}">#${tag}</a>`).join(" ")}
        </div>
      </footer>
    </div>
  </article>

  <style>
    .noticia-completa {
      max-width: 800px;
      margin: 2rem auto;
      padding: 1.5rem;
      font-family: "Roboto", sans-serif;
      color: #c0c0c0;
      line-height: 1.6;
    }

    .noticia-header {
      margin-bottom: 2rem;
      border-bottom: 2px solid #d00000;
      padding-bottom: 1rem;
    }

    .noticia-header h1 {
      font-size: 2rem;
      color: #fff;
      margin: 0 0 1rem 0;
      line-height: 1.3;
    }

    .noticia-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: #9e9e9e;
    }

    .noticia-meta .categoria {
      background: rgba(208, 0, 0, 0.2);
      color: #ff7a60;
      padding: 0.3rem 0.8rem;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: bold;
      font-size: 0.8rem;
    }

    .noticia-imagen {
      margin: 2rem 0;
      text-align: center;
    }

    .noticia-imagen img {
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid rgba(128, 128, 128, 0.4);
    }

    .noticia-imagen figcaption {
      font-size: 0.85rem;
      color: #9e9e9e;
      margin-top: 0.5rem;
      font-style: italic;
    }

    .noticia-contenido {
      font-size: 1.05rem;
      line-height: 1.8;
    }

    .entradilla {
      font-size: 1.2rem;
      color: #fff;
      margin-bottom: 1.5rem;
      border-left: 4px solid #d00000;
      padding-left: 1rem;
    }

    .cuerpo p {
      margin-bottom: 1.2rem;
      text-align: justify;
    }

    .noticia-footer {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(128, 128, 128, 0.4);
    }

    .generador {
      font-size: 0.85rem;
      color: #9e9e9e;
      margin-bottom: 1rem;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tags a {
      background: linear-gradient(180deg, #1b1f28, #0c0f15);
      color: #f2f4f8;
      padding: 0.4rem 0.8rem;
      border-radius: 4px;
      text-decoration: none;
      border: 1px solid rgba(95, 102, 115, 0.56);
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .tags a:hover {
      border-color: rgba(255, 110, 70, 0.8);
      color: #fff;
    }

    @media (max-width: 768px) {
      .noticia-completa {
        padding: 1rem;
      }

      .noticia-header h1 {
        font-size: 1.5rem;
      }

      .noticia-contenido {
        font-size: 1rem;
      }
    }
  </style>
</body>
</html>`;
}

/**
 * Genera entrada JSON para el índice de noticias
 */
function generateJSONEntry(news, filename) {
  return {
    id: filename,
    titulo: news.titulo_final,
    entradilla: news.entradilla,
    categoria: news.metadata.categoria,
    palabras_clave: news.palabras_clave,
    fecha: news.metadata.fecha,
    archivo: `news/${filename}.html`,
    imagen: {
      src: `assets/noticias/${filename}.jpg`,
      alt: news.imagen.alt,
    },
    generado: new Date().toISOString(),
  };
}

/**
 * Publica una noticia completa (HTML + JSON + entrada en índice)
 */
async function publishNews(topicData, outputDir = "./news") {
  console.log("\n📰 GENERANDO Y PUBLICANDO NOTICIA...\n");

  try {
    // 1. Generar noticia con 3 capas
    console.log("⏳ Generando con sistema de 3 capas + imagen...");
    const news = await generateProfessionalNews(topicData);
    console.log("✅ Noticia generada exitosamente\n");

    // 2. Preparar archivos
    const filename = generateFilename(news.titulo_final);
    const htmlContent = generateHTML(news, filename);
    const jsonEntry = generateJSONEntry(news, filename);

    // 3. Crear directorio si no existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 4. Guardar HTML
    const htmlPath = path.join(outputDir, `${filename}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`✅ HTML guardado: ${htmlPath}`);

    // 5. Guardar información JSON
    const jsonPath = path.join(outputDir, `${filename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonEntry, null, 2));
    console.log(`✅ JSON guardado: ${jsonPath}`);

    // 6. Actualizar índice
    const indexPath = path.join(outputDir, "news-index.json");
    let index = [];
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    }
    index.unshift(jsonEntry); // Agregar al principio (más reciente)
    index = index.slice(0, 100); // Mantener últimas 100 noticias
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`✅ Índice actualizado: ${indexPath}`);

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("🎉 NOTICIA PUBLICADA EXITOSAMENTE");
    console.log("═══════════════════════════════════════════════════════════════\n");
    console.log(`📌 Título: ${news.titulo_final}`);
    console.log(`📁 Archivo: ${filename}.html`);
    console.log(`🏷️  Categoría: ${news.metadata.categoria}`);
    console.log(`🔑 Palabras clave: ${news.palabras_clave.join(", ")}`);
    console.log(`🎨 Imagen ALT: ${news.imagen.alt}\n`);

    return {
      success: true,
      filename,
      news,
      paths: {
        html: htmlPath,
        json: jsonPath,
        index: indexPath,
      },
    };
  } catch (error) {
    console.error("❌ Error publicando noticia:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// EXPORTAR
// ============================================================================
module.exports = {
  publishNews,
  generateHTML,
  generateJSONEntry,
  generateFilename,
  generateSlug,
};

// ============================================================================
// USO DIRECTO (si se ejecuta como script)
// ============================================================================
if (require.main === module) {
  const exampleNews = {
    topic:
      "Nuevas regulaciones de IA impulsan inversión tecnológica en América Latina",
    category: "Tecnología",
    keywords: ["IA", "regulación", "inversión", "América Latina", "tecnología"],
    details: `
      El 15 de mayo de 2026, varios países de América Latina anunciaron nuevas
      regulaciones para el uso de inteligencia artificial en el sector empresarial.
      Brazil, México y Colombia presentaron marcos normativos similares.
      Expertos predicen un aumento del 35% en inversión en startups de IA.
    `,
  };

  publishNews(exampleNews);
}
