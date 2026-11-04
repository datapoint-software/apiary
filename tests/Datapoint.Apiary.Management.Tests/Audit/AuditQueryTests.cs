using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Users;
using Datapoint.Apiary.Management.Audit;
using Datapoint.Apiary.Testing;
using static Datapoint.Apiary.Testing.Builders.StateBuilders;

namespace Datapoint.Apiary.Management.Tests.Audit;

public sealed class AuditQueryTests : IDisposable
{
    private readonly ManagementHost _host = new();

    public AuditQueryTests() => _host.SignedIn(Role.Viewer);

    public void Dispose() => _host.Dispose();

    [Fact]
    public async Task Entries_are_listed_newest_first()
    {
        var older = AnAuditEntry(TestClock.Now.AddHours(-2));
        var newer = AnAuditEntry(TestClock.Now.AddHours(-1));
        _host.Seed(new AuditRecorded(older), new AuditRecorded(newer));

        var entries = await _host.QueryAsync(new ListAudit());

        Assert.Equal([newer.Id, older.Id], entries.Select(e => e.Id));
    }

    [Fact]
    public async Task At_most_500_entries_are_listed()
    {
        _host.Seed([.. Enumerable.Range(0, 501).Select(_ => new AuditRecorded(AnAuditEntry()))]);

        Assert.Equal(500, (await _host.QueryAsync(new ListAudit())).Count);
    }

    [Fact]
    public async Task Entries_are_filtered_by_time()
    {
        var inside = AnAuditEntry(TestClock.Now.AddHours(-1));
        _host.Seed(new AuditRecorded(AnAuditEntry(TestClock.Now.AddDays(-2))), new AuditRecorded(inside), new AuditRecorded(AnAuditEntry(TestClock.Now)));

        var entries = await _host.QueryAsync(new ListAudit(TestClock.Now.AddDays(-1), TestClock.Now.AddMinutes(-1)));

        Assert.Equal(inside.Id, entries.Single().Id);
    }

    [Fact]
    public async Task A_user_s_entries_are_found_by_their_email_now()
    {
        var bea = _host.AUserIn(Role.Operator, "bea@example.com");
        var before = AnAuditEntry() with { User = "beatriz@example.com", UserId = bea.Id };
        _host.Seed(new AuditRecorded(before), new AuditRecorded(AnAuditEntry()));

        var entries = await _host.QueryAsync(new ListAudit(User: "BEA@example.com"));

        Assert.Equal(before.Id, entries.Single().Id);
    }

    [Fact]
    public async Task Only_failures_can_be_listed()
    {
        var denied = AnAuditEntry() with { Outcome = AuditOutcome.Denied };
        _host.Seed(new AuditRecorded(AnAuditEntry()), new AuditRecorded(denied));

        Assert.Equal(denied.Id, (await _host.QueryAsync(new ListAudit(FailedOnly: true))).Single().Id);
    }

    [Fact]
    public async Task Entries_are_filtered_by_who_made_them()
    {
        var person = AnAuditEntry() with { Client = null };
        var agent = AnAuditEntry() with { Client = "Claude" };
        var system = AnAuditEntry() with { User = null, Client = null };
        _host.Seed(new AuditRecorded(person), new AuditRecorded(agent), new AuditRecorded(system));

        var found = (
            (await _host.QueryAsync(new ListAudit(Via: AuditVia.People))).Single().Id,
            (await _host.QueryAsync(new ListAudit(Via: AuditVia.Agents))).Single().Id,
            (await _host.QueryAsync(new ListAudit(Via: AuditVia.System))).Single().Id);

        Assert.Equal((person.Id, agent.Id, system.Id), found);
    }

    [Fact]
    public async Task A_search_looks_at_the_action_and_affected_names_ignoring_case()
    {
        var match = AnAuditEntry(action: "certificates.upload") with { Affected = ["Shop.Example.com"] };
        _host.Seed(new AuditRecorded(match), new AuditRecorded(AnAuditEntry() with { Affected = ["blog.example.com"] }));

        Assert.Equal(match.Id, (await _host.QueryAsync(new ListAudit(Search: " shop.example "))).Single().Id);
        Assert.Equal(match.Id, (await _host.QueryAsync(new ListAudit(Search: "CERTIFICATES"))).Single().Id);
    }

    [Fact]
    public async Task A_search_is_at_most_200_characters()
    {
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() => _host.QueryAsync(new ListAudit(Search: new string('a', 201))));
    }
}
