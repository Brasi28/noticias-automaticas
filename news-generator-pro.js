/**
 * NEWS GENERATOR PRO v3 — Sara, Editora Jefe
 *
 * CAPA 1: Redactora Base        — Estructura la noticia desde la fuente RSS
 * CAPA 2: Editora SEO           — Limpia, optimiza titulo y keywords
 * CAPA 3: Sara (Claude Editora) — Verifica 3 fuentes, reescribe como periodista
 *                                  joven de 28 años, innovadora y directa
 * CAPA 4: Humanizador Final     — Revision final anti-IA, tono natural
 * CAPA 5: Supervisor            — Anti-duplicados, memoria editorial, logs
 *
 * IMAGEN: Si hay imagen real -> se usa. Si no -> IA genera portada editorial.
 */

"use strict";

require("dotenv").config();
const fs   = require("fs");
const path = require("path");

// ─── SDK Claude ──────────────────────────────────────────────────────────────
let Anthropic;
try { Anthropic = require("@anthropic-ai/sdk"); } catch { Anthropic = null; }

const CLAUDE_API_KEY    = process.env.CLAUDE_API_KEY || "";
const CLAUDE_MODEL      = "claude-sonnet-4-5";
const CLAUDE_MAX_TOKENS = 1400;
const claudeOK          = !!(Anthropic && CLAUDE_API_KEY && !CLAUDE_API_KEY.includes("PON-TU-CLAVE"));

// ============================================================================
// BUDGET CONTROLLER — Límite mensual 5€, escalado automático por clicks
// ============================================================================

const BUDGET_FILE    = path.join(LOG_DIR, "budget.json");
const ANALYTICS_FILE = path.join(__dirname, "news", "analytics-summary.json");

// Precio Claude Sonnet 4.5 (€) por token (aprox. según tarifa Anthropic con cambio 1USD=0.92€)
const PRICE_IN_PER_TOKEN  = 0.00000276;  // $3/MTok input  → €/token
const PRICE_OUT_PER_TOKEN = 0.01380 / 1000; // $15/MTok output → €/token

function loadBudget() {
  const now   = new Date();
  const mesId = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  if (!fs.existsSync(BUDGET_FILE)) return { mesId, gastoEuros: 0, articulos: 0, limiteBase: 5.0, limiteReal: 5.0 };
  try {
    const b = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
    if (b.mesId !== mesId) return { mesId, gastoEuros: 0, articulos: 0, limiteBase: b.limiteBase || 5.0, limiteReal: b.limiteBase || 5.0 };
    return b;
  } catch { return { mesId, gastoEuros: 0, articulos: 0, limiteBase: 5.0, limiteReal: 5.0 }; }
}

function saveBudget(b) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(b, null, 2));
}

function loadAnalytics() {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf8"));
  } catch {}
  return { totalClicks: 0, estimatedRevenueEur: 0 };
}

/**
 * Calcula el límite real para este ciclo.
 * Si los ingresos estimados del mes > limiteBase, escala hasta 2× el límite.
 */
function calcLimiteReal(b) {
  const analytics = loadAnalytics();
  const ingresos  = analytics.estimatedRevenueEur || 0;
  if (ingresos >= b.limiteBase) {
    // Cada euro de ingreso extra permite 0.5€ extra en Claude, máx 2× la base
    const extra = Math.min(ingresos - b.limiteBase, b.limiteBase) * 0.5;
    return b.limiteBase + extra;
  }
  return b.limiteBase;
}

/**
 * Registra el coste de una llamada Claude y devuelve si hay presupuesto restante.
 * @param {number} tokensIn   Tokens de entrada consumidos
 * @param {number} tokensOut  Tokens de salida consumidos
 * @returns {{ permitido: boolean, gastoEuros: number, restanteEuros: number }}
 */
function registrarCoste(tokensIn, tokensOut) {
  const b       = loadBudget();
  b.limiteReal  = calcLimiteReal(b);
  const coste   = tokensIn * PRICE_IN_PER_TOKEN + tokensOut * PRICE_OUT_PER_TOKEN;
  b.gastoEuros += coste;
  b.articulos  += 1;
  const restante = b.limiteReal - b.gastoEuros;
  saveBudget(b);
  return { permitido: restante > 0, gastoEuros: b.gastoEuros, restanteEuros: restante, limiteReal: b.limiteReal };
}

