using System.ComponentModel;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Authorization;
using Datapoint.Mediator;

namespace Datapoint.Apiary.Management.Brands;

[Action("brands.save", "Sets the brand of the visitor pages Apiary shows instead of a site: the cluster's, or a project's own, which its routes' password and maintenance pages use. For the admin UI only, since it carries the logo.")]
[Api]
[RequiresRole(Role.Operator)]
public sealed record SaveBrand(
    [property: Description("The project whose own brand this is, or null for the cluster's.")] Guid? ProjectId,
    [property: Description("The name next to the logo, also its alternative text, up to 60 characters.")] string Name,
    [property: Description("The accent color for buttons, as #RRGGBB.")] string Accent,
    [property: Description("A line under every page's message saying how to reach whoever runs the site, up to 120 characters, or null.")] string? Contact = null,
    [property: Description("The logo as a data URI, PNG, WebP or SVG, up to 100 KB, or null for none.")] string? Logo = null,
    [property: Description("The logo's file name, to show in the admin interface.")] string? LogoName = null) : ICommand;
