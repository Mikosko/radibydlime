import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { Client, type FileInfo } from 'basic-ftp';
import type { FtpsConfig } from './config.ts';
import type { Transport } from './transport.ts';

export async function connectFtps(config: FtpsConfig): Promise<Transport> {
  if (config.directoryRenameVerified !== true)
    throw new Error(
      'Verify FTPS directory-promotion behavior before publication',
    );
  const client = new Client(30000, {
    allowSeparateTransferHost: false,
    maxListingBytes: 4 * 1024 * 1024,
  });
  client.ftp.verbose = false;
  const guard = async <T>(
    message: string,
    run: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await run();
    } catch {
      throw new Error(message);
    }
  };
  const remote = (path: string) => {
    if (
      (path !== '/images' && !path.startsWith('/images/')) ||
      path.split('/').some((s) => s === '.' || s === '..') ||
      /[\\\x00-\x1f]/.test(path)
    )
      throw new Error('Unsafe FTPS path');
    return posix.join(config.root, path);
  };
  const list = async (path: string) => {
    const result = await client.list(path);
    const names = new Set<string>();
    for (const entry of result) {
      if (
        entry.name === '.' ||
        entry.name === '..' ||
        /[\/\\\x00-\x1f]/.test(entry.name) ||
        names.has(entry.name)
      )
        throw new Error('Invalid FTPS listing');
      names.add(entry.name);
    }
    return result;
  };
  // Absence is established by a successful parent listing, never by a 550 error.
  const info = async (path: string): Promise<FileInfo | undefined> => {
    let parent = '/';
    const parts = path.split('/').filter(Boolean);
    for (const [index, part] of parts.entries()) {
      const entry = (await list(parent)).find((v) => v.name === part);
      if (!entry) return undefined;
      if (index === parts.length - 1) return entry;
      if (!entry.isDirectory || entry.isSymbolicLink)
        throw new Error('Unsafe FTPS parent');
      parent = posix.join(parent, part);
    }
    throw new Error('A remote document root below / is required');
  };
  const directory = async (path: string) => {
    const entry = await info(path);
    if (!entry?.isDirectory || entry.isSymbolicLink)
      throw new Error('FTPS directory is inaccessible or unsafe');
  };
  try {
    await guard(
      'FTPS connection failed: check TLS certificate, host and private account settings',
      async () => {
        await client.access({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          secure: true,
          secureOptions: { rejectUnauthorized: true },
        });
        // Require MLSD; no ambiguous legacy listing fallback or plaintext data channel.
        client.availableListCommands = ['MLSD'];
        await client.send('PROT P');
        await directory(config.root);
      },
    );
  } catch (error) {
    client.close();
    throw error;
  }
  return {
    directoryPromotion: true,
    stat: (path) =>
      guard(
        'FTPS metadata check failed; access errors are not absence',
        async () => {
          const entry = await info(remote(path));
          return !entry
            ? undefined
            : entry.isSymbolicLink
              ? 'other'
              : entry.isFile
                ? 'file'
                : entry.isDirectory
                  ? 'directory'
                  : 'other';
        },
      ),
    mkdir: (path) =>
      guard('FTPS image directory is inaccessible or unsafe', async () => {
        if (path !== '/images') throw new Error();
        const full = remote(path);
        if (!(await info(full))) {
          try {
            await client.send(`MKD ${full}`);
          } catch {
            /* Accept only a verified competing mkdir. */
          }
        }
        await directory(full);
      }),
    putExclusive: (path, data) =>
      guard(
        'Exclusive FTPS staging failed; existing or partial staging was not overwritten',
        async () => {
          const full = remote(path);
          const parent = posix.dirname(full);
          if (
            !/^\/images\/\.media-[0-9a-f-]+\.[0-9a-f-]+\.part\/[a-z0-9-]+\.webp$/.test(
              path,
            )
          )
            throw new Error();
          await directory(posix.dirname(parent));
          // MKD must succeed in this invocation. Never resume STOR into an existing directory.
          await client.send(`MKD ${parent}`);
          if ((await list(parent)).length) throw new Error();
          await client.uploadFrom(Readable.from([data]), full);
        },
      ),
    hash: (path) =>
      guard(
        'FTPS readback failed; remote bytes remain unverified',
        async () => {
          const full = remote(path);
          const entry = await info(full);
          if (!entry?.isFile || entry.isSymbolicLink) throw new Error();
          const sum = createHash('sha256');
          let length = 0;
          await client.downloadTo(
            new Writable({
              write(chunk: Buffer, _encoding, done) {
                length += chunk.length;
                if (length > 32 * 1024 * 1024) {
                  done(new Error('Size limit'));
                  return;
                }
                sum.update(chunk);
                done();
              },
            }),
            full,
          );
          return sum.digest('hex');
        },
      ),
    promote: (source, destination) =>
      guard(
        'FTPS directory promotion failed; destination collision or unsupported host semantics; inspect retained staging',
        async () => {
          const from = remote(source),
            to = remote(destination);
          const sourceDir = posix.dirname(from),
            destinationDir = posix.dirname(to);
          if (
            posix.basename(from) !== posix.basename(to) ||
            !/^\/images\/\.media-[0-9a-f-]+\.[0-9a-f-]+\.part\/[a-z0-9-]+\.webp$/.test(
              source,
            ) ||
            !/^\/images\/media-[0-9a-f-]+\/[a-z0-9-]+\.webp$/.test(destination)
          )
            throw new Error();
          await directory(sourceDir);
          const children = await list(sourceDir);
          if (
            children.length !== 1 ||
            children[0]?.name !== posix.basename(from) ||
            !children[0].isFile ||
            children[0].isSymbolicLink ||
            (await info(destinationDir))
          )
            throw new Error();
          // POSIX directory rename cannot replace a nonempty directory, file or symlink.
          // Thus a competing publisher cannot overwrite another publisher's image.
          await client.rename(sourceDir, destinationDir);
        },
      ),
    close() {
      client.close();
    },
  };
}
