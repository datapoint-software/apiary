namespace Datapoint.Apiary.Hosting;

public sealed class ApiaryOptions
{
    public int HttpPort { get; set; } = 8080;

    public int HttpsPort { get; set; } = 8443;

    public int PublicHttpsPort { get; set; } = 443;

    public int AdminPort { get; set; } = 9443;

    public int RaftPort { get; set; } = 9444;

    public int ClusterPort { get; set; } = 9445;

    public string RootKeyFile { get; set; } = "/run/secrets/apiary_root_key";

    public string KeyDirectory { get; set; } = "keys";

    public bool AllowHttpSsoIssuer { get; set; }

    public bool CheckBreachedPasswords { get; set; }

    public IReadOnlyList<string> AdminAllowlist { get; set; } =
        ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7", "127.0.0.0/8", "::1/128"];

    public IReadOnlySet<int> OwnPorts => new HashSet<int> { HttpPort, HttpsPort, AdminPort, RaftPort, ClusterPort };
}
