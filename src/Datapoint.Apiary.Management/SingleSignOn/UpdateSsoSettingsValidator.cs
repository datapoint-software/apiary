using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.SingleSignOn;

public sealed class UpdateSsoSettingsValidator : AbstractValidator<UpdateSsoSettings>
{
    public UpdateSsoSettingsValidator(SsoIssuerPolicy policy)
    {
        RuleFor(s => s.DisplayName).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(SsoRules.MaximumDisplayName).WithErrorCode(ErrorCodes.TooLong);
        RuleFor(s => s.Issuer).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(SsoRules.MaximumIssuer).WithErrorCode(ErrorCodes.TooLong)
            .Must(issuer => SsoRules.IsIssuer(issuer.Trim(), policy.AllowHttp)).WithErrorCode(ErrorCodes.SsoIssuerInvalid);
        RuleFor(s => s.ClientId).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(SsoRules.MaximumClientId).WithErrorCode(ErrorCodes.TooLong);
        RuleFor(s => s.ClientSecret).MaximumLength(SsoRules.MaximumClientSecret).WithErrorCode(ErrorCodes.TooLong);
        RuleFor(s => s.GroupsClaim).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(100).WithErrorCode(ErrorCodes.TooLong);
        RuleFor(s => s.AdministratorGroups).Must(BeShort).WithErrorCode(ErrorCodes.SsoGroupsTooMany);
        RuleFor(s => s.OperatorGroups).Must(BeShort).WithErrorCode(ErrorCodes.SsoGroupsTooMany);
        RuleFor(s => s.ViewerGroups).Must(BeShort).WithErrorCode(ErrorCodes.SsoGroupsTooMany);
        RuleFor(s => s)
            .Must(s => SsoRules.Clean(s.AdministratorGroups).Count + SsoRules.Clean(s.OperatorGroups).Count + SsoRules.Clean(s.ViewerGroups).Count > 0)
            .WithName(nameof(UpdateSsoSettings.ViewerGroups))
            .OverridePropertyName(nameof(UpdateSsoSettings.ViewerGroups))
            .WithErrorCode(ErrorCodes.SsoGroupsRequired);
    }

    private static bool BeShort(IReadOnlyList<string>? groups) =>
        groups is null || (groups.Count <= SsoRules.MaximumGroups && groups.All(g => g.Length <= SsoRules.MaximumGroup));
}
