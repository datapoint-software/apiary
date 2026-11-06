namespace Datapoint.Apiary.Certificates.Dns;

public sealed record DnsTsigKey(string Name, string Algorithm, byte[] Secret);
