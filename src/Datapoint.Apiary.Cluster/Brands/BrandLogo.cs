namespace Datapoint.Apiary.Cluster.Brands;

public sealed record BrandLogo(string ContentType, string Data, string? FileName)
{
    public string DataUri => $"data:{ContentType};base64,{Data}";
}
