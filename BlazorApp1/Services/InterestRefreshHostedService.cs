namespace BlazorApp1.Services;

public sealed class InterestRefreshHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<InterestRefreshHostedService> _logger;

    public InterestRefreshHostedService(IServiceProvider serviceProvider, ILogger<InterestRefreshHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunRefreshCycle(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(30));
        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunRefreshCycle(stoppingToken);
        }
    }

    private async Task RunRefreshCycle(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var automation = scope.ServiceProvider.GetRequiredService<InterestAutomationService>();
            await automation.RefreshCategoriesAsync(cancellationToken);
            _logger.LogInformation("Categorias de interes actualizadas automaticamente.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al refrescar categorias de interes.");
        }
    }
}
