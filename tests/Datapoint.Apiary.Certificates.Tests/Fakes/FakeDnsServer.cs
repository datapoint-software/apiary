using System.Buffers.Binary;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using Datapoint.Apiary.Certificates.Dns;
using Datapoint.Apiary.Testing;

namespace Datapoint.Apiary.Certificates.Tests.Fakes;

public sealed class FakeDnsServer : IAsyncDisposable
{
    private const int ResponseFlag = 0x8000;
    private const int AuthoritativeFlag = 0x0400;
    private const int TruncatedFlag = 0x0200;
    private const int UpdateOpcode = 5;
    private readonly UdpClient _udp;
    private readonly TcpListener _tcp;
    private readonly CancellationTokenSource _stopping = new();
    private readonly Task _udpLoop;
    private readonly Task _tcpLoop;
    private readonly ConcurrentDictionary<string, string> _zones = new(StringComparer.Ordinal);
    private readonly List<DnsRecord> _records = [];
    private readonly Lock _gate = new();

    public FakeDnsServer()
    {
        Port = FreePorts.Next();
        _udp = new UdpClient(new IPEndPoint(IPAddress.Loopback, Port));
        _tcp = new TcpListener(IPAddress.Loopback, Port);
        _tcp.Start();
        _udpLoop = ServeUdpAsync();
        _tcpLoop = ServeTcpAsync();
    }

    public int Port { get; }

    public IPEndPoint Endpoint => new(IPAddress.Loopback, Port);

    public string Address => $"127.0.0.1:{Port}";

    public DnsTsigKey? Key { get; set; }

    public bool TruncateUdp { get; set; }

    public bool HidesUpdates { get; set; }

    public DnsResponseCode UpdateCode { get; set; } = DnsResponseCode.NoError;

    public IList<string> Updates { get; } = [];

    public FakeDnsServer Zone(string zone, string nameServer = "ns1")
    {
        var host = nameServer + "." + zone;
        _zones[zone] = host;
        return Record(zone, DnsRecordType.NS, host).Record(host, DnsRecordType.A, "127.0.0.1");
    }

    public FakeDnsServer Record(string name, DnsRecordType type, string data)
    {
        lock (_gate)
        {
            _records.Add(new DnsRecord(name, type, DnsClass.Internet, DnsMessages.RecordTtl, data));
        }

        return this;
    }

    public IReadOnlyList<string> Text(string name)
    {
        lock (_gate)
        {
            return [.. _records.Where(r => r.Type == DnsRecordType.Txt && r.Name == name).Select(r => r.Data)];
        }
    }

    public async ValueTask DisposeAsync()
    {
        await _stopping.CancelAsync();
        _udp.Dispose();
        _tcp.Stop();
        await Task.WhenAll(_udpLoop, _tcpLoop).ContinueWith(_ => { }, TaskScheduler.Default);
        _stopping.Dispose();
    }

    private async Task ServeUdpAsync()
    {
        while (!_stopping.IsCancellationRequested)
        {
            var received = await _udp.ReceiveAsync(_stopping.Token);
            var response = Answer(received.Buffer, udp: true);
            await _udp.SendAsync(response, received.RemoteEndPoint, _stopping.Token);
        }
    }

    private async Task ServeTcpAsync()
    {
        while (!_stopping.IsCancellationRequested)
        {
            using var connection = await _tcp.AcceptTcpClientAsync(_stopping.Token);
            await using var stream = connection.GetStream();
            var length = new byte[2];
            await stream.ReadExactlyAsync(length, _stopping.Token);
            var message = new byte[BinaryPrimitives.ReadUInt16BigEndian(length)];
            await stream.ReadExactlyAsync(message, _stopping.Token);
            var response = Answer(message, udp: false);
            BinaryPrimitives.WriteUInt16BigEndian(length, (ushort)response.Length);
            await stream.WriteAsync(length, _stopping.Token);
            await stream.WriteAsync(response, _stopping.Token);
        }
    }

    private byte[] Answer(byte[] message, bool udp)
    {
        var opcode = (BinaryPrimitives.ReadUInt16BigEndian(message.AsSpan(2)) >> 11) & 0xF;
        return opcode == UpdateOpcode ? Update(message) : Query(message, udp);
    }

    private byte[] Query(byte[] message, bool udp)
    {
        var reader = new DnsReader(message);
        var id = reader.TwoBytes();
        reader.Skip(10);
        var name = reader.Name();
        var type = (DnsRecordType)reader.TwoBytes();
        var answers = Find(name, type);
        var zone = ZoneOf(name);
        var authority = answers.Count == 0 && zone is not null ? [Soa(zone)] : new List<DnsRecord>();
        if (type == DnsRecordType.Soa && zone == name)
        {
            (answers, authority) = ([Soa(zone)], []);
        }

        var truncated = udp && TruncateUdp;
        var flags = ResponseFlag | AuthoritativeFlag | (truncated ? TruncatedFlag : 0) | (int)(zone is null ? DnsResponseCode.Refused : DnsResponseCode.NoError);
        return Response(id, flags, name, type, truncated ? [] : answers, truncated ? [] : authority);
    }