function presupuestoDisponible() {
  const b      = loadBudget();
  b.limiteReal = calcLimiteReal(b);
  const ok     = (b.limiteReal - b.gastoEuros) > 0;
  if (!ok) console.log(`  [Budget] ⛔ Límite mensual alcanzado (€${b.gastoEuros.toFixed(3)} / €${b.limiteReal.toFixed(2)}) — fallback local activo`);
  else     console.log(`  [Budget] ✅ Disponible €${(b.limiteReal - b.gastoEuros).toFixed(3)} de €${b.limiteReal.toFixed(2)} este mes`);
  return ok;
}

const LOG_DIR     = path.join(__dirname, "editorial-logs");
const MEMORY_FILE = path.join(LOG_DIR, "memory.json");

// ============================================================================
// UTILIDADES
// ============================================================================

function clean(v)  { return String(v || "").replace(/\s+/g, " ").trim(); }
function sents(t)  { return clean(t).split(/(?<=[.!?])\s+/).filter(Boolean); }
function normp(t)  { return String(t||"").split(/\n{2,}/).map(b=>clean(b)).filter(Boolean).join("\n\n"); }

function keywords(topicData) {
  const src = (topicData.topic+" "+topicData.details+" "+(topicData.keywords||""))
    .toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi," ");
  const stop = new Set(["para","sobre","desde","hasta","entre","durante","donde","cuando",
    "porque","tambien","ademas","segun","tras","ante","este","esta","como","pero","cada",
    "tiene","tienen","mismo","aqui","luego","entonces","quien","cual"]);
  return [...new Set(src.split(/\s+/).filter(w=>w.length>4&&!stop.has(w)))].slice(0,8);
}

const FRASES_IA = [
  /en conclusi[oó]n/gi,/por otro lado/gi,/esto marca un hito/gi,/seg[uú]n informes/gi,
  /en definitiva/gi,/en resumen/gi,/en este sentido/gi,/por consiguiente/gi,
  /cabe destacar/gi,/es importante señalar/gi,/sin lugar a dudas/gi,
  /en el marco de/gi,/a modo de resumen/gi,/queda claro que/gi,/no cabe duda/gi,
  /en el contexto actual/gi,/a lo largo del tiempo/gi,/resulta evidente/gi
];

function limpiarIA(t) {
  let r=t; for (const re of FRASES_IA) r=r.replace(re,"");
  return r.replace(/\s{2,}/g," ").trim();
}

// ============================================================================
// CAPA 1: REDACTORA BASE
// ============================================================================

async function redactora(topicData) {
  const d    = clean(topicData.details);
  const ss   = sents(d);
  const pool = keywords(topicData);
  const cat  = clean(topicData.category);
  const tpc  = clean(topicData.topic);

  const entradilla = [
    ss[0] || tpc+" centra la atención informativa de hoy.",
    ss[1] || "El impacto en "+cat+" se extiende a audiencias y sectores clave."
  ].join(" ");

  const cuerpo = [
    "## Qué está pasando\n"+(ss.slice(0,2).join(" ")||"Los hechos se desarrollan en el ámbito de "+cat+"."),
    "## Lo que confirman las fuentes\n"+(ss.slice(2,4).join(" ")||"Las fuentes disponibles apuntan a una evolución rápida de los hechos."),
    "## Qué viene ahora\n"+(ss.slice(4,6).join(" ")||"Se esperan novedades en las próximas horas que definirán el alcance real del asunto.")
  ].join("\n\n");

  const cierre = ss[ss.length-1]||"La cobertura se actualiza en tiempo real conforme llegan datos contrastados.";

  return { titulo: tpc, entradilla, cuerpo, cierre, pool };
}

// ============================================================================
// CAPA 2: EDITORA SEO
// ============================================================================

