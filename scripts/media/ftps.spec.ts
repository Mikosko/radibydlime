import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer, type Socket } from 'node:net';
import {
  createSecureContext,
  createServer as tlsServer,
  TLSSocket,
} from 'node:tls';
import {
  readFile,
  writeFile,
  mkdtemp,
  realpath,
  chmod,
  rm,
} from 'node:fs/promises';
import { join, posix } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { loadFtpsConfig } from './config.ts';

const execute = promisify(execFile);
const moduleUrl = new URL('./ftps.ts', import.meta.url).href;
const certificate = fileURLToPath(
  new URL('./fixtures/ftps-cert.pem', import.meta.url),
);

test('private FTPS configuration requires TLS, safe roots, matching public origin and restrictive permissions', async () => {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), 'ftps-config-')),
  );
  const envFile = join(directory, 'media.env');
  const settings = { envFile, directoryRenameVerified: true as const };
  const values = {
    MEDIA_FTP_HOST: 'ftp.example.test',
    MEDIA_FTP_USER: 'fixture',
    MEDIA_FTP_PASSWORD: 'TEST_PASSWORD',
    MEDIA_FTP_SECURE: 'true',
    MEDIA_REMOTE_ROOT: '/media',
    MEDIA_PUBLIC_BASE: 'https://media.radibydlime.cz/',
  };
  const save = async (patch: Record<string, string | undefined> = {}) =>
    writeFile(
      envFile,
      Object.entries({ ...values, ...patch })
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      { mode: 0o600 },
    );
  try {
    await save();
    assert.equal((await loadFtpsConfig(settings)).root, '/media');
    for (const patch of [
      { MEDIA_FTP_SECURE: 'false' },
      { MEDIA_PUBLIC_BASE: 'http://media.radibydlime.cz/' },
      { MEDIA_REMOTE_ROOT: '/media/../www' },
      { MEDIA_FTP_HOST: 'ftp.example.test/invalid' },
    ]) {
      await save(patch);
      await assert.rejects(loadFtpsConfig(settings), (error: Error) => {
        assert.match(error.message, /Invalid private FTPS settings/);
        assert.ok(!error.message.includes('TEST_PASSWORD'));
        return true;
      });
    }
    await save();
    await chmod(envFile, 0o644);
    await assert.rejects(loadFtpsConfig(settings), /owner-only/);
    const config = join(directory, 'media.json');
    await writeFile(
      config,
      JSON.stringify({
        workRoot: join(directory, 'work'),
        ftps: {
          envFile: join(directory, 'does-not-exist'),
          directoryRenameVerified: true,
        },
      }),
    );
    // The real processing CLI must not open the unavailable transfer credential file.
    const output = await execute(
      process.execPath,
      [
        '--experimental-strip-types',
        fileURLToPath(new URL('./cli.ts', import.meta.url)),
        'process',
        '--manual',
      ],
      { env: { ...process.env, RADIBYDLIME_MEDIA_CONFIG: config } },
    );
    assert.match(output.stdout, /failed: 0/);
    await writeFile(
      config,
      JSON.stringify({
        ftps: settings,
        sftp: {
          host: 'example.test',
          username: 'fixture',
          root: '/media',
          hostKeySha256: `SHA256:${'a'.repeat(43)}`,
        },
      }),
    );
    await assert.rejects(
      execute(
        process.execPath,
        [
          '--experimental-strip-types',
          fileURLToPath(new URL('./cli.ts', import.meta.url)),
          'upload',
        ],
        { env: { ...process.env, RADIBYDLIME_MEDIA_CONFIG: config } },
      ),
      /Invalid media configuration/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

// Public, disposable localhost TLS credentials. Never used for hosting authentication.
// This fixture deliberately implements only the FTP commands used by the real adapter.
async function fixture(
  run: (context: {
    config: object;
    files: Map<string, Buffer>;
    commands: string[];
  }) => Promise<void>,
) {
  const cert = await readFile(certificate);
  const key = await readFile(
    new URL('./fixtures/ftps-key.pem', import.meta.url),
  );
  const secureContext = createSecureContext({ cert, key });
  const files = new Map<string, Buffer>();
  const directories = new Set(['/', '/media']);
  const commands: string[] = [];
  const sockets = new Set<Socket>();
  const passiveServers = new Set<ReturnType<typeof tlsServer>>();
  const track = (socket: Socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
  };
  const server = createServer((plain) => {
    track(plain);
    let control: Socket = plain,
      secure = false,
      authenticated = false,
      protectedData = false;
    let username = '',
      renameFrom = '',
      buffer = '';
    let data: Promise<TLSSocket> | undefined;
    const reply = (message: string) => control.write(`${message}\r\n`);
    const command = async (line: string) => {
      const split = line.indexOf(' ');
      const verb = split < 0 ? line : line.slice(0, split);
      const arg = split < 0 ? '' : line.slice(split + 1);
      commands.push(verb);
      if (verb === 'AUTH') {
        reply('234 TLS');
        plain.removeListener('data', receive);
        control = new TLSSocket(plain, { isServer: true, secureContext });
        track(control);
        secure = true;
        control.on('data', receive);
        return;
      }
      if (verb === 'QUIT') {
        reply('221 Bye');
        control.end();
        return;
      }
      if (verb === 'OPTS') {
        reply('200 OK');
        return;
      }
      if (verb === 'USER') {
        username = arg;
        reply(secure ? '331 Password' : '530 TLS required');
        return;
      }
      if (verb === 'PASS') {
        authenticated =
          secure && username === 'fixture' && arg === 'fixture-password';
        reply(
          authenticated
            ? '230 Logged in'
            : '530 TEST_PASSWORD hidden server detail',
        );
        return;
      }
      if (!authenticated) {
        reply('530 Login required');
        return;
      }
      if (verb === 'FEAT') {
        reply('211-Features\r\n MLST type*;size*;\r\n EPSV\r\n211 End');
        return;
      }
      if (['TYPE', 'STRU', 'PBSZ'].includes(verb)) {
        reply('200 OK');
        return;
      }
      if (verb === 'PROT') {
        protectedData = arg === 'P';
        reply('200 OK');
        return;
      }
      if (verb === 'EPSV') {
        if (!protectedData) {
          reply('534 Protected data required');
          return;
        }
        let resolveData: (socket: TLSSocket) => void;
        data = new Promise((resolve) => {
          resolveData = resolve;
        });
        const passive = tlsServer({ cert, key }, (socket) => {
          track(socket);
          resolveData(socket);
          passive.close();
        });
        passive.on('tlsClientError', () => {});
        passiveServers.add(passive);
        passive.on('close', () => passiveServers.delete(passive));
        await new Promise<void>((resolve) =>
          passive.listen(0, '127.0.0.1', resolve),
        );
        reply(
          `229 Entering Extended Passive Mode (|||${(passive.address() as { port: number }).port}|)`,
        );
        return;
      }
      if (verb === 'MKD') {
        if (
          directories.has(arg) ||
          files.has(arg) ||
          !directories.has(posix.dirname(arg))
        ) {
          reply('550 Exists or inaccessible');
          return;
        }
        directories.add(arg);
        reply(`257 "${arg}"`);
        return;
      }
      if (verb === 'RNFR') {
        renameFrom = arg;
        reply('350 Continue');
        return;
      }
      if (verb === 'RNTO') {
        // Race after the adapter's destination check, before the directory rename.
        if (arg.endsWith('/media-00000000-0000-4000-8000-000000000002')) {
          directories.add(arg);
          files.set(`${arg}/competing.webp`, Buffer.from('winner'));
        }
        if (
          !directories.has(renameFrom) ||
          files.has(arg) ||
          [...files.keys(), ...directories].some((p) => p.startsWith(`${arg}/`))
        ) {
          reply('550 Collision');
          return;
        }
        for (const [path, value] of [...files])
          if (path.startsWith(`${renameFrom}/`)) {
            files.delete(path);
            files.set(arg + path.slice(renameFrom.length), value);
          }
        directories.delete(renameFrom);
        directories.add(arg);
        reply('250 Renamed');
        return;
      }
      if (['MLSD', 'STOR', 'RETR'].includes(verb)) {
        if (!data || !protectedData) {
          reply('425 No protected data');
          return;
        }
        if (
          (verb === 'MLSD' &&
            (!directories.has(arg) || arg === '/media/denied')) ||
          (verb === 'RETR' && !files.has(arg))
        ) {
          void data.then((socket) => socket.destroy());
          data = undefined;
          reply('550 TEST_PASSWORD access denied');
          return;
        }
        reply('150 Transfer');
        const socket = await data;
        data = undefined;
        if (verb === 'STOR') {
          const chunks: Buffer[] = [];
          socket.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          await new Promise<void>((resolve) => socket.on('end', resolve));
          files.set(arg, Buffer.concat(chunks));
          socket.end();
        } else {
          const output =
            verb === 'RETR'
              ? files.get(arg)!
              : Buffer.from(
                  [
                    ...[...directories]
                      .filter((p) => p !== arg && posix.dirname(p) === arg)
                      .map((p) => `type=dir; ${posix.basename(p)}`),
                    ...[...files]
                      .filter(([p]) => posix.dirname(p) === arg)
                      .map(
                        ([p, v]) =>
                          `type=file;size=${v.length}; ${posix.basename(p)}`,
                      ),
                  ].join('\r\n') + '\r\n',
                );
          socket.end(output);
        }
        reply('226 Complete');
        return;
      }
      reply('502 Unsupported');
    };
    const receive = (chunk: Buffer) => {
      buffer += chunk.toString();
      let end: number;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        void command(line).catch(() => control.destroy());
      }
    };
    control.on('data', receive);
    reply('220 Local FTPS fixture');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run({
      config: {
        host: '127.0.0.1',
        port: (server.address() as { port: number }).port,
        username: 'fixture',
        password: 'fixture-password',
        root: '/media',
        directoryRenameVerified: true,
      },
      files,
      commands,
    });
  } finally {
    for (const socket of sockets) socket.destroy();
    for (const passive of passiveServers) passive.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test(
  'actual FTPS adapter verifies TLS, claims staging exclusively and protects concurrent publications',
  { timeout: 30000 },
  async () =>
    fixture(async ({ config, files, commands }) => {
      const prelude = `import assert from 'node:assert/strict'; import {connectFtps} from ${JSON.stringify(moduleUrl)}; const config=${JSON.stringify(config)};`;
      const child = (script: string, trusted = true) =>
        execute(
          process.execPath,
          [
            '--experimental-strip-types',
            '--input-type=module',
            '-e',
            prelude + script,
          ],
          {
            timeout: 25000,
            env: {
              ...process.env,
              NODE_EXTRA_CA_CERTS: trusted ? certificate : '',
            },
          },
        );
      await child(
        `await assert.rejects(connectFtps(config), /FTPS connection failed/);`,
        false,
      );
      await child(
        `await assert.rejects(connectFtps({...config, password:'wrong'}), e => !e.message.includes('TEST_PASSWORD') && /FTPS connection failed/.test(e.message));`,
      );
      await child(`
    const t=await connectFtps(config);
    try {
      await t.mkdir('/images');
      const id='media-00000000-0000-4000-8000-000000000001';
      const stage='/images/.'+id+'.00000000-0000-4000-8000-000000000003.part/photo.webp';
      const destination='/images/'+id+'/photo.webp';
      const bytes=Buffer.from('prepared pixels');
      await t.putExclusive(stage,bytes);
      const before=await t.hash(stage);
      await assert.rejects(t.putExclusive(stage,Buffer.from('overwrite')), /Exclusive FTPS/);
      assert.equal(await t.hash(stage),before);
      await t.promote(stage,destination);
      assert.equal(await t.hash(destination),before);
      assert.equal(await t.stat(stage),undefined);
      const race=stage.replaceAll('000000000001','000000000002');
      await t.putExclusive(race,bytes);
      await assert.rejects(t.promote(race,destination.replaceAll('000000000001','000000000002')), /promotion failed/);
      assert.equal(await t.hash(race),before);
      await assert.rejects(t.stat('/images/../elsewhere'), /metadata check failed/);
    } finally { t.close(); }
  `);
      assert.equal(
        files
          .get(
            '/media/images/media-00000000-0000-4000-8000-000000000002/competing.webp',
          )
          ?.toString(),
        'winner',
      );
      assert.equal(
        files
          .get(
            '/media/images/media-00000000-0000-4000-8000-000000000001/photo.webp',
          )
          ?.toString(),
        'prepared pixels',
      );
      assert.ok(
        commands.includes('PROT') &&
          commands.includes('RETR') &&
          commands.includes('STOR'),
      );
      assert.ok(!commands.includes('DELE') && !commands.includes('RMD'));
    }),
);
