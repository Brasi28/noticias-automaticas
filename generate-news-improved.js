/**
 * GENERATE-NEWS-IMPROVED.JS
 * 
 * Versión mejorada con soporte opcional para:
 * - Sistema de 3 capas de IA gratis (motor local)
 * - Fallback a sistema actual si el módulo no está disponible
 * 
 * INSTRUCCIONES:
 * 1. Ejecuta: node generate-news-improved.js
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const ROOT_DIR = __dirname;
const NEWS_DIR = path.join(ROOT_DIR, "news");
const ASSETS_DIR = path.join(ROOT_DIR, "assets");
const REFRESH_INTERVAL_MS = 1_800_000; // 30 minutos

// Sistema de 3 capas (opcional, motor local gratuito)
let newsGeneratorPro = null;
let hasFreeAISystem = false;

// ============================================================================
// CARGAR SISTEMA DE IA (si está disponible)
// ============================================================================

function loadAISystem() {
  try {
    newsGeneratorPro = require("./news-generator-pro.js");
    hasFreeAISystem = true;
    console.log("✅ Sistema de IA gratis (3 capas) cargado exitosamente\n");
    return true;
  } catch (err) {
    console.log("⚠️  Sistema de IA no disponible:", err.message);
    return false;
  }
}

// ============================================================================
// FUNCIÓN: Generar noticia con IA (3 capas) o fallback
// ============================================================================

async function generateNewsContent(newsData) {
  const { title, description, category, source, sourceUrl } = newsData;

  // Si está disponible el sistema gratis, usar 3 capas
  if (hasFreeAISystem && newsGeneratorPro) {
    try {
      console.log(`  🟥 Generando con IA 3 capas: "${title.substring(0, 50)}..."`);

      const topicData = {
        topic: title,
        category: category,
        keywords: extractKeywords(title, description),
        details: description,
      };

      const result = await newsGeneratorPro.generateProfessionalNews(topicData);
      return {
        success: true,
        isAI: true,
        fullSummary: result.cuerpo,
        titulo: result.titulo_final,
        entradilla: result.entradilla,
        keywords: result.palabras_clave,
        imagenAlt: result.imagen.alt,
      };
    } catch (error) {
      console.log(`  ⚠️  Fallback a generación manual: ${error.message}`);
      // Continuar con fallback
    }
  }

  // Fallback: generar resumen manualmente (sistema actual)
  return {
    success: true,
    isAI: false,
    fullSummary: buildSummaryFallback({ title, description, category, source }),
    titulo: title,
    entradilla: description.substring(0, 200),
    keywords: extractKeywords(title, description),
    imagenAlt: `${category} - ${title}`,
  };
}

// ============================================================================
// FUNCIÓN: Extraer palabras clave de título y descripción
// ============================================================================

function extractKeywords(title, description) {
  const text = `${title} ${description}`;
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);

  // Eliminar palabras vacías comunes
  const stopWords = [
    "para",
    "para",
    "según",
    "sobre",
    "durante",
    "dentro",
    "entre",
    "desde",
    "hasta",
    "antes",
    "después",
  ];
  const filtered = words.filter((w) => !stopWords.includes(w));

  // Retornar top 5 palabras únicas
  return [...new Set(filtered)].slice(0, 5);
}

// ============================================================================
// FUNCIÓN: Resumen fallback (sistema actual)
// ============================================================================

function buildSummaryFallback({ title, description, category, source }) {
  const cleanTitle = stripHtml(title);
  const cleanDescription = stripHtml(description);
  const dateText = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  let parts = [
    `En ${category}, la noticia "${cleanTitle}" ha captado una alta atención durante ${dateText}.`,
    cleanDescription || "Los primeros reportes señalan un movimiento relevante dentro del sector y una reacción inmediata en audiencias digitales.",
    `Según la cobertura inicial de ${source}, el contexto muestra una tendencia que podría marcar conversaciones durante las próximas jornadas.`,
    "El impacto no se limita al titular principal: también influye en decisiones de usuarios, marcas y actores clave del mercado.",
    `En términos prácticos, este desarrollo dentro de ${category} abre escenarios de seguimiento para profesionales, creadores y público general.`,
    "Por ahora, los datos disponibles indican un crecimiento en interés, búsquedas relacionadas y menciones en plataformas especializadas.",
    "Se espera que nuevas actualizaciones aporten precisión sobre alcance, consecuencias y próximos pasos del caso.",
  ];

  const fillerSentences = [
    `Analistas del ámbito de ${category} destacan que la velocidad de respuesta será determinante en la evolución de esta historia.`,
    "La reacción de la audiencia refleja que el tema combina actualidad, utilidad práctica y debate público.",
    "En paralelo, distintos portales han comenzado a comparar este hecho con eventos recientes para proyectar posibles escenarios.",
    "El seguimiento de los próximos comunicados oficiales ayudará a confirmar si la tendencia se consolida o cambia de dirección.",
    "Esta cobertura se actualiza de manera continua para mantener una visión clara, contextualizada y útil para lectura rápida.",
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

// ============================================================================
// HELPERS
// ============================================================================

function stripHtml(text = "") {
  return (text || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

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

function ensureDirectories() {
  if (!fs.existsSync(NEWS_DIR)) {
    fs.mkdirSync(NEWS_DIR, { recursive: true });
  }
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

// ============================================================================
// MAIN: Actualizar noticias
// ============================================================================

async function actualizarNoticias() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("📰 ACTUALIZANDO NOTICIAS", new Date().toLocaleString("es-ES"));
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    ensureDirectories();

    // Ejemplo: Generar una noticia de prueba
    const exampleNews = {
      title: "Inteligencia Artificial revoluciona diagnósticos en hospitales de España",
      description: "Un nuevo sistema de IA alcanza 94% de precisión en detección de cánceres. Ha procesado 500 casos en 3 meses.",
      category: "Tecnología",
      source: "Fuente Médica Nacional",
      sourceUrl: "https://example.com",
    };

    console.log(`📝 Generando contenido para: "${exampleNews.title}"\n`);

    const newsContent = await generateNewsContent(exampleNews);

    if (newsContent.isAI) {
      console.log("✅ Contenido generado con IA de 3 capas (profesional y humanizado)");
    } else {
      console.log("ℹ️  Contenido generado con sistema fallback");
    }

    console.log(`\n📌 TÍTULO: ${newsContent.titulo}`);
    console.log(`📍 CATEGORÍA: ${exampleNews.category}`);
    console.log(`🔑 KEYWORDS: ${newsContent.keywords.join(", ")}`);
    console.log(`\n📄 RESUMEN (primeras 200 caracteres):\n${newsContent.fullSummary.substring(0, 200)}...\n`);

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("✅ Actualización completada");
    console.log("═══════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ Error en actualización:", error.message);
  }
}

// ============================================================================
// EJECUTAR
// ============================================================================

async function main() {
  console.log("\n🚀 SISTEMA DE NOTICIAS MEJORADO (con IA opcional)");
  console.log("════════════════════════════════════════════════════════════════\n");

  loadDotEnv();
  loadAISystem();

  const runOnce = process.argv.includes("--once");

  // Primera ejecución inmediata
  await actualizarNoticias();

  // Si no se pide modo --once, mantiene actualización automática cada 30 minutos
  if (!runOnce) {
    console.log(`⏰ Próxima actualización en 30 minutos...\n`);
    setInterval(actualizarNoticias, REFRESH_INTERVAL_MS);
  }
}

main().catch(console.error);