async function editoraSEO(base, topicData) {
  const titleBase = clean(base.titulo||topicData.topic);
  const titleSEO  = titleBase.length>70 ? titleBase.slice(0,67)+"..." : titleBase;
  const pool      = keywords(topicData);

  function reesc(text, tipo) {
    const lc = limpiarIA(text);
    if (tipo==="entradilla") {
      return sents(lc).slice(0,2).map(f=>f[0].toUpperCase()+f.slice(1)).join(". ")+".";
    }
    if (tipo==="cuerpo") {
      const usadas=new Set(); const out=[];
      for (const b of lc.split(/\n{2,}/).map(b=>b.trim()).filter(Boolean)) {
        if (/^##\s/.test(b)) { out.push("\n\n"+b+"\n"); continue; }
        const ff=sents(b).filter(f=>f&&!usadas.has(f)).map(f=>{usadas.add(f);return f[0].toUpperCase()+f.slice(1);});
        out.push(ff.join(". ")+".");
      }
      return out.join("\n\n");
    }
    const ff=sents(lc).filter(Boolean); const c=ff.pop()||"";
    return c[0].toUpperCase()+c.slice(1)+".";
  }

  return {
    titulo_seo:   titleSEO,
    entradilla:   reesc(clean(base.entradilla),"entradilla"),
    cuerpo:       reesc(normp(base.cuerpo),"cuerpo"),
    cierre:       reesc(clean(base.cierre),"cierre"),
    kw:           pool.slice(0,5)
  };
}

// ============================================================================
// CAPA 3: SARA — CLAUDE EDITORA JEFE (28 años, innovadora, directa)
// ============================================================================

async function sara(edited, topicData) {
  const textoBase = [edited.entradilla, edited.cuerpo, edited.cierre].join("\n\n");
  const source    = clean(topicData.sourceName || "fuente verificada");
  const sourceUrl = clean(topicData.sourceUrl  || "");
  const hasImg    = topicData.hasRealImage ? "SÍ tiene imagen real del artículo original" : "NO tiene imagen real — se usará portada generada por IA";
  const categoria = clean(topicData.category);

  if (!claudeOK) {
    console.log("  [Sara] Claude no disponible. Humanizador local activo.");
    return humanizadorLocal(textoBase);
  }

  if (!presupuestoDisponible()) {
    console.log("  [Sara] Sin presupuesto este mes. Humanizador local activo.");
    return humanizadorLocal(textoBase);
  }

  const prompt =
`Eres Sara, periodista digital española de 28 años. Llevas 6 años en redacciones digitales y eres conocida por tu escritura ágil, directa y con personalidad. Odias las frases vacías y el estilo robótico de la IA. Tu especialidad es hacer que una noticia enganche desde la primera línea.

CONTEXTO DE ESTA NOTICIA:
- Categoría: ${categoria}
- Fuente original: ${source}${sourceUrl ? " ("+sourceUrl+")" : ""}
- Imagen: ${hasImg}
- Palabras clave SEO: ${edited.kw.join(", ")}

TU TAREA (sigue este orden exacto):

1. VERIFICACIÓN (no la publiques, solo úsala internamente):
   ¿Este tema es verosímil y coherente con lo que sabemos del mundo real?
   Cita mentalmente 3 fuentes de referencia que podrían confirmar este tipo de noticia:
   a) Un medio nacional/internacional reconocido
   b) Una fuente institucional o gubernamental
   c) Una fuente especializada del sector "${categoria}"
   Si el tema parece inventado o incoherente, indícalo al final con [ALERTA-VERIFICACION].

2. REESCRITURA COMO SARA:
   - Párrafos de máximo 3 frases. Ritmo ágil.
   - Primera frase: gancho directo. Sin contexto previo, sin rodeos.
   - Conserva los subtítulos ## tal como están.
   - Usa conectores naturales: "Lo que sí es claro es que...", "Y aquí viene lo interesante:", "Nadie lo dice, pero...", "El dato que cambia todo:"
   - PROHIBIDO: "cabe destacar", "en este sentido", "resulta evidente", "sin lugar a dudas", "en conclusión", "según informes", "en el marco de"
   - Escribe como si le estuvieras contando la noticia a un amigo inteligente que no tiene tiempo.
   - Si la noticia NO tiene imagen real, añade al final una línea con el formato exacto:
     [IMAGEN-IA: descripción fotorrealista de 1 frase para generar la portada de esta noticia]

3. FORMATO DE SALIDA:
   Devuelve SOLO el texto reescrito (con los ## conservados).
   Si hay alerta de verificación, añade [ALERTA-VERIFICACION: motivo] al final.
   Si necesitas imagen IA, añade [IMAGEN-IA: descripción] al final.

TEXTO ORIGINAL:
${textoBase}`;

  try {
    const client   = new Anthropic({ apiKey: CLAUDE_API_KEY });
    const response = await client.messages.create({
      model: CLAUDE_MODEL, max_tokens: CLAUDE_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }]
    });

    const usage = response.usage || {};
    const budget = registrarCoste(usage.input_tokens || 800, usage.output_tokens || 600);
    console.log(`  [Budget] Sara — €${budget.gastoEuros.toFixed(3)} / €${budget.limiteReal.toFixed(2)}`);

    const raw = (response.content&&response.content[0]&&response.content[0].text)||textoBase;

    // Extraer instrucción de imagen si la hay
    const imgMatch = raw.match(/\[IMAGEN-IA:\s*(.+?)\]/i);
    const imagenDesc = imgMatch ? imgMatch[1].trim() : null;

    // Extraer alerta de verificación si la hay
    const alertMatch = raw.match(/\[ALERTA-VERIFICACION:\s*(.+?)\]/i);
    const alertaVerif = alertMatch ? alertMatch[1].trim() : null;

    // Limpiar marcas del texto final
    let textoFinal = raw
      .replace(/\[IMAGEN-IA:[^\]]+\]/gi,"")
      .replace(/\[ALERTA-VERIFICACION:[^\]]+\]/gi,"")
      .trim();

    if (alertaVerif) console.log("  [Sara] ALERTA VERIFICACION: "+alertaVerif);
    if (imagenDesc)  console.log("  [Sara] Instruccion imagen IA: "+imagenDesc.slice(0,80)+"...");
    console.log("  [Sara] Reescritura completada.");

    return { texto_final: normp(textoFinal), imagenDesc, alertaVerif };
  } catch (err) {
    console.log("  [Sara] Error Claude ("+err.message+") — humanizador local activo.");
    return humanizadorLocal(textoBase);
  }
}

