using Datapoint.Apiary.Management.Accounts;

namespace Datapoint.Apiary.Management.Auth;

public sealed record SignInStep(SignInNext Next, string Challenge, TwoStepEnrollment? Enrollment);
