namespace Datapoint.Apiary.Cluster.Brands;

public sealed record VisitorBrand(
    string Name,
    string Accent,
    string? Contact,
    BrandLogo? Logo,
    DateTimeOffset ChangedAt,
    string? ChangedBy);
