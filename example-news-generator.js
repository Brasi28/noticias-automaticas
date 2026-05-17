/**
 * EJEMPLO PRÁCTICO: Sistema completo funcionando
 * 
 * Este archivo demuestra el flujo completo de generación de noticias
 * humanizadas con las 3 capas de IA + imagen
 */

const { generateProfessionalNews } = require("./news-generator-pro");

// ============================================================================
// EJEMPLO: Noticia sobre IA en Educación
// ============================================================================
const exampleTopic = {
  topic: "La inteligencia artificial revoluciona el sistema educativo en México",
  category: "Tecnología",
  keywords: ["IA", "educación", "México", "aprendizaje", "innovación"],
  details: `
    En mayo de 2026, el Ministerio de Educación de México anunció la implementación
    de herramientas de IA en 500 escuelas públicas del país. El programa piloto
    incluye asistentes de IA personalizados para estudiantes y docentes.
    Se espera impactar a 50,000 estudiantes en el primer año.
    Expertos señalan que esto podría mejorar la educación personalizada.
  `,
};

// ============================================================================
// FUNCIÓN PARA EJECUTAR EL EJEMPLO
// ============================================================================
async function runExample() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚀 GENERADOR PROFESIONAL DE NOTICIAS - EJEMPLO COMPLETO");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    const news = await generateProfessionalNews(exampleTopic);

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("📰 NOTICIA GENERADA - RESULTADO FINAL");
    console.log("═══════════════════════════════════════════════════════════════\n");

    console.log(`📌 TÍTULO (Google Discover):\n${news.titulo_final}\n`);
    console.log(`📍 CATEGORÍA: ${news.metadata.categoria}`);
    console.log(`📅 FECHA: ${news.metadata.fecha}\n`);

    console.log("─────────────────────────────────────────────────────────────");
    console.log("🔤 ENTRADILLA:\n");
    console.log(news.entradilla);
    console.log("\n─────────────────────────────────────────────────────────────");
    console.log("📄 CUERPO:\n");
    console.log(news.cuerpo);
    console.log("\n─────────────────────────────────────────────────────────────");
    console.log("🎨 IMAGEN:\n");
    console.log(`Descripción: ${news.imagen.descripcion}\n`);
    console.log(`ALT Tag: "${news.imagen.alt}"\n`);

    console.log("─────────────────────────────────────────────────────────────");
    console.log("🏷️  PALABRAS CLAVE SEO:\n");
    console.log(news.palabras_clave.join(", "));
    console.log("\n─────────────────────────────────────────────────────────────");

    console.log("\n✅ NOTICIA GENERADA EXITOSAMENTE\n");
    console.log("═══════════════════════════════════════════════════════════════\n");

    // Retornar para usar en tests o integración
    return news;
  } catch (error) {
    console.error("❌ Error generando noticia:", error);
    process.exit(1);
  }
}

// ============================================================================
// EJECUTAR
// ============================================================================
if (require.main === module) {
  runExample();
}

module.exports = { runExample, exampleTopic };
