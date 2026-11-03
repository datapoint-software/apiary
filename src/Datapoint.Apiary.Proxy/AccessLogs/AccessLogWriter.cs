using System.Text.Json;
using System.Threading.Channels;
using Microsoft.Extensions.Hosting;

namespace Datapoint.Apiary.Proxy.AccessLogs;

public sealed class AccessLogWriter : BackgroundService
{
    private readonly Channel<AccessLogEntry> _entries = Channel.CreateBounded<AccessLogEntry>(
        new BoundedChannelOptions(10_000) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });

    public void Write(AccessLogEntry entry) => _entries.Writer.TryWrite(entry);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await using var output = Console.OpenStandardOutput();
        await foreach (var entry in _entries.Reader.ReadAllAsync(stoppingToken))
        {
            await JsonSerializer.SerializeAsync(output, entry, AccessLogJsonContext.Default.AccessLogEntry, stoppingToken);
            output.WriteByte((byte)'\n');
            await output.FlushAsync(stoppingToken);
        }
    }
}
