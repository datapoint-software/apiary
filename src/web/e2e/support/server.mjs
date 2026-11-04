import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'apiary-e2e-'));
const project = resolve(import.meta.dirname, '../../../Datapoint.Apiary/Datapoint.Apiary.csproj');
const port = Number(process.env.E2E_ADMIN_PORT ?? 19443);

const server = spawn('dotnet', ['run', '--project', project, '--no-launch-profile'], {
    stdio: 'inherit',
    env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Production',
        Apiary__Mode: 'Standalone',
        Apiary__NodeName: 'e2e',
        Apiary__AdminPort: String(port),
        Apiary__HttpPort: String(port + 1),
        Apiary__HttpsPort: String(port + 2),
        Apiary__RaftPort: String(port + 3),
        Apiary__ClusterPort: String(port + 4),
        Apiary__DataDirectory: join(directory, 'data'),
        Apiary__KeyDirectory: join(directory, 'keys'),
        Apiary__RootKeyFile: join(directory, 'none'),
    Apiary__Acme__DirectoryUrl: 'https://127.0.0.1:1/directory',
    },
});

function stop() {
    server.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', (code) => {
    rmSync(directory, { recursive: true, force: true });
    process.exit(code ?? 0);
});
