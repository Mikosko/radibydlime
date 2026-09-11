import { execFile } from 'node:child_process';
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const root = fileURLToPath(new URL('../../', import.meta.url));

export async function withFixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'radibydlime-build-'));
  try {
    for (const path of [
      'src',
      'astro.config.mjs',
      'tsconfig.json',
      'package.json',
    ]) {
      await cp(join(root, path), join(directory, path), { recursive: true });
    }
    await symlink(
      join(root, 'node_modules'),
      join(directory, 'node_modules'),
      'dir',
    );
    const configPath = join(directory, 'astro.config.mjs');
    await writeFile(
      configPath,
      (await readFile(configPath, 'utf8'))
        .replace('defineConfig({', "defineConfig({ cacheDir: './.astro/cache',")
        .replace('vite: {', "vite: { cacheDir: './.astro/vite',"),
    );
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function build(directory: string) {
  // Fixture builds must use catalog metadata without probing/downloading public bytes.
  const guard = join(directory, 'offline-build.mjs');
  await writeFile(
    guard,
    `
    import net from 'node:net';
    import { appendFileSync } from 'node:fs';
    const blocked = () => {
      appendFileSync('network-attempts.txt', 'Unexpected build network request\\n');
      throw new Error('Unexpected build network request');
    };
    globalThis.fetch = blocked;
    const connect = net.Socket.prototype.connect;
    net.Socket.prototype.connect = function (...args) {
      const options = Array.isArray(args[0]) ? args[0][0] : args[0];
      if (typeof options === 'number' || options?.port) blocked();
      return connect.apply(this, args);
    };
  `,
  );
  const result = await exec(
    process.execPath,
    [
      '--import',
      guard,
      join(root, 'node_modules/astro/bin/astro.mjs'),
      'build',
    ],
    {
      cwd: directory,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  // Also catch callers that swallow a failed fetch and silently fall back.
  const attempts = await readFile(
    join(directory, 'network-attempts.txt'),
    'utf8',
  ).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
    return '';
  });
  if (attempts) throw new Error(attempts);
  return result;
}
