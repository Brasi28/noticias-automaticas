namespace BlazorApp1.Models;

public sealed class TopicArticle
{
    public required string Title { get; init; }
    public required string Url { get; init; }
    public required string Summary { get; init; }
    public required string Source { get; init; }
    public DateTime PublishedAtUtc { get; init; }
}

public sealed class TopicVideo
{
    public required string Title { get; init; }
    public required string EmbedUrl { get; init; }
    public required string WatchUrl { get; init; }
    public long Views { get; init; }
}

public sealed class TopicPageData
{
    public required string TopicKey { get; init; }
    public required IReadOnlyList<TopicArticle> Articles { get; init; }
    public required IReadOnlyList<TopicVideo> Videos { get; init; }
    public DateTime RetrievedAtUtc { get; init; }
}

public sealed class InterestCategory
{
    public required string Slug { get; init; }
    public required string Name { get; init; }
    public required string SearchQuery { get; init; }
    public required string Description { get; init; }
    public int Score { get; init; }
    public DateTime UpdatedAtUtc { get; init; }
}
