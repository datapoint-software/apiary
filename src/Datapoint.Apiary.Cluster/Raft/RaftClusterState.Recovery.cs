using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using Datapoint.Apiary.Cluster.Audit;
using Datapoint.Apiary.Cluster.Join;
using Datapoint.Apiary.Cluster.Recovery;
using Datapoint.Apiary.Cluster.Replicas;
using Datapoint.Apiary.Cluster.State;
using Datapoint.Apiary.Cluster.Trust;
using Microsoft.Extensions.Logging;

namespace Datapoint.Apiary.Cluster.Raft;

public sealed partial class RaftClusterState
{
    public const string RecoverAction = "cluster.recover";
    private ClusterCa? _recoveryCa;

    private string RecoveryFile => Path.Combine(RaftDirectory, "recover.json");

    public async Task<RecoveryPlan> PlanRecoveryAsync(CancellationToken cancellationToken)
    {
        var state = Current;
        var survivors = new List<Survivor>();
        if (discovery.IsSwarm && Address is { } address)
        {
            foreach (var peer in await discovery.PeersAsync(address.Address, cancellationToken))
            {
                if (await FetchViewAsync(peer, cancellationToken) is { } view && view.Members.FirstOrDefault(m => m.Local) is { } member)
                {
                    survivors.Add(new Survivor(member.Node, member.Address, view.Index, view.Writable));
                }
            }
        }

        var users = state.Users.Values
            .OrderBy(u => u.Email, StringComparer.Ordinal)
            .Select(u => new RecoveryUser(u.Name, u.Email, u.Role.ToString(), u.Status.ToString()))
            .ToList();
        var unreachable = (await DescribeAsync(cancellationToken)).Members.Where(m => !m.Reachable).Select(m => m.Node ?? m.Address).ToList();
        var needed = RecoveryPlan.IsNeeded(discovery.IsSwarm, state.ClusterCa is not null, IsWritable, survivors);
        return new RecoveryPlan(needed, NodeName, state.Index, state.Audit.LastOrDefault()?.At, survivors, unreachable, users);
    }

    public async Task RequestRecoveryAsync(string? node, string? requestedBy, string? address, CancellationToken cancellationToken)
    {
        if (node is not null && !string.Equals(node, NodeName, StringComparison.Ordinal))
        {
            throw new RecoveryRefusedException($"This request reached the replica on {NodeName}, not the one on {node}. Check again from the replica that answers.")
            {
                Code = RecoveryRefusedException.OtherReplica,
            };
        }

        var plan = await PlanRecoveryAsync(cancellationToken);
        if (plan.Survivors.FirstOrDefault(s => s.Writable) is { } writable)
        {
            throw new RecoveryRefusedException($"The replica on {writable.Node} at {writable.Address} is in a cluster that has a majority. Restart this replica so it rejoins that cluster instead.")
            {
                Code = RecoveryRefusedException.MajorityElsewhere,
            };
        }

        if (!plan.Needed)
        {
            throw new RecoveryRefusedException("This replica can write, or isn't running in Swarm, or hasn't joined a cluster yet, so there's nothing to recover.")
            {
                Code = RecoveryRefusedException.NotNeeded,
            };
        }

        if (plan.Survivors.FirstOrDefault(s => s.Index > plan.Index) is { } ahead)
        {
            throw new RecoveryRefusedException($"The replica on {ahead.Node} at {ahead.Address} has more changes. Recover from that one instead.")
            {
                Code = RecoveryRefusedException.NotMostRecent,
            };
        }

        var request = new RecoveryRequest(time.GetUtcNow(), plan.Index) { RequestedBy = requestedBy, Address = address };
        await File.WriteAllBytesAsync(RecoveryFile, JsonSerializer.SerializeToUtf8Bytes(request, ClusterJsonContext.Default.RecoveryRequest), cancellationToken);
        LogRecoveryRequested(plan.Index);
        lifetime.StopApplication();
    }

    private bool IsRecovering => File.Exists(RecoveryFile) && _log is not null && Current.ClusterCa is not null;

    private void PrepareRecovery()
    {
        var now = time.GetUtcNow();
        _recoveryCa = ClusterAuthority.Create(now);
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        UseCredentials(new ReplicaCredentials(key, ClusterAuthority.Issue(_recoveryCa, key.ExportSubjectPublicKeyInfo(), Identity!.Id, now), _recoveryCa.CertificatePem));
        MemberAddressBook.Rewrite(MembersFile, [Address!]);
    }

    private async Task FinishRecoveryAsync(CancellationToken cancellationToken)
    {
        await _raft!.WaitForLeadershipAsync(cancellationToken);
        var now = time.GetUtcNow();
        var previous = Current.ClusterId;
        var request = await ReadRecoveryRequestAsync(cancellationToken);
        IStateChange[] changes =
        [
            new ClusterRecovered(Guid.CreateVersion7(now), _recoveryCa!, new Replica(Identity!.Id, NodeName, Address!.ToString(), now, StateSchema.Current, protocol.OwnKeys.RootKeyId)),
            new AuditRecorded(new AuditEntry(Guid.CreateVersion7(now), now, request?.RequestedBy, request?.RequestedBy is null ? "Operator" : null, request?.Address, RecoverAction, [NodeName], null, AuditOutcome.Succeeded)),
        ];
        await AppendLocalAsync(new StateEntry(Guid.CreateVersion7(now), now, changes), cancellationToken);
        File.Delete(RecoveryFile);
        LogRecovered(previous, Current.ClusterId);
    }

    private async Task<RecoveryRequest?> ReadRecoveryRequestAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = File.OpenRead(RecoveryFile);
            return await JsonSerializer.DeserializeAsync(stream, ClusterJsonContext.Default.RecoveryRequest, cancellationToken);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private async Task<bool> IsSupersededAsync(bool outsidersOnly, CancellationToken cancellationToken)
    {
        using var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var peers = await discovery.PeersAsync(Address!.Address, cancellationToken);
        foreach (var peer in outsidersOnly ? peers.Where(p => !IsMember(new IPEndPoint(p, options.Value.RaftPort))) : peers)
        {
            if ((await AskToJoinAsync(peer, key, cancellationToken))?.Status is JoinStatus.Superseded)
            {
                return true;
            }
        }

        return false;
    }

    private void ArchiveSupersededState()
    {
        var archive = Path.Combine(DataDirectory, $"superseded-{time.GetUtcNow():yyyyMMdd-HHmmss}");
        Directory.CreateDirectory(archive);
        foreach (var name in new[] { "state", "raft", "replica.json" })
        {
            var source = Path.Combine(DataDirectory, name);
            if (Directory.Exists(source))
            {
                Directory.Move(source, Path.Combine(archive, name));
            }
            else if (File.Exists(source))
            {
                File.Move(source, Path.Combine(archive, name));
            }
        }

        LogSuperseded(archive);
        lifetime.StopApplication();
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Forced recovery requested at index {Index}. Apiary stops now; on its next start this replica becomes the only member of a new cluster")]
    private partial void LogRecoveryRequested(long index);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Recovered: this replica is now the only member of cluster {ClusterId}, which replaces {Previous}. Everyone was signed out")]
    private partial void LogRecovered(Guid? previous, Guid? clusterId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "The cluster this replica belonged to was replaced by a forced recovery. Its old state was moved to {Archive}, and it rejoins as a new replica")]
    private partial void LogSuperseded(string archive);
}