    private byte[] Update(byte[] message)
    {
        var reader = new DnsReader(message);
        var id = reader.TwoBytes();
        reader.Skip(2);
        var updates = new int[] { reader.TwoBytes(), reader.TwoBytes(), reader.TwoBytes(), reader.TwoBytes() };
        var zone = reader.Name();
        reader.Skip(4);
        var changes = Enumerable.Range(0, updates[1] + updates[2]).Select(_ => reader.Record()).ToList();
        var code = Authorized(message, reader.Offset, updates[3]) ? UpdateResult(zone) : DnsResponseCode.NotAuthorized;
        if (code == DnsResponseCode.NoError)
        {
            Apply(changes);
        }

        return new DnsWriter().TwoBytes(id).TwoBytes(ResponseFlag | (UpdateOpcode << 11) | (int)code).TwoBytes(0).TwoBytes(0).TwoBytes(0).TwoBytes(0).ToArray();
    }

    private DnsResponseCode UpdateResult(string zone) => _zones.ContainsKey(zone) ? UpdateCode : DnsResponseCode.NotZone;

    private void Apply(List<DnsRecord> changes)
    {
        lock (_gate)
        {
            foreach (var change in changes)
            {
                Updates.Add($"{(change.Class == DnsClass.None ? "remove" : "add")} {change.Name} {change.Data}");
                _records.RemoveAll(r => r.Name == change.Name && r.Type == change.Type && r.Data == change.Data);
                if (change.Class == DnsClass.Internet && !HidesUpdates)
                {
                    _records.Add(change);
                }
            }
        }
    }

    private bool Authorized(byte[] message, int tsigOffset, int additionals)
    {
        if (Key is null)
        {
            return true;
        }

        if (additionals != 1)
        {
            return false;
        }

        var unsigned = message[..tsigOffset];
        BinaryPrimitives.WriteUInt16BigEndian(unsigned.AsSpan(10), 0);
        var tsig = new DnsReader(message[tsigOffset..]);
        tsig.Name();
        tsig.Skip(10);
        tsig.Name();
        var seconds = ((long)tsig.TwoBytes() << 32) | tsig.FourBytes();
        return DnsTsig.Sign(unsigned, Key, DateTimeOffset.FromUnixTimeSeconds(seconds)).AsSpan().SequenceEqual(message);
    }

    private List<DnsRecord> Find(string name, DnsRecordType type)
    {
        lock (_gate)
        {
            var exact = _records.Where(r => r.Name == name && r.Type == type).ToList();
            return exact.Count > 0 ? exact : [.. _records.Where(r => r.Name == name && r.Type == DnsRecordType.CName)];
        }
    }

    private string? ZoneOf(string name) =>
        _zones.Keys.Where(z => name == z || name.EndsWith("." + z, StringComparison.Ordinal)).MaxBy(z => z.Length);

    private DnsRecord Soa(string zone) => new(zone, DnsRecordType.Soa, DnsClass.Internet, 60, _zones[zone]);

    private static byte[] Response(ushort id, int flags, string name, DnsRecordType type, List<DnsRecord> answers, List<DnsRecord> authority)
    {
        var writer = new DnsWriter()
            .TwoBytes(id).TwoBytes(flags).TwoBytes(1).TwoBytes(answers.Count).TwoBytes(authority.Count).TwoBytes(0)
            .Name(name).TwoBytes((int)type).TwoBytes((int)DnsClass.Internet);
        foreach (var record in answers.Concat(authority))
        {
            writer.Name(record.Name).TwoBytes((int)record.Type).TwoBytes((int)DnsClass.Internet).FourBytes(record.Ttl).Data(Data(record));
        }

        return writer.ToArray();
    }

    private static DnsWriter Data(DnsRecord record) => record.Type switch
    {
        DnsRecordType.A => new DnsWriter().Bytes(IPAddress.Parse(record.Data).GetAddressBytes()),
        DnsRecordType.Txt => new DnsWriter().CharacterStrings(record.Data),
        DnsRecordType.Soa => new DnsWriter().Name(record.Data).Name("hostmaster." + record.Name).FourBytes(1).FourBytes(3600).FourBytes(600).FourBytes(86400).FourBytes(60),
        _ => new DnsWriter().Name(record.Data),
    };
}
