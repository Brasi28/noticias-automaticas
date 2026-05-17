using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using BlazorApp1.Models;

namespace BlazorApp1.Services;

public sealed class InterestAutomationService
{
    private readonly HttpClient _httpClient;
    private readonly TrendContentService _trendContentService;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private readonly ConcurrentDictionary<string, TopicPageData> _cache = new();

    private IReadOnlyList<InterestCategory> _categories =
    [
        new InterestCategory
        {
            Slug = "juegos",
            Name = "Juegos",
            SearchQuery = "videojuegos esports lanzamientos",
            Description = "Noticias gaming, esports y lanzamientos top.",
            Score = 100,
            UpdatedAtUtc = DateTime.UtcNow
        },
        new InterestCategory
        {
            Slug = "tecnologia",
            Name = "Tecnologia",
            SearchQuery = "tecnologia innovacion gadgets inteligencia artificial",
            Description = "Innovacion, IA y productos tecnologicos en tendencia.",
            Score = 95,
            UpdatedAtUtc = DateTime.UtcNow
        },
        new InterestCategory
        {
            Slug = "cocina",
            Name = "Cocina",
            SearchQuery = "recetas cocina gastronomia tendencias",
            Description = "Recetas virales y contenido foodie de alto interes.",
            Score = 90,
            UpdatedAtUtc = DateTime.UtcNow
        }
    ];

    public InterestAutomationService(HttpClient httpClient, TrendContentService trendContentService)
    {
        _httpClient = httpClient;
        _trendContentService = trendContentService;
    }

    public IReadOnlyList<InterestCategory> GetCategories() => _categories;

    public async Task EnsureFreshDataAsync(CancellationToken cancellationToken = default)
    {
        var latest = _categories.MaxBy(item => item.UpdatedAtUtc)?.UpdatedAtUtc ?? DateTime.MinValue;
        if (DateTime.UtcNow - latest > TimeSpan.FromMinutes(30))
        {
            await RefreshCategoriesAsync(cancellationToken);
        }
    }

    public async Task<TopicPageData> GetTopicDataAsync(string slug, CancellationToken cancellationToken = default)
    {
        if (_cache.TryGetValue(slug, out var existing) && DateTime.UtcNow - existing.RetrievedAtUtc < TimeSpan.FromMinutes(30))
        {
            return existing;
        }

        var category = _categories.FirstOrDefault(c => c.Slug == slug);
        var query = category?.SearchQuery ?? slug;
        var data = await _trendContentService.GetTopicDataAsync(slug, query, cancellationToken);
        _cache[slug] = data;
        return data;
    }

    public async Task WarmupAsync(CancellationToken cancellationToken = default)
    {
        await RefreshCategoriesAsync(cancellationToken);
    }

