using Datapoint.Apiary.Management.Accounts;
using FluentValidation;

namespace Datapoint.Apiary.Management.Setup;

public sealed class BeginSetupValidator : AbstractValidator<BeginSetup>
{
    public BeginSetupValidator(IBreachedPasswords breached) => this.AddSetupRules(breached);
}
