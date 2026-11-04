using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Brands;

public sealed class SaveBrandValidator : AbstractValidator<SaveBrand>
{
    public const int MaximumName = 60;
    public const int MaximumContact = 120;
    public const int MaximumLogoName = 200;

    public SaveBrandValidator(IClusterState cluster)
    {
        RuleFor(b => b.ProjectId)
            .Must(id => cluster.Current.Projects.ContainsKey(id!.Value)).WithErrorCode(ErrorCodes.ProjectNotFound)
            .When(b => b.ProjectId is not null);
        RuleFor(b => b.Name).Cascade(CascadeMode.Stop)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode(ErrorCodes.Required)
            .Must(name => name.Trim().Length <= MaximumName).WithErrorCode(ErrorCodes.TooLong);
        RuleFor(b => b.Accent).Must(BrandLogos.IsColor).WithErrorCode(ErrorCodes.BrandAccentInvalid);
        RuleFor(b => b.Contact).Must(contact => contact!.Trim().Length <= MaximumContact).WithErrorCode(ErrorCodes.TooLong).When(b => b.Contact is not null);
        RuleFor(b => b.LogoName).MaximumLength(MaximumLogoName).WithErrorCode(ErrorCodes.TooLong);
        RuleFor(b => b.Logo).Cascade(CascadeMode.Stop)
            .Must(logo => BrandLogos.Problem(logo!) != ErrorCodes.BrandLogoType).WithErrorCode(ErrorCodes.BrandLogoType)
            .Must(logo => BrandLogos.Problem(logo!) != ErrorCodes.BrandLogoTooLarge).WithErrorCode(ErrorCodes.BrandLogoTooLarge)
            .Must(logo => BrandLogos.Problem(logo!) is null).WithErrorCode(ErrorCodes.BrandLogoInvalid)
            .When(b => b.Logo is not null);
    }
}
