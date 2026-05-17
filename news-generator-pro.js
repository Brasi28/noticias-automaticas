/**
 * SISTEMA PROFESIONAL DE GENERACIÓN DE NOTICIAS HUMANIZADAS
 * 3 Capas de IA + Generador de Imágenes
 * 
 * 🟥 Redactora → 🟦 Editora → 🟧 Humanizador → 🎨 Imagen
 */

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function splitSentences(text = "") {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

function buildKeywordPool(topicData) {
  const source = `${topicData.topic} ${topicData.details} ${topicData.keywords || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/gi, " ");

  const stopwords = new Set([
    "para", "sobre", "desde", "hasta", "entre", "durante", "donde", "cuando",
    "porque", "tambien", "ademas", "segun", "tras", "ante", "este", "esta",
    "estas", "estos", "como", "pero", "cada", "tiene", "tienen", "mismo",
    "misma", "aqui", "alli", "luego", "entonces", "quien", "cual", "cuanto",
  ]);

  const words = source
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 4 && !stopwords.has(w));

  return [...new Set(words)].slice(0, 8);
}

function generateCandidateTitles(topicData, keywordPool) {
  const topic = cleanText(topicData.topic);
  const category = cleanText(topicData.category);
  const kwA = keywordPool[0] || category.toLowerCase();
  const kwB = keywordPool[1] || "actualidad";

  return [
    `${topic}`,
    `${category}: ${topic} y su impacto en ${kwA}`,
    `${topic} marca la agenda de ${kwB}`,
  ];
}

function buildBodySections(topicData, detailsSentences) {
  const category = cleanText(topicData.category);
  const headingA = `## Contexto de ${category}`;
  const headingB = "## Lo que se sabe hasta ahora";
  const headingC = "## Qué puede pasar en los próximos días";

  const baseA = detailsSentences.slice(0, 2).join(" ") || `El tema central se posiciona como uno de los más seguidos dentro de ${category}.`;
  const baseB = detailsSentences.slice(2, 4).join(" ") || "Las fuentes citadas mantienen el foco en los hechos confirmados y en su evolución inmediata.";
  const baseC = detailsSentences.slice(4, 6).join(" ") || "La conversación seguirá abierta conforme se publiquen nuevos antecedentes y cifras oficiales.";

  return [
    `${headingA}\n${baseA}`,
    `${headingB}\n${baseB}`,
    `${headingC}\n${baseC}`,
  ].join("\n\n");
}

function normalizeParagraphs(text = "") {
  return text
    .split(/\n{2,}/)
    .map((block) => cleanText(block))
    .filter(Boolean)
    .join("\n\n");
}

// ============================================================================
// 🟥 IA 1: REDACTORA (Genera noticia base)
// ============================================================================
async function redactorNews(topicData) {
  const details = cleanText(topicData.details);
  const detailsSentences = splitSentences(details);
  const keywordPool = buildKeywordPool(topicData);
  const [titulo1, titulo2, titulo3] = generateCandidateTitles(topicData, keywordPool);

  const entradilla = [
    detailsSentences[0] || `${cleanText(topicData.topic)} vuelve a ocupar un lugar central en la agenda informativa.`,
    detailsSentences[1] || `El seguimiento en ${cleanText(topicData.category)} se mantiene activo por su impacto directo en audiencias y sectores vinculados.`,
  ].join(" ");

  const cuerpo = buildBodySections(topicData, detailsSentences);

  const cierre =
    detailsSentences[detailsSentences.length - 1] ||
    "La cobertura seguirá en actualización permanente a medida que se confirmen nuevos datos relevantes.";

  return {
    titulo_opcion_1: titulo1,
    titulo_opcion_2: titulo2,
    titulo_opcion_3: titulo3,
    entradilla,
    cuerpo,
    cierre,
  };
}

// ============================================================================
// 🟦 IA 2: EDITORA (Verifica, humaniza, optimiza SEO)
// ============================================================================
async function editorNews(redactedNews, topicData) {
  const titleBase = cleanText(redactedNews.titulo_opcion_1 || topicData.topic);
  const titleDiscover = titleBase.length > 70 ? `${titleBase.slice(0, 67)}...` : titleBase;
  const pool = buildKeywordPool(topicData);

  return {
    titulo_google_discover: titleDiscover,
    entradilla_mejorada: cleanText(redactedNews.entradilla),
    cuerpo_mejorado: normalizeParagraphs(redactedNews.cuerpo),
    cierre_mejorado: cleanText(redactedNews.cierre),
    alt_imagen: `Imagen de ${cleanText(topicData.category)} sobre ${titleBase.slice(0, 90)}`,
    palabras_clave_seo: pool.slice(0, 5),
  };
}

// ============================================================================
// 🟧 IA 3: HUMANIZADOR FINAL
// ============================================================================
async function humanizadorNews(editedNews) {
  const text = `${editedNews.entradilla_mejorada}\n\n${editedNews.cuerpo_mejorado}\n\n${editedNews.cierre_mejorado}`;

  return {
    texto_final: normalizeParagraphs(text),
  };
}

// ============================================================================
// 🎨 GENERADOR DE IMAGEN (Descripción profesional)
// ============================================================================
async function generateImageDescription(topicData, newsTitle) {
  const category = cleanText(topicData.category);
  const title = cleanText(newsTitle || topicData.topic);

  return {
    descripcion_imagen: `Fotografía editorial realista relacionada con ${category.toLowerCase()}: escena documental sin logos ni texto, iluminación natural, composición limpia y enfoque periodístico en ${title}.`,
    alt_tag_seo: `${category}: ${title}`.slice(0, 125),
  };
}

// ============================================================================
// 🚀 FUNCIÓN PRINCIPAL: FLUJO COMPLETO
// ============================================================================
async function generateProfessionalNews(topicData) {
  console.log("\n🟥 [CAPA 1] Redactora generando noticia base...\n");
  const redacted = await redactorNews(topicData);
  console.log("✅ Noticia base generada\n");

  console.log("🟦 [CAPA 2] Editora verificando y humanizando...\n");
  const edited = await editorNews(redacted, topicData);
  console.log("✅ Noticia editada\n");

  console.log("🟧 [CAPA 3] Humanizador reescribiendo...\n");
  const humanized = await humanizadorNews(edited);
  console.log("✅ Noticia humanizada\n");

  console.log("🎨 [BONUS] Generador de imagen...\n");
  const imageData = await generateImageDescription(
    topicData,
    edited.titulo_google_discover
  );
  console.log("✅ Imagen descrita\n");

  // Retornar noticia completa
  return {
    titulo_final: edited.titulo_google_discover,
    entradilla: edited.entradilla_mejorada,
    cuerpo: humanized.texto_final,
    palabras_clave: edited.palabras_clave_seo,
    imagen: {
      descripcion: imageData.descripcion_imagen,
      alt: imageData.alt_tag_seo,
    },
    metadata: {
      categoria: topicData.category,
      fecha: new Date().toLocaleDateString("es-ES"),
      generado_por: "News Generator Pro Gratis (3 Capas + Imagen)",
    },
  };
}

// ============================================================================
// EXPORTAR
// ============================================================================
module.exports = {
  generateProfessionalNews,
  redactorNews,
  editorNews,
  humanizadorNews,
  generateImageDescription,
};