// ============================================================================
// CAPA 4: HUMANIZADOR FINAL
// ============================================================================

async function humanizadorFinal(textoSara, topicData) {
  if (!claudeOK || !textoSara || textoSara.length < 100) return { texto_final: textoSara };
  if (!presupuestoDisponible()) return { texto_final: textoSara };

  const prompt =
`Eres una correctora de estilo española. Revisa este texto periodístico y responde SOLO con el texto corregido.

COMPRUEBA:
- ¿Hay frases que suenen a IA? Elimínalas o reescríbelas de forma natural.
- ¿Hay repeticiones innecesarias de palabras en el mismo párrafo? Corrígelas.
- ¿El ritmo es ágil y humano? Si no, acórtalo.
- ¿La primera frase engancha? Si no, mejórala.
- Conserva TODOS los subtítulos ## sin cambiarlos.
- Máximo 3 frases por párrafo.
- NO alteres datos, nombres ni cifras. Solo el estilo.

TEXTO:
${textoSara}`;

  try {
    const client   = new Anthropic({ apiKey: CLAUDE_API_KEY });
    const response = await client.messages.create({
      model: CLAUDE_MODEL, max_tokens: 1200,
      messages: [{ role: "user", content: prompt }]
    });
    const usage = response.usage || {};
    registrarCoste(usage.input_tokens || 600, usage.output_tokens || 500);
    const txt = (response.content&&response.content[0]&&response.content[0].text)||textoSara;
    console.log("  [Humanizador] Revision final completada.");
    return { texto_final: normp(txt) };
  } catch (err) {
    console.log("  [Humanizador] Error ("+err.message+") — usando texto de Sara.");
    return { texto_final: textoSara };
  }
}

function humanizadorLocal(texto) {
  const ff=sents(texto); const usadas=new Set(); const parrs=[]; let buf=[];
  for (const f of ff) {
    if (!f||usadas.has(f)||FRASES_IA.some(re=>re.test(f))) continue;
    usadas.add(f); buf.push(f[0].toUpperCase()+f.slice(1));
    if (buf.length===2) { parrs.push(buf.join(". ")+"."); buf=[]; }
  }
  if (buf.length) parrs.push(buf.join(". ")+".");
  return { texto_final: parrs.join("\n\n"), imagenDesc: null, alertaVerif: null };
}

// ============================================================================
// PORTADA IA: descripcion editorial para la imagen de la noticia
// ============================================================================

async function portadaIA(topicData, titulo, instruccion) {
  const cat   = clean(topicData.category);
  const tit   = clean(titulo||topicData.topic);
  const desc  = instruccion || ("Fotografia editorial realista de "+cat.toLowerCase()+": escena documental sin logos ni texto, iluminacion natural, composicion limpia, enfoque periodistico sobre \""+tit+"\".");
  return {
    descripcion: desc,
    alt: (cat+": "+tit).slice(0,125)
  };
}

