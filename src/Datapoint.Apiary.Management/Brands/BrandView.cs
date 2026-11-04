using Datapoint.Apiary.Cluster.Brands;

namespace Datapoint.Apiary.Management.Brands;

public sealed record BrandView(string Name, string Accent, string? Contact, string? Logo, string? LogoName, DateTimeOffset ChangedAt, string? ChangedBy)
{
    public static BrandView From(VisitorBrand brand) =>
        new(brand.Name, brand.Accent, brand.Contact, brand.Logo?.DataUri, brand.Logo?.FileName, brand.ChangedAt, brand.ChangedBy);
}
