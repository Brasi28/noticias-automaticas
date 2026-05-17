# Sistema automatico de noticias

Proyecto web con generacion automatica de noticias SEO cada 30 minutos.

## Estructura

- index.html
- styles.css
- script.js
- generate-news.js
- news/
- assets/

## Que hace

- Consume Google News RSS por categoria.
- Filtra duplicados.
- Genera resumen original de 150 a 250 palabras.
- Crea titulo SEO y meta descripcion.
- Genera JSON-LD (NewsArticle e ItemList).
- Crea archivos HTML en news/ con formato noticia-fecha-slug.html.
- Guarda miniaturas en assets/ (o usa URL externa si falla descarga).

## Categorias

- Tecnologia
- Inteligencia Artificial
- Deportes
- Economia
- Videojuegos
- Entretenimiento

## Ejecucion

1. Generar una sola vez:

```bash
npm run generate:once
```

2. Modo automatico continuo (cada 30 minutos):

```bash
npm run generate
```

## Miniaturas con Unsplash (opcional)

1. Crea una cuenta y clave en Unsplash.
2. Define la variable de entorno `UNSPLASH_ACCESS_KEY`.
3. Si no hay clave, el sistema usa Lorem Picsum automaticamente.

## Publicacion

- Sirve esta carpeta en cualquier hosting estatico.
- Asegura que un proceso Node ejecute `npm run generate` para mantener las noticias actualizadas.

## Deploy automatico en GitHub Pages

Ya esta incluido el workflow:

- .github/workflows/deploy-news-pages.yml

Este flujo hace lo siguiente:

- Se ejecuta en cada push a main/master.
- Se ejecuta automaticamente cada 30 minutos.
- Genera noticias con `npm run generate:once`.
- Publica el sitio estatico en GitHub Pages.

### Pasos para activarlo

1. Sube este proyecto a GitHub.
2. En el repositorio, ve a Settings > Pages.
3. En Build and deployment, selecciona Source: GitHub Actions.
4. (Opcional) En Settings > Secrets and variables > Actions, crea el secreto `UNSPLASH_ACCESS_KEY`.
5. Haz push a la rama principal para disparar el primer deploy.

### Resultado

- Tu web queda publicada en GitHub Pages.
- Cada 30 minutos se regeneran noticias y se despliega una version nueva de forma automatica.

## Deploy automatico en Netlify (alternativo)

Tambien esta preparado este camino:

- netlify.toml
- .github/workflows/trigger-netlify-deploy.yml

### Como funciona

1. Netlify construye el sitio con `npm run generate:once`.
2. GitHub Actions dispara un Build Hook de Netlify cada 30 minutos.
3. Netlify publica una nueva version automaticamente.

### Pasos para activarlo

1. Crea un sitio en Netlify conectado a este repositorio.
2. Verifica que Netlify detecte `netlify.toml`.
3. En Netlify, crea un Build Hook y copia la URL.
4. En GitHub, crea el secreto `NETLIFY_BUILD_HOOK_URL` con esa URL.
5. (Opcional) Agrega `UNSPLASH_ACCESS_KEY` en variables de entorno de Netlify.
6. Ejecuta manualmente el workflow `Trigger Netlify Deploy` una vez para prueba.

### Nota importante

- Usa un solo proveedor principal para produccion (GitHub Pages o Netlify) para evitar confusiones de URLs publicas.

## Verificacion de despliegue

- Las landings SEO nuevas se generan en la raiz del sitio como `deportes.html`, `salud.html`, `finanzas.html`, `cripto.html`, `tecnologia.html`, `inteligencia-artificial.html`, `videojuegos.html` y `entretenimiento.html`.
- Si alguna devuelve 404 despues de un despliegue, fuerza un rebuild desde el proveedor para invalidar la publicacion anterior.
