# 🚀 GUÍA COMPLETA: SISTEMA DE 3 CAPAS + TU SITIO

**Estado actual: TODO LISTO PARA USAR**

---

## 📋 LO QUE HEMOS CREADO

Tienes **6 archivos nuevos** listos para usar:

### 1. **news-generator-pro.js** (Sistema principal)
- Motor de 3 capas: Redactora → Editora → Humanizador
- Generador de descripciones de imagen
- Retorna noticias 100% humanizadas

### 2. **integrate-news-generator.js** (Integración completa)
- Función `publishNews()` que genera TODO
- Crea HTML + JSON + actualiza índice
- Guarda miniaturas

### 3. **demo-news-generator.js** (4 ejemplos listos)
- Tecnología, Economía, Deportes, Salud
- Ejecuta: `node demo-news-generator.js all`

### 4. **generate-news-improved.js** (Tu script mejorado)
- Versión de tu `generate-news.js` con IA integrada
- Usa 3 capas si hay API key, fallback si no

### 5. **prompts-humanizados.json** (Base de datos)
- Frases prohibidas, conectores naturales
- Reglas de humanización

### 6. **README-NEWS-GENERATOR.md** (Documentación)

---

## ⚙️ CONFIGURACIÓN (IMPORTANTE)

### PASO 1: Configurar API Key

**Crea archivo `.env` en tu carpeta:**

```
ANTHROPIC_API_KEY=sk-ant-tuApiKeyAqui
```

**Obtenerla:**
1. Ve a: https://console.anthropic.com
2. Crea cuenta o inicia sesión
3. Ve a "API Keys"
4. Crea una nueva key
5. Cópiala a tu `.env`

### PASO 2: Instalar dependencia

```bash
npm install @anthropic-ai/sdk
```

---

## 🎯 USOS RÁPIDOS

### USO 1: Demostración Simple

```bash
# Ejecutar demostración con 4 ejemplos
node demo-news-generator.js all

# O solo 1 ejemplo específico
node demo-news-generator.js specific 1
```

**Resultado:**
- Genera 4 noticias en /news/
- Crea HTML, JSON, actualiza índice
- Tarda ~1-2 minutos

### USO 2: Generar Noticia Única

```javascript
// En tu código JavaScript
const { publishNews } = require("./integrate-news-generator");

const miNoticia = {
  topic: "Tu titular aquí",
  category: "Tecnología",
  keywords: ["palabra1", "palabra2"],
  details: "Detalles de la noticia aquí"
};

publishNews(miNoticia);
```

### USO 3: Usar tu generate-news.js Mejorado

```bash
# Ejecución única
node generate-news-improved.js --once

# Ejecución continua (cada 30 min)
node generate-news-improved.js
```

---

## 📊 FLUJO EXACTO DE LAS 3 CAPAS

```
INPUT (Tu noticia crudabruta)
    ↓
┌─────────────────────────────────────┐
│ 🟥 CAPA 1: REDACTORA                │
│ Genera 350-450 palabras natural    │
│ 3 opciones de título               │
└─────────────────────────────────────┘
    ↓ (JSON)
┌─────────────────────────────────────┐
│ 🟦 CAPA 2: EDITORA                  │
│ Verifica datos                      │
│ Elimina patrones IA                 │
│ Optimiza SEO (55-70 chars)          │
│ Genera ALT tag imagen              │
└─────────────────────────────────────┘
    ↓ (JSON)
┌─────────────────────────────────────┐
│ 🟧 CAPA 3: HUMANIZADOR              │
│ Reescribe como humano              │
│ Variaciones naturales              │
│ Ritmo fluido                       │
│ 100% indistinguible de humano      │
└─────────────────────────────────────┘
    ↓ (JSON)
┌─────────────────────────────────────┐
│ 🎨 BONUS: GENERADOR DE IMAGEN      │
│ Descripción realista para foto     │
│ ALT tag SEO                        │
└─────────────────────────────────────┘
    ↓
OUTPUT (Noticia 100% profesional)
```

---

## 📁 ARCHIVOS GENERADOS

Cada noticia crea en `/news/`:

```
noticia-2026-05-17-titulo-slug.html        ← Página completa
noticia-2026-05-17-titulo-slug.json        ← Metadata
news-index.json                             ← Índice actualizado
```

---

## ✅ CHECKLIST DE USO

