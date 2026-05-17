using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;
using BlazorApp1.Models;

namespace BlazorApp1.Services;

public sealed class TrendContentService
{
    private static readonly XNamespace ContentNamespace = "http://purl.org/rss/1.0/modules/content/";

    private readonly HttpClient _httpClient;

    public TrendContentService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<TopicPageData> GetTopicDataAsync(string topicKey, string? searchOverride = null, CancellationToken cancellationToken = default)
    {
        var search = string.IsNullOrWhiteSpace(searchOverride) ? topicKey switch
        {
            "juegos" => "videojuegos esports lanzamientos",
            "tecnologia" => "tecnologia innovacion startups inteligencia artificial",
            "cocina" => "recetas cocina saludable tendencias gastronomia",
            _ => "noticias"
        } : searchOverride;

        var articlesTask = GetNewsAsync(search, cancellationToken);
        var videosTask = GetVideosAsync(search, topicKey, cancellationToken);

        await Task.WhenAll(articlesTask, videosTask);

        return new TopicPageData
        {
            TopicKey = topicKey,
            Articles = articlesTask.Result,
            Videos = videosTask.Result,
            RetrievedAtUtc = DateTime.UtcNow
        };
    }

    private async Task<IReadOnlyList<TopicArticle>> GetNewsAsync(string query, CancellationToken cancellationToken)
    {
        var rssUrl = $"https://news.google.com/rss/search?q={Uri.EscapeDataString(query + " when:7d")}&hl=es-419&gl=ES&ceid=ES:es";

        try
        {
            await using var stream = await _httpClient.GetStreamAsync(rssUrl, cancellationToken);
            var document = XDocument.Load(stream);
            var items = document.Descendants("item")
                .Select(item => new TopicArticle
                {
                    Title = BuildHeadline(item.Element("title")?.Value),
                    Url = item.Element("link")?.Value ?? "#",
                    Summary = CleanText(item.Element("description")?.Value ?? item.Element(ContentNamespace + "encoded")?.Value ?? string.Empty),
                    Source = item.Element("source")?.Value ?? "Actualidad",
                    PublishedAtUtc = ParseDate(item.Element("pubDate")?.Value)
                })
                .Where(article => !string.IsNullOrWhiteSpace(article.Title))
                .Take(12)
                .ToList();

            if (items.Count > 0)
            {
                return items;
            }
        }
        catch
        {
            // Fallback below.
        }

        return
        [
            new TopicArticle
            {
                Title = BuildHeadline("Lo mas comentado del momento en " + query),
                Url = "#",
                Summary = "Actualizacion temporal: estamos recargando nuevas fuentes de noticias para esta categoria.",
                Source = "Portal",
                PublishedAtUtc = DateTime.UtcNow
            }
        ];
    }

    private async Task<IReadOnlyList<TopicVideo>> GetVideosAsync(string query, string topicKey, CancellationToken cancellationToken)
    {
        try
        {
            var endpoint = $"https://piped.video/api/v1/search?q={Uri.EscapeDataString(query)}&filter=videos";
            await using var stream = await _httpClient.GetStreamAsync(endpoint, cancellationToken);
            var response = await JsonSerializer.DeserializeAsync<List<PipedVideoResult>>(stream, cancellationToken: cancellationToken);

            if (response is { Count: > 0 })
            {
                var picked = response
                    .Where(item => !string.IsNullOrWhiteSpace(item.Url))
                    .Select(item =>
                    {
                        var id = ExtractVideoId(item.Url);
                        return new TopicVideo
                        {
                            Title = string.IsNullOrWhiteSpace(item.Title) ? "Video recomendado" : item.Title,
                            EmbedUrl = $"https://www.youtube.com/embed/{id}",
                            WatchUrl = $"https://www.youtube.com/watch?v={id}",
                            Views = item.Views
                        };
                    })
                    .Where(video => !video.EmbedUrl.EndsWith("/embed/", StringComparison.Ordinal))
                    .OrderByDescending(video => video.Views)
                    .Take(8)
                    .ToList();

                if (picked.Count > 0)
                {
                    return picked;
                }
            }
        }
        catch
        {
            // Fallback below.
        }

        return GetFallbackVideos(topicKey);
    }

    private static IReadOnlyList<TopicVideo> GetFallbackVideos(string topicKey) => topicKey switch
    {
        "juegos" =>
        [
            CreateFallbackVideo("Top lanzamientos gaming", "dQw4w9WgXcQ", 1000000),
            CreateFallbackVideo("Estrategias competitivas esports", "kXYiU_JCYtU", 800000),
            CreateFallbackVideo("Review de juegos del momento", "3JZ_D3ELwOQ", 700000)
        ],
        "tecnologia" =>
        [
            CreateFallbackVideo("Tendencias tech que explotan este ano", "9bZkp7q19f0", 1200000),
            CreateFallbackVideo("IA, robots y futuro digital", "fJ9rUzIMcZQ", 900000),
            CreateFallbackVideo("Gadgets que todos estan buscando", "YQHsXMglC9A", 650000)
        ],
        "cocina" =>
        [
            CreateFallbackVideo("Recetas virales faciles y rapidas", "OPf0YbXqDm0", 1100000),
            CreateFallbackVideo("Ideas de cocina para sorprender", "RgKAFK5djSk", 830000),
            CreateFallbackVideo("Platos top para vender mas", "CevxZvSJLk8", 610000)
        ],
        _ =>
        [
            CreateFallbackVideo("Tendencias de hoy", "hT_nvWreIhg", 500000)
        ]
    };

    private static TopicVideo CreateFallbackVideo(string title, string videoId, long views) =>
        new()
        {
            Title = title,
            EmbedUrl = $"https://www.youtube.com/embed/{videoId}",
            WatchUrl = $"https://www.youtube.com/watch?v={videoId}",
            Views = views
        };

    private static DateTime ParseDate(string? value)
    {
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var date))
        {
            return date;
        }

        return DateTime.UtcNow;
    }

    private static string BuildHeadline(string? title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return "Actualizacion destacada";
        }

        var trimmed = title.Trim();
        if (trimmed.EndsWith("!", StringComparison.Ordinal) || trimmed.StartsWith("Ultima hora", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }

        return "Ultima hora: " + trimmed;
    }

    private static string CleanText(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return "Sigue esta historia y descubre por que esta captando tantas busquedas.";
        }

        var noHtml = System.Text.RegularExpressions.Regex.Replace(input, "<.*?>", " ");
        var compact = System.Text.RegularExpressions.Regex.Replace(noHtml, "\\s+", " ").Trim();
        return compact.Length > 220 ? compact[..220] + "..." : compact;
    }

    private static string ExtractVideoId(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return string.Empty;
        }

        var raw = url.Trim();
        if (raw.Contains("watch?v=", StringComparison.OrdinalIgnoreCase))
        {
            var parts = raw.Split("watch?v=", StringSplitOptions.RemoveEmptyEntries);
            var value = parts[^1];
            var id = value.Split('&')[0];
            return id;
        }

        var normalized = raw.Trim('/');
        if (normalized.Contains("/shorts/", StringComparison.OrdinalIgnoreCase))
        {
            return normalized.Split("/shorts/")[^1];
        }

        return normalized.Split('/').LastOrDefault() ?? string.Empty;
    }

    private sealed class PipedVideoResult
    {
        public string Title { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public long Views { get; set; }
    }
}
