# 🚀 SISTEMA PROFESIONAL DE GENERACIÓN DE NOTICIAS HUMANIZADAS

**Sistema de 3 capas de IA + Generador de Imágenes para noticias 100% humanas**

---

## 📋 ÍNDICE

1. [Cómo funciona](#-cómo-funciona)
2. [Instalación y configuración](#-instalación-y-configuración)
3. [Uso rápido](#-uso-rápido)
4. [Ejemplo completo](#-ejemplo-completo)
5. [Integración con tu sitio](#-integración-con-tu-sitio)
6. [Normas de humanización](#-normas-de-humanización)

---

## 🎯 Cómo funciona

### Las 3 Capas de IA

```
┌─────────────────────────────────────────────────┐
│ 🟥 IA 1: REDACTORA                              │
│ Genera la noticia base (350-450 palabras)       │
│ - Tono periodístico natural                     │
│ - 3 opciones de título                          │
│ - Estructura con subtítulos                     │
└─────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────┐
│ 🟦 IA 2: EDITORA (Fact-Checker)                 │
│ Verifica, humaniza y optimiza SEO               │
│ - Elimina patrones de IA                        │
│ - Optimiza para Google Discover                 │
│ - Genera ALT tags para imagen                   │
│ - Extrae palabras clave SEO                     │
└─────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────┐
│ 🟧 IA 3: HUMANIZADOR FINAL                      │
│ Reescribe como periodista humano                │
│ - Variaciones naturales                         │
│ - Ritmo humano, fluido                          │
│ - Evita estructuras repetitivas                 │
│ - 100% indistinguible de humano                 │
└─────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────┐
│ 🎨 GENERADOR DE IMAGEN                          │
│ Describe imagen realista para la noticia        │
│ - Foto profesional, coherente                   │
│ - ALT tag optimizado SEO                        │
│ - Sin rostros o logos inventados                │
└─────────────────────────────────────────────────┘
```

---

## 📦 Instalación y configuración

### 1. Archivos necesarios

```
proyecto/
├── news-generator-pro.js          ← Sistema principal (3 capas + imagen)
├── example-news-generator.js      ← Ejemplo de uso
├── prompts-humanizados.json       ← Base de datos de prompts
└── README.md                       ← Este archivo
```

### 2. Requisitos

```bash
# Instalar dependencia Anthropic (si no la tienes)
npm install @anthropic-ai/sdk
```

### 3. Variables de entorno

```bash
# Asegúrate de tener configurada tu API key de Anthropic
export ANTHROPIC_API_KEY="tu-clave-aqui"
```

---

## 🚀 Uso rápido

### Opción 1: Ejecutar el ejemplo

```bash
node example-news-generator.js
```

Output esperado:

```
═══════════════════════════════════════════════════════════════
🚀 GENERADOR PROFESIONAL DE NOTICIAS - EJEMPLO COMPLETO
═══════════════════════════════════════════════════════════════

🟥 [CAPA 1] Redactora generando noticia base...
✅ Noticia base generada

🟦 [CAPA 2] Editora verificando y humanizando...
✅ Noticia editada

🟧 [CAPA 3] Humanizador reescribiendo...
✅ Noticia humanizada

🎨 [BONUS] Generador de imagen...
✅ Imagen descrita

═══════════════════════════════════════════════════════════════
📰 NOTICIA GENERADA - RESULTADO FINAL
═══════════════════════════════════════════════════════════════

📌 TÍTULO (Google Discover):
[Tu título optimizado aquí]

📍 CATEGORÍA: Tecnología
📅 FECHA: 17/5/2026

[Resto de la noticia...]
```

---

## 💻 Ejemplo completo

### Crear una noticia personalizada

```javascript
const { generateProfessionalNews } = require("./news-generator-pro");

const miNoticia = {
  topic: "España avanza en transición energética con nuevo parque solar",
  category: "Energía",
  keywords: ["energía solar", "España", "energías renovables", "sostenibilidad"],
  details: `
    El gobierno español inauguró un nuevo parque solar en Andalucía
    con capacidad de 150 MW. Este es el más grande del país.
    Se espera reducir emisiones de CO2 en 200,000 toneladas anuales.
  `,
};

async function main() {
  const noticia = await generateProfessionalNews(miNoticia);
  
  console.log("Título:", noticia.titulo_final);
  console.log("Categoría:", noticia.metadata.categoria);
  console.log("Palabras clave:", noticia.palabras_clave);
  console.log("\nCuerpo:", noticia.cuerpo);
  console.log("\nImagen ALT:", noticia.imagen.alt);
}

main();
```

---

## 🔗 Integración con tu sitio

### Integrar en `generate-news.js`

```javascript
const { generateProfessionalNews } = require("./news-generator-pro");
const fs = require("fs");

async function generateAndPublish(topicData) {
  // Generar noticia con el sistema de 3 capas
  const noticia = await generateProfessionalNews(topicData);
  
  // Preparar HTML
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <title>${noticia.titulo_final}</title>
  <meta name="description" content="${noticia.entradilla}">
  <meta name="keywords" content="${noticia.palabras_clave.join(', ')}">
</head>
<body>
  <article>
    <h1>${noticia.titulo_final}</h1>
    <p class="entradilla">${noticia.entradilla}</p>
    <img src="imagen.jpg" alt="${noticia.imagen.alt}">
    <div class="cuerpo">${noticia.cuerpo}</div>
  </article>
</body>
</html>
  `;
  
  // Guardar
  fs.writeFileSync(`news/noticia-${Date.now()}.html`, htmlContent);
  console.log("✅ Noticia publicada");
}
```

---

## ✅ Normas de humanización

### Prohibido absoluto

❌ "en conclusión"  
❌ "según informes"  
❌ "esto marca un hito"  
❌ "por otro lado"  
❌ "además"  
❌ "esta situación ha generado debate"  
❌ Párrafos de más de 25 palabras  
❌ Repetir palabras en párrafos consecutivos  
❌ 3 párrafos seguidos con la misma estructura gramatical  

### Permitido y recomendado

✅ "Lo cierto es que..."  
✅ "La realidad es..."  
✅ "Lo que sucede es..."  
✅ "De hecho"  
✅ "En la práctica"  
✅ "Ahora mismo"  
✅ Párrafos de 2-3 líneas  
✅ Variaciones lingüísticas naturales  
✅ Ritmo ágil y humano  

---

## 📊 Salida esperada

Cada noticia generada retorna:

```json
{
  "titulo_final": "Título optimizado para Google Discover",
  "entradilla": "2 frases de introducción",
  "cuerpo": "Cuerpo completo humanizado",
  "palabras_clave": ["palabra1", "palabra2", "palabra3"],
  "imagen": {
    "descripcion": "Descripción para generar imagen",
    "alt": "ALT tag optimizado SEO"
  },
  "metadata": {
    "categoria": "Tecnología",
    "fecha": "17/5/2026",
    "generado_por": "News Generator Pro"
  }
}
```

---

## 🎯 Checklist de uso

- [ ] ¿Tengo configurada la API Key de Anthropic?
- [ ] ¿He instalado la dependencia `@anthropic-ai/sdk`?
- [ ] ¿He probado el ejemplo con `node example-news-generator.js`?
- [ ] ¿He preparado mis datos de noticia (topic, category, keywords, details)?
- [ ] ¿He integrado el generador en mi flujo actual?
- [ ] ¿He verificado que las noticias suenen 100% humanas?

---

## 🆘 Troubleshooting

**Error: "API Key no configurada"**

```bash
export ANTHROPIC_API_KEY="tu-clave-aqui"
# O en Windows:
set ANTHROPIC_API_KEY=tu-clave-aqui
```

**Error: "JSON.parse error"**

Asegúrate que la IA retorna JSON válido. Si falla, intenta con un topic más específico.

**La noticia suena robótica**

Ejecuta nuevamente el proceso. Cada generación es ligeramente diferente.

---

## 🔄 Próximas mejoras

- [ ] Caché de prompts para acelerar generación
- [ ] Integración con Unsplash para imágenes reales
- [ ] Generación de thumbnails automatizada
- [ ] Analytics de rendimiento de noticias
- [ ] A/B testing de títulos

---

## 📝 Notas

- Cada generación usa 3 llamadas a la API de Claude
- Tiempo estimado: 20-30 segundos por noticia
- Costo aproximado: $0.10-0.15 por noticia
- Todas las noticias pasan por 3 capas de verificación

---

**Creado con ❤️ para noticias humanizadas**

Sistema profesional de redacción automática que respeta la integridad periodística.