    public async Task RefreshCategoriesAsync(CancellationToken cancellationToken = default)
    {
        await _refreshLock.WaitAsync(cancellationToken);
        try
        {
            var discovered = await DiscoverTopCategoriesAsync(cancellationToken);
            _categories = discovered;

            var tasks = _categories.Select(async category =>
            {
                var data = await _trendContentService.GetTopicDataAsync(category.Slug, category.SearchQuery, cancellationToken);
                _cache[category.Slug] = data;
            });

            await Task.WhenAll(tasks);
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    private async Task<IReadOnlyList<InterestCategory>> DiscoverTopCategoriesAsync(CancellationToken cancellationToken)
    {
        var trendPhrases = await GetTrendPhrasesAsync(cancellationToken);

        var buckets = new Dictionary<string, (string Name, string Query, string Description, int Score)>(StringComparer.OrdinalIgnoreCase)
        {
            ["juegos"] = ("Juegos", "videojuegos esports lanzamientos", "Noticias gaming, esports y lanzamientos top.", 0),
            ["tecnologia"] = ("Tecnologia", "tecnologia innovacion gadgets inteligencia artificial", "Innovacion, IA y productos tecnologicos en tendencia.", 0),
            ["cocina"] = ("Cocina", "recetas cocina gastronomia tendencias", "Recetas virales y contenido foodie de alto interes.", 0),
            ["deportes"] = ("Deportes", "futbol baloncesto tenis formula 1 noticias", "Marcadores, fichajes y polemicas deportivas en alza.", 0),
            ["salud"] = ("Salud", "salud bienestar nutricion medicina", "Consejos de salud y tendencias de bienestar que ganan busquedas.", 0),
            ["finanzas"] = ("Finanzas", "economia inversiones bolsa ahorro", "Mercados, ahorro e inversiones que interesan a miles de usuarios.", 0),
            ["cine-series"] = ("Cine y Series", "cine series estrenos streaming", "Estrenos, criticas y fenomenos de streaming.", 0),
            ["viajes"] = ("Viajes", "viajes destinos vuelos turismo", "Destinos y recomendaciones para viajeros en tendencia.", 0)
        };

        foreach (var phrase in trendPhrases)
        {
            var lower = phrase.ToLowerInvariant();
            AddScore("juegos", lower, "juego", "gaming", "playstation", "xbox", "nintendo", "esports");
            AddScore("tecnologia", lower, "ia", "inteligencia", "tecnolog", "apple", "android", "robot", "startup", "chip");
            AddScore("cocina", lower, "receta", "cocina", "gastronom", "chef", "comida", "horno");
            AddScore("deportes", lower, "futbol", "liga", "champions", "nba", "tenis", "deporte", "f1", "motogp");
            AddScore("salud", lower, "salud", "medicina", "dieta", "bienestar", "entrenamiento", "mental");
            AddScore("finanzas", lower, "bitcoin", "cript", "bolsa", "inversion", "banco", "ipc", "inflacion", "economia");
            AddScore("cine-series", lower, "pelicula", "serie", "netflix", "hbo", "disney", "trailer", "streaming");
            AddScore("viajes", lower, "viaje", "turismo", "vuelo", "hotel", "destino", "playa", "europa");

            void AddScore(string key, string text, params string[] markers)
            {
                var increment = markers.Count(marker => text.Contains(marker, StringComparison.OrdinalIgnoreCase));
                if (increment <= 0)
                {
                    return;
                }

                var bucket = buckets[key];
                buckets[key] = (bucket.Name, bucket.Query, bucket.Description, bucket.Score + increment);
            }
        }

        var ranked = buckets
            .Select(item => new InterestCategory
            {
                Slug = item.Key,
                Name = item.Value.Name,
                SearchQuery = item.Value.Query,
                Description = item.Value.Description,
                Score = item.Value.Score,
                UpdatedAtUtc = DateTime.UtcNow
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.Name)
            .Take(6)
            .ToList();

        if (ranked.Count < 3)
        {
            return _categories;
        }

        return ranked;
    }

    private async Task<IReadOnlyList<string>> GetTrendPhrasesAsync(CancellationToken cancellationToken)
    {
        const string url = "https://trends.google.com/trending/rss?geo=ES";

        try
        {
            await using var stream = await _httpClient.GetStreamAsync(url, cancellationToken);
            var doc = XDocument.Load(stream);
            var titles = doc.Descendants("item")
                .Select(item => item.Element("title")?.Value)
                .Where(title => !string.IsNullOrWhiteSpace(title))
                .Select(title => Regex.Replace(title!, "\\s+", " ").Trim())
                .Take(60)
                .ToList();

            if (titles.Count > 0)
            {
                return titles;
            }
        }
        catch
        {
            // If trends feed is unavailable, fallback categories keep the site running.
        }

        return
        [
            "futbol liga",
            "nuevos juegos",
            "inteligencia artificial",
            "recetas saludables",
            "streaming series",
            "bitcoin mercado"
        ];
    }
}
