import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:http';
import ssh2 from 'ssh2';
import { connectSftp } from './transport.ts';
import { hash } from './state.ts';
import { verifyPublic } from './upload.ts';
import type { Media } from '../../src/content/media/schema.ts';

// A deliberately small SFTP-v3 fixture over a real authenticated SSH connection.
// Implements only operations used by the production adapter, including no-replace hard links.
const uint = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
};
const str = (s: string | Buffer) => {
  const b = Buffer.from(s);
  return Buffer.concat([uint(b.length), b]);
};
async function serverFixture(
  run: (ctx: {
    config: Parameters<typeof connectSftp>[0];
    files: Map<string, Buffer>;
    denied: Set<string>;
    httpOrigin: string;
    operations: number[];
  }) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), 'media-sftp-'));
  const host = generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs1', format: 'pem' })
    .toString();
  const key = generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs1', format: 'pem' })
    .toString();
  const keyPath = join(directory, 'private-key');
  await writeFile(keyPath, key, { mode: 0o600 });
  const pub = (ssh2.utils.parseKey(key) as ssh2.ParsedKey).getPublicSSH();
  const files = new Map<string, Buffer>(),
    directories = new Set(['/', '/media-test']),
    denied = new Set<string>(),
    operations: number[] = [];
  const connections = new Set<ssh2.Connection>();
  const server = new ssh2.Server({ hostKeys: [host] }, (client) => {
    connections.add(client);
    client.on('close', () => connections.delete(client));
    client.on('error', () => {});
    client.on('authentication', (ctx) => {
      if (
        ctx.username === 'fixture' &&
        ctx.method === 'publickey' &&
        ctx.key.data.equals(pub) &&
        (!ctx.signature ||
          (ssh2.utils.parseKey(key) as ssh2.ParsedKey).verify(
            ctx.blob!,
            ctx.signature,
            ctx.hashAlgo,
          ) === true)
      )
        ctx.accept();
      else ctx.reject();
    });
    client.on('ready', () =>
      client.on('session', (accept) => {
        const session = accept();
        session.on('subsystem', (accept, reject, info) => {
          if (info.name !== 'sftp') {
            reject?.();
            return;
          }
          const channel = accept();
          let pending = Buffer.alloc(0),
            nextHandle = 1;
          const handles = new Map<number, { path: string; write: boolean }>();
          const send = (type: number, ...data: Buffer[]) => {
            const body = Buffer.concat([Buffer.from([type]), ...data]);
            channel.write(Buffer.concat([uint(body.length), body]));
          };
          channel.on('error', () => {});
          channel.on('data', (chunk: Buffer) => {
            pending = Buffer.concat([pending, chunk]);
            while (
              pending.length >= 4 &&
              pending.length >= pending.readUInt32BE(0) + 4
            ) {
              const length = pending.readUInt32BE(0),
                packet = pending.subarray(4, length + 4);
              pending = pending.subarray(length + 4);
              const type = packet[0]!;
              operations.push(type);
              if (type === 1) {
                send(2, uint(3), str('hardlink@openssh.com'), str('1'));
                continue;
              }
              const id = packet.readUInt32BE(1);
              let p = 5;
              const number = () => {
                const n = packet.readUInt32BE(p);
                p += 4;
                return n;
              };
              const string = () => {
                const n = number(),
                  b = packet.subarray(p, p + n);
                p += n;
                return b;
              };
              const status = (code: number) =>
                send(
                  101,
                  uint(id),
                  uint(code),
                  str(code ? 'fixture failure' : ''),
                  str(''),
                );
              try {
                if (type === 7 || type === 17) {
                  const path = string().toString();
                  if (denied.has(path)) {
                    status(3);
                    continue;
                  }
                  if (!files.has(path) && !directories.has(path)) {
                    status(2);
                    continue;
                  }
                  const size = files.get(path)?.length ?? 0,
                    mode = directories.has(path) ? 0o040755 : 0o100644;
                  send(105, uint(id), uint(5), uint(0), uint(size), uint(mode));
                } else if (type === 14) {
                  const path = string().toString();
                  if (
                    directories.has(path) ||
                    files.has(path) ||
                    !path.startsWith('/media-test/')
                  )
                    status(4);
                  else {
                    directories.add(path);
                    status(0);
                  }
                } else if (type === 3) {
                  const path = string().toString(),
                    flags = number();
                  if (denied.has(path)) {
                    status(3);
                    continue;
                  }
                  if (flags & 32 && files.has(path)) {
                    status(4);
                    continue;
                  }
                  if (!(flags & 8) && !files.has(path)) {
                    status(2);
                    continue;
                  }
                  if (flags & 8) files.set(path, Buffer.alloc(0));
                  const handle = nextHandle++;
                  handles.set(handle, { path, write: !!(flags & 2) });
                  send(102, uint(id), str(uint(handle)));
                } else if (type === 6) {
                  const handle = handles.get(string().readUInt32BE(0));
                  number();
                  const offset = number(),
                    data = string();
                  if (!handle?.write) {
                    status(4);
                    continue;
                  }
                  const old = files.get(handle.path)!;
                  const output = Buffer.alloc(
                    Math.max(old.length, offset + data.length),
                  );
                  old.copy(output);
                  data.copy(output, offset);
                  files.set(handle.path, output);
                  status(0);
                } else if (type === 5) {
                  const handle = handles.get(string().readUInt32BE(0));
                  number();
                  const offset = number(),
                    amount = number();
                  if (!handle) {
                    status(4);
                    continue;
                  }
                  const data = files.get(handle.path)!;
                  if (offset >= data.length) status(1);
                  else
                    send(
                      103,
                      uint(id),
                      str(data.subarray(offset, offset + amount)),
                    );
                } else if (type === 4) {
                  handles.delete(string().readUInt32BE(0));
                  status(0);
                } else if (type === 200) {
                  const extension = string().toString(),
                    src = string().toString(),
                    dst = string().toString();
                  if (extension !== 'hardlink@openssh.com') {
                    status(8);
                    continue;
                  }
                  if (
                    !files.has(src) ||
                    files.has(dst) ||
                    directories.has(dst)
                  ) {
                    status(4);
                    continue;
                  }
                  files.set(dst, files.get(src)!);
                  status(0);
                } else status(8);
              } catch {
                status(4);
              }
            }
          });
        });
      }),
    );
  });
  const http = createServer((request, response) => {
    const image = files.get(`/media-test${request.url}`);
    response.writeHead(image ? 200 : 404, { 'Content-Type': 'image/webp' });
    response.end(image ?? 'missing');
  });
  try {
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as { port: number }).port;
    const publicKey = (
      ssh2.utils.parseKey(host) as ssh2.ParsedKey
    ).getPublicSSH();
    await run({
      config: {
        host: '127.0.0.1',
        port,
        username: 'fixture',
        root: '/media-test',
        privateKeyPath: keyPath,
        hostKeySha256: `SHA256:${createHash('sha256').update(publicKey).digest('base64').replace(/=+$/, '')}`,
      },
      files,
      denied,
      operations,
      httpOrigin: `http://127.0.0.1:${(http.address() as { port: number }).port}`,
    });
  } finally {
    for (const connection of connections) connection.end();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    http.closeAllConnections();
    await new Promise<void>((resolve) => http.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
}

test('real SSH/SFTP adapter: pinned key, exclusive writes, readback, no-replace promotion and HTTP verification', async () =>
  serverFixture(async ({ config, files, denied, httpOrigin, operations }) => {
    await assert.rejects(
      connectSftp({ ...config, hostKeySha256: `SHA256:${'a'.repeat(43)}` }),
      /connection failed/,
    );
    await assert.rejects(
      connectSftp({ ...config, username: 'wrong' }),
      /connection failed/,
    );
    const transfer = await connectSftp(config);
    try {
      await transfer.mkdir('/images/test');
      const source = '/images/test/.attempt.part',
        destination = '/images/test/image.webp',
        data = Buffer.from('prepared derivative');
      await transfer.putExclusive(source, data);
      assert.equal(await transfer.hash(source), hash(data));
      await assert.rejects(
        transfer.putExclusive(source, Buffer.from('replacement')),
        /Exclusive/,
      );
      await transfer.promote(source, destination);
      assert.equal(await transfer.hash(destination), hash(data));
      await assert.rejects(transfer.promote(source, destination), /No-replace/);
      assert.equal(
        files.get(`/media-test${destination}`)?.toString(),
        data.toString(),
      );
      denied.add(`/media-test${source}`);
      await assert.rejects(transfer.stat(source), /metadata check failed/);
      denied.clear();
      const item = { path: destination, sha256: hash(data) } as Media;
      await verifyPublic(item, async (input, init) =>
        fetch(`${httpOrigin}${new URL(String(input)).pathname}`, init),
      );
      files.set(`/media-test${destination}`, Buffer.from('tampered'));
      await assert.rejects(
        verifyPublic(item, async (input, init) =>
          fetch(`${httpOrigin}${new URL(String(input)).pathname}`, init),
        ),
        /verification failed/,
      );
      assert.ok(operations.includes(200));
      assert.ok(!operations.includes(13), 'No remote remove operation');
      assert.ok(!operations.includes(18), 'No overwriting rename operation');
    } finally {
      transfer.close();
    }
  }));
