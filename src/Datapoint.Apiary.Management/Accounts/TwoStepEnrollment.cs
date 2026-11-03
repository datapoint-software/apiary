namespace Datapoint.Apiary.Management.Accounts;

public sealed record TwoStepEnrollment(string Challenge, string Secret, string Uri);