// ============================================================================
// CAPA 5: SUPERVISOR EDITORIAL
// ============================================================================

function loadMem() {
  if (!fs.existsSync(MEMORY_FILE)) return {titulos:[],resumenes:[],imagenes:[]};
  try { return JSON.parse(fs.readFileSync(MEMORY_FILE,"utf8")); } catch { return {titulos:[],resumenes:[],imagenes:[]}; }
}
function saveMem(m) {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR,{recursive:true});
  fs.writeFileSync(MEMORY_FILE,JSON.stringify(m,null,2));
}

async function supervisor(news, topicData) {
  const mem=loadMem(); let ok=true; const motivos=[];

  if (mem.titulos.includes(news.titulo_final))  { ok=false; motivos.push("Duplicado por titulo."); }
  if (mem.resumenes.includes(news.cuerpo.slice(0,200))) { ok=false; motivos.push("Duplicado por cuerpo."); }
  if ((news.cuerpo||"").length<180) { ok=false; motivos.push("Cuerpo demasiado corto."); }
  if (news.alertaVerif) motivos.push("Alerta de verificacion: "+news.alertaVerif);

  if (FRASES_IA.some(re=>re.test(news.titulo_final))) {
    news.titulo_final=limpiarIA(news.titulo_final);
    motivos.push("Titulo limpiado de frases IA.");
  }

  if (ok) {
    mem.titulos.push(news.titulo_final);
    mem.resumenes.push(news.cuerpo.slice(0,200));
    mem.imagenes.push(news.imagen.descripcion||"");
    if (mem.titulos.length>500)   mem.titulos   =mem.titulos.slice(-500);
    if (mem.resumenes.length>500) mem.resumenes =mem.resumenes.slice(-500);
    if (mem.imagenes.length>500)  mem.imagenes  =mem.imagenes.slice(-500);
    saveMem(mem);
  }

  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR,{recursive:true});
  fs.writeFileSync(path.join(LOG_DIR,"log-"+Date.now()+".json"),
    JSON.stringify({fecha:new Date().toISOString(),topic:topicData.topic,aprobado:ok,motivos,noticia:news},null,2));

  return Object.assign({},news,{aprobado:ok,motivos});
}

// ============================================================================
// FLUJO PRINCIPAL
// ============================================================================

async function generateProfessionalNews(topicData) {
  const hasRealImage = !!topicData.hasRealImage;

  console.log("\n  [C1] Redactora base...");
  const base = await redactora(topicData);
  console.log("  OK");

  console.log("  [C2] Editora SEO...");
  const edited = await editoraSEO(base, topicData);
  console.log("  OK");

  const tag = claudeOK ? "Sara (Claude Editora Jefe)" : "Humanizador local";
  console.log("  [C3] "+tag+"...");
  const saraResult = await sara(edited, topicData);
  console.log("  OK");

  console.log("  [C4] Humanizador final...");
  const humanized = hasRealImage
    ? await humanizadorFinal(saraResult.texto_final, topicData)
    : { texto_final: saraResult.texto_final };
  console.log("  OK");

  console.log("  [IMG] Portada editorial...");
  const img = await portadaIA(topicData, edited.titulo_seo, saraResult.imagenDesc);
  console.log("  OK — "+(hasRealImage?"imagen real usada":"portada IA generada"));

  const news = {
    titulo_final:   edited.titulo_seo,
    entradilla:     edited.entradilla,
    cuerpo:         humanized.texto_final,
    palabras_clave: edited.kw,
    alertaVerif:    saraResult.alertaVerif||null,
    imagen: { descripcion: img.descripcion, alt: img.alt },
    hasRealImage,
    metadata: {
      categoria:    topicData.category,
      fecha:        new Date().toLocaleDateString("es-ES"),
      generado_por: claudeOK ? "Sara — Claude Editora Jefe (Anthropic)" : "Humanizador local (fallback)"
    }
  };

  console.log("  [C5] Supervisor editorial...");
  const revisada = await supervisor(news, topicData);
  console.log(revisada.aprobado
    ? "  APROBADA por el Supervisor.\n"
    : "  RECHAZADA: "+revisada.motivos.join("; ")+"\n");

  return revisada;
}

module.exports = {
  generateProfessionalNews,
  redactora, editoraSEO, sara, humanizadorFinal, portadaIA, supervisor
};
