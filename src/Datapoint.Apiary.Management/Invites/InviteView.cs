using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Management.Invites;

public sealed record InviteView(string Name, string Email, TwoStepEnrollment Enrollment);
