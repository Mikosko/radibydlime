import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import ssh2 from 'ssh2';
import type { SFTPWrapper, Stats } from 'ssh2';
import type { TransferConfig } from './config.ts';
import { bytes } from './state.ts';

export interface Transport {
  /** FTPS publishes a whole verified directory; SFTP publishes an exclusive file. */
  directoryPromotion?: true;
  stat(path: string): Promise<'file' | 'directory' | 'other' | undefined>;
  mkdir(path: string): Promise<void>;
  putExclusive(path: string, data: Buffer): Promise<void>;
  hash(path: string): Promise<string>;
  promote(source: string, destination: string): Promise<void>;
  close(): void;
}
export async function connectSftp(config: TransferConfig): Promise<Transport> {
  const client = new ssh2.Client();
  const privateKey = config.privateKeyPath
    ? await bytes(config.privateKeyPath, 128 * 1024)
    : undefined;
  const agent = privateKey ? undefined : process.env.SSH_AUTH_SOCK;
  if (!privateKey && !agent)
    throw new Error('Configure an SSH agent or machine-local privateKeyPath');
  let sftp: SFTPWrapper;
  let connectionTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    sftp = await new Promise<SFTPWrapper>((resolve, reject) => {
      connectionTimer = setTimeout(() => {
        client.end();
        reject(new Error('SFTP connection/subsystem setup timed out'));
      }, 30000);
      client.on('error', () =>
        reject(
          new Error(
            'SFTP connection failed: check account, key and verified host fingerprint',
          ),
        ),
      );
      client.once('ready', () =>
        client.sftp((error, connection) =>
          error
            ? reject(new Error('SFTP subsystem unavailable'))
            : resolve(connection),
        ),
      );
      client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey,
        agent,
        readyTimeout: 15000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
        hostVerifier: (key: Buffer) =>
          `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}` ===
          config.hostKeySha256,
      });
    });
  } catch (e) {
    client.end();
    throw e;
  } finally {
    clearTimeout(connectionTimer);
  }
  const bounded = async <T>(task: Promise<T>) => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([
        task,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            client.end();
            reject(
              new Error(
                'SFTP operation timed out; retry from retained local state',
              ),
            );
          }, 60000);
        }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  };
  const callback = <T>(
    fn: (done: (e: Error | null | undefined, value: T) => void) => void,
  ) =>
    bounded(
      new Promise<T>((resolve, reject) =>
        fn((e, v) => (e ? reject(e) : resolve(v))),
      ),
    );
  const remote = (path: string) => {
    if (
      !path.startsWith('/images/') ||
      path.includes('..') ||
      /[\\\x00-\x1f]/.test(path)
    )
      throw new Error('Unsafe remote path');
    return posix.join(config.root, path);
  };
  const stat = async (path: string) => {
    try {
      return await callback<Stats>((done) => sftp.lstat(path, done));
    } catch (e) {
      if ((e as { code?: number }).code === 2) return undefined;
      throw new Error(
        'SFTP metadata check failed; permission/connection errors are not absence',
      );
    }
  };
  // The configured account/root is trusted, but reject symlink ancestors rather than following them.
  const ensureDirectory = async (path: string, create: boolean) => {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += `/${part}`;
      let info = await stat(current);
      if (!info && create) {
        try {
          await callback<void>((done) =>
            sftp.mkdir(current, { mode: 0o755 }, (e) => done(e, undefined)),
          );
        } catch {
          /* A competing mkdir is safe only if the directory now exists. */
        }
        info = await stat(current);
      }
      if (!info?.isDirectory())
        throw new Error(
          'Remote parent is missing, inaccessible or not a real directory',
        );
    }
  };
  await ensureDirectory(config.root, false).catch((e) => {
    client.end();
    throw e;
  });
  return {
    async stat(path) {
      await ensureDirectory(posix.dirname(remote(path)), false);
      const info = await stat(remote(path));
      return !info
        ? undefined
        : info.isFile()
          ? 'file'
          : info.isDirectory()
            ? 'directory'
            : 'other';
    },
    async mkdir(path) {
      await ensureDirectory(remote(path), true);
    },
    async putExclusive(path, data) {
      await ensureDirectory(posix.dirname(remote(path)), false);
      try {
        await bounded(
          pipeline(
            Readable.from([data]),
            sftp.createWriteStream(remote(path), { flags: 'wx', mode: 0o644 }),
          ),
        );
      } catch {
        throw new Error(
          'Exclusive SFTP upload failed; existing/partial files were not overwritten',
        );
      }
    },
    async hash(path) {
      await ensureDirectory(posix.dirname(remote(path)), false);
      if (!(await stat(remote(path)))?.isFile())
        throw new Error('Remote verification target is not a regular file');
      return bounded(
        (async () => {
          const stream = sftp.createReadStream(remote(path));
          let count = 0;
          const hash = createHash('sha256');
          try {
            for await (const chunk of stream) {
              count += chunk.length;
              if (count > 32 * 1024 * 1024)
                throw new Error('Remote file exceeds verification limit');
              hash.update(chunk);
            }
          } finally {
            stream.destroy();
          }
          return hash.digest('hex');
        })(),
      ).catch(() => {
        throw new Error('SFTP readback failed; remote bytes remain unverified');
      });
    },
    async promote(source, destination) {
      await ensureDirectory(posix.dirname(remote(destination)), false);
      try {
        // POSIX link() is atomic and fails if destination exists. Unlike rename(), it cannot clobber.
        // Keep the staging link: automated remote deletion is deliberately outside this CLI.
        await callback<void>((done) =>
          sftp.ext_openssh_hardlink(remote(source), remote(destination), (e) =>
            done(e, undefined),
          ),
        );
      } catch {
        throw new Error(
          'No-replace promotion failed: destination collision or host lacks hardlink@openssh.com; inspect retained staging path',
        );
      }
    },
    close() {
      client.end();
    },
  };
}
