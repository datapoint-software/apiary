using Datapoint.Apiary.Certificates.Bundles;
using Datapoint.Apiary.Cluster.Certificates;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Management.Errors;
using FluentValidation;

namespace Datapoint.Apiary.Management.Certificates;

public static class CertificateUploadRules
{
    public const int MaximumPemLength = 65_536;

    public static void AddUploadRules<T>(this AbstractValidator<T> validator, IClusterState cluster, TimeProvider time)
        where T : ICertificateUpload
    {
        validator.RuleFor(u => u.ChainPem).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumPemLength).WithErrorCode(ErrorCodes.CertificateTooLarge);
        validator.RuleFor(u => u.KeyPem).Cascade(CascadeMode.Stop)
            .NotEmpty().WithErrorCode(ErrorCodes.Required)
            .MaximumLength(MaximumPemLength).WithErrorCode(ErrorCodes.CertificateTooLarge);
        validator.RuleFor(u => u.ReplacingId).Cascade(CascadeMode.Stop)
            .Must(id => cluster.Current.Certificates.ContainsKey(id!.Value)).WithErrorCode(ErrorCodes.CertificateNotFound)
            .Must(id => cluster.Current.Certificates[id!.Value].Source == CertificateSource.Uploaded).WithErrorCode(ErrorCodes.CertificateNotUploaded)
            .When(u => u.ReplacingId is not null);
        validator.RuleFor(u => u).Custom((upload, context) =>
        {
            if (string.IsNullOrEmpty(upload.ChainPem) || string.IsNullOrEmpty(upload.KeyPem)
                || upload.ChainPem.Length > MaximumPemLength || upload.KeyPem.Length > MaximumPemLength)
            {
                return;
            }

            var bundle = CertificateBundle.Check(upload.ChainPem, upload.KeyPem, time.GetUtcNow());
            if (bundle.Material is null)
            {
                var (field, code) = Failure(bundle.Problem);
                context.AddFailure(new FluentValidation.Results.ValidationFailure(field, code) { ErrorCode = code });
                return;
            }

            var uncovered = Uncovered(cluster.Current, upload.ReplacingId, bundle.Material);
            if (uncovered.Count == 0)
            {
                return;
            }

            context.AddFailure(new FluentValidation.Results.ValidationFailure(nameof(ICertificateUpload.ChainPem), ErrorCodes.CertificateRoutesNotCovered)
            {
                ErrorCode = ErrorCodes.CertificateRoutesNotCovered,
                FormattedMessagePlaceholderValues = new Dictionary<string, object>(StringComparer.Ordinal) { ["Hosts"] = string.Join(", ", uncovered) },
            });
        });
    }

    private static IReadOnlyList<string> Uncovered(ApiaryState state, Guid? replacingId, CertificateMaterial material) =>
        replacingId is { } id
            ? [.. state.Routes.Values.Where(r => r.CertificateId == id && !material.Covers(r.Host)).Select(r => r.Host).Distinct(StringComparer.Ordinal)]
            : [];

    private static (string Field, string Code) Failure(CertificateProblem problem) => problem switch
    {
        CertificateProblem.KeyInvalid => (nameof(ICertificateUpload.KeyPem), ErrorCodes.CertificateKeyInvalid),
        CertificateProblem.KeyEncrypted => (nameof(ICertificateUpload.KeyPem), ErrorCodes.CertificateKeyEncrypted),
        CertificateProblem.KeyMismatch => (nameof(ICertificateUpload.KeyPem), ErrorCodes.CertificateKeyMismatch),
        CertificateProblem.ChainIncomplete => (nameof(ICertificateUpload.ChainPem), ErrorCodes.CertificateChainIncomplete),
        CertificateProblem.Expired => (nameof(ICertificateUpload.ChainPem), ErrorCodes.CertificateExpired),
        CertificateProblem.NotYetValid => (nameof(ICertificateUpload.ChainPem), ErrorCodes.CertificateNotYetValid),
        CertificateProblem.NoHostnames => (nameof(ICertificateUpload.ChainPem), ErrorCodes.CertificateNoHostnames),
        _ => (nameof(ICertificateUpload.ChainPem), ErrorCodes.CertificatePemInvalid),
    };
}
