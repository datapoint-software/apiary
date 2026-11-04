using FluentValidation;

namespace Datapoint.Apiary.Management.Routes;

public sealed class UpdateRouteDefaultsValidator : AbstractValidator<UpdateRouteDefaults>
{
    public UpdateRouteDefaultsValidator() =>
        RuleFor(d => (int?)d.RequestMegabytes).RequestMegabytes().OverridePropertyName(nameof(UpdateRouteDefaults.RequestMegabytes));
}
