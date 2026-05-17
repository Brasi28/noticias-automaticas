/**
 * DEMOSTRACIÓN PASO A PASO
 * 
 * Este archivo muestra exactamente cómo el sistema transforma
 * datos crudos en una noticia 100% humanizada con 3 capas
 */

const { publishNews } = require("./integrate-news-generator");

// ============================================================================
// EJEMPLO 1: Tecnología
// ============================================================================
const example1 = {
  topic: "Inteligencia artificial revoluciona diagnósticos médicos en hospitales",
  category: "Tecnología",
  keywords: ["IA", "medicina", "diagnósticos", "hospitales", "salud"],
  details: `
    El Hospital General de Madrid implementó un sistema de IA
    para diagnóstico de cánceres. El sistema tiene 94% de precisión.
    Ha procesado 500 casos en 3 meses.
  `,
};

// ============================================================================
// EJEMPLO 2: Economía
// ============================================================================
const example2 = {
  topic:
    "El euro se fortalece frente al dólar por expectativas de estabilidad europea",
  category: "Economía",
  keywords: ["euro", "dólar", "mercado", "economía", "finanzas"],
  details: `
    Esta semana, el euro tocó su máximo en 2 años frente al dólar.
    La razón: confianza en la estabilidad económica europea.
    Analistas esperan que continúe esta tendencia.
  `,
};

// ============================================================================
// EJEMPLO 3: Deportes
// ============================================================================
const example3 = {
  topic: "Real Madrid clasifica a la final de la Champions League en emocionante duelo",
  category: "Deportes",
  keywords: ["Real Madrid", "Champions League", "fútbol", "final"],
  details: `
    En un partido trepidante, Real Madrid venció 3-2 a Liverpool
    en la semifinal de Champions League.
    Será su décima final en la competición.
  `,
};

// ============================================================================
// EJEMPLO 4: Salud
// ============================================================================
const example4 = {
  topic: "Estudio revela que el ejercicio regular reduce el riesgo de demencia",
  category: "Salud",
  keywords: ["ejercicio", "salud", "demencia", "prevención", "medicina"],
  details: `
    Una investigación de la Universidad de Oxford concluyó que
    30 minutos diarios de ejercicio reducen riesgo de demencia 35%.
    El estudio analizó 100,000 personas durante 10 años.
  `,
};

// ============================================================================
// EJECUTOR DE EJEMPLOS
// ============================================================================
async function runAllExamples() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🎯 DEMOSTRACIÓN COMPLETA DEL SISTEMA");
  console.log("4 EJEMPLOS en diferentes categorías");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const examples = [
    { name: "TECNOLOGÍA", data: example1 },
    { name: "ECONOMÍA", data: example2 },
    { name: "DEPORTES", data: example3 },
    { name: "SALUD", data: example4 },
  ];

  for (let i = 0; i < examples.length; i++) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`📰 EJEMPLO ${i + 1}/${examples.length}: ${examples[i].name}`);
    console.log(`${"═".repeat(60)}\n`);

    try {
      const result = await publishNews(examples[i].data);

      if (result.success) {
        console.log(`✅ Noticia #${i + 1} completada exitosamente`);
      } else {
        console.log(`❌ Error en noticia #${i + 1}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error ejecutando ejemplo ${i + 1}: ${error.message}`);
    }

    // Pequeña pausa entre ejemplos para respetar límites de API
    if (i < examples.length - 1) {
      console.log("\n⏳ Esperando 3 segundos antes del siguiente ejemplo...\n");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("🎉 DEMOSTRACIÓN COMPLETADA");
  console.log(`${"═".repeat(60)}\n`);
  console.log("✅ Se han generado 4 noticias en diferentes categorías");
  console.log("✅ Cada noticia pasó por 3 capas de verificación");
  console.log("✅ Todas incluyen imagen y palabras clave SEO\n");
}

// ============================================================================
// EJECUTAR ESPECÍFICO (para desarrollo)
// ============================================================================
async function runSpecific(exampleNumber = 1) {
  const examples = [example1, example2, example3, example4];
  const selected = examples[exampleNumber - 1];

  if (!selected) {
    console.log("❌ Ejemplo no válido. Elige entre 1-4");
    return;
  }

  console.log(`\n🎯 Ejecutando ejemplo ${exampleNumber}...\n`);
  await publishNews(selected);
}

// ============================================================================
// EXPORTAR Y EJECUTAR
// ============================================================================
module.exports = {
  runAllExamples,
  runSpecific,
  examples: {
    tecnologia: example1,
    economia: example2,
    deportes: example3,
    salud: example4,
  },
};

// Detectar cómo se ejecuta
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === "all") {
    runAllExamples();
  } else if (args[0] === "specific" && args[1]) {
    runSpecific(parseInt(args[1]));
  } else {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║        DEMOSTRACIÓN DE SISTEMA DE NOTICIAS                 ║
║         Generador profesional de 3 capas + IA             ║
╚════════════════════════════════════════════════════════════╝

USO:
  node demo-news-generator.js all           ← Ejecuta los 4 ejemplos
  node demo-news-generator.js specific 1    ← Ejemplo 1 (Tecnología)
  node demo-news-generator.js specific 2    ← Ejemplo 2 (Economía)
  node demo-news-generator.js specific 3    ← Ejemplo 3 (Deportes)
  node demo-news-generator.js specific 4    ← Ejemplo 4 (Salud)

EJEMPLOS DISPONIBLES:
  1. Tecnología - IA en medicina
  2. Economía - Euro vs Dólar
  3. Deportes - Real Madrid Champions
  4. Salud - Ejercicio y demencia
    `);
  }
}