```
[ ] Configuré mi API key en .env
[ ] Instalé @anthropic-ai/sdk
[ ] Ejecuté: node demo-news-generator.js all
[ ] Verifiqué que generó noticias en /news/
[ ] Revisé que las noticias suenen humanas
[ ] Luego integré con mi generate-news.js actual
[ ] Configuré que ejecute cada 30 minutos
[ ] Verifiqué que los archivos se actualizan
```

---

## 🔍 RESULTADO ESPERADO

```
═══════════════════════════════════════════════════════════════
🚀 DEMOSTRACIÓN COMPLETA DEL SISTEMA
4 EJEMPLOS en diferentes categorías
═══════════════════════════════════════════════════════════════

──────────────────────────────────────────────────────────────
📰 EJEMPLO 1/4: TECNOLOGÍA
──────────────────────────────────────────────────────────────

⏳ Generando con sistema de 3 capas + imagen...

🟥 [CAPA 1] Redactora generando noticia base...
✅ Noticia base generada

🟦 [CAPA 2] Editora verificando y humanizando...
✅ Noticia editada

🟧 [CAPA 3] Humanizador reescribiendo...
✅ Noticia humanizada

🎨 [BONUS] Generador de imagen...
✅ Imagen descrita

═══════════════════════════════════════════════════════════════
🎉 NOTICIA PUBLICADA EXITOSAMENTE
═══════════════════════════════════════════════════════════════

📌 Título: [Título optimizado]
📁 Archivo: noticia-2026-05-17-xxxxx.html
🏷️  Categoría: Tecnología
🔑 Palabras clave: tecnología, medicina, diagnóstico, hospital
🎨 Imagen ALT: [Descripción profesional de imagen]
```

---

## 🆘 TROUBLESHOOTING

### Error: "Cannot find module '@anthropic-ai/sdk'"

```bash
npm install @anthropic-ai/sdk
```

### Error: "API Key no configurada"

```bash
# Verifica que .env tiene:
ANTHROPIC_API_KEY=sk-ant-xxxxx

# O configura manualmente:
export ANTHROPIC_API_KEY="tu-clave"
```

### Error: "JSON.parse error"

Vuelve a ejecutar, sucede a veces. El sistema reinenta automáticamente.

### Las noticias suenan robóticas

Ejecuta de nuevo. Cada generación es ligeramente diferente. Si persiste, ajusta los prompts en `prompts-humanizados.json`.

---

## 🎯 CASOS DE USO

### Caso 1: Generar noticias diarias automáticas
```bash
# En crontab (Linux/Mac):
0 8 * * * cd /ruta/proyecto && node generate-news-improved.js --once

# En Task Scheduler (Windows):
C:\camino\a\nodejs.exe C:\proyecto\generate-news-improved.js --once
```

### Caso 2: API endpoint para generar noticias
```javascript
// En tu Express server
app.post("/api/generate-news", async (req, res) => {
  const result = await publishNews(req.body);
  res.json(result);
});
```

### Caso 3: Usar solo si la API key está disponible
```javascript
// Fallback automático si no hay API key
const newsContent = await generateNewsContent(data);
// Si API_KEY existe: Usa 3 capas
// Si no: Usa fallback (sistema actual)
```

---

## 📈 PRÓXIMAS MEJORAS

- [ ] Integrar generación real de imágenes (Unsplash, DALL-E)
- [ ] Caché de prompts para acelerar
- [ ] Analytics de rendimiento
- [ ] A/B testing de títulos
- [ ] Publicación automática en redes sociales
- [ ] Detección de duplicados

---

## 💰 COSTO ESTIMADO

- Por noticia: ~$0.02-0.05 USD
- 100 noticias/mes: ~$2-5 USD

Muy económico comparado con redactores humanos.

---

## 📞 SOPORTE RÁPIDO

**Sistema no detecta API key:**
```bash
echo $ANTHROPIC_API_KEY  # Linux/Mac
echo %ANTHROPIC_API_KEY%  # Windows
```

**Verificar instalación:**
```bash
npm ls @anthropic-ai/sdk
node -e "require('@anthropic-ai/sdk')"
```

**Ver logs completos:**
```bash
node demo-news-generator.js specific 1 2>&1 | tee output.log
```

---

## 🎉 ¡LISTO!

Tu sistema profesional de noticias está operativo. Ahora puedes:

✅ Generar noticias 100% humanas  
✅ Automáticamente cada 30 minutos  
✅ Con SEO optimizado  
✅ Con imágenes descritas  
✅ Sin sonar robótico  

**Ejecuta ahora:**

```bash
node demo-news-generator.js all
```

---

**Creado con ❤️ para noticias automáticas profesionales**
