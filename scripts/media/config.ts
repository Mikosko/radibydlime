import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import { bytes, exists, json, safePath } from './state.ts';
import { mediaOrigin } from '../../src/content/media/schema.ts';

export const repository = fileURLToPath(new URL('../../', import.meta.url));
const absolute = z.string().refine(isAbsolute, 'Use an absolute path');
const outsideRepository = (path: string) => {
  const r = relative(repository, resolve(path));
  return r.startsWith(`..${sep}`) || r === '..' || isAbsolute(r);
};
const ftpsSettings = z
  .object({
    envFile: absolute.default(
      join(homedir(), '.config/radibydlime/media-ftp.env'),
    ),
    directoryRenameVerified: z.literal(true),
  })
  .strict();
export const modelConfig = z
  .object({
    endpoint: z.string().default('http://127.0.0.1:11434'),
    model: z.string().min(1).max(150),
  })
  .strict();
export const transferConfig = z
  .object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(22),
    username: z.string().min(1),
    root: z
      .string()
      .regex(/^\//)
      .refine(
        (p) =>
          !p.split('/').some((s) => s === '.' || s === '..') &&
          !/[\x00-\x1f\\]/.test(p),
        'Use a normalized absolute remote root',
      ),
    hostKeySha256: z.string().regex(/^SHA256:[A-Za-z0-9+/]{43}$/),
    privateKeyPath: absolute.optional(),
  })
  .strict();
const configSchema = z
  .object({
    workRoot: absolute.optional(),
    exiftool: z.string().min(1).default('exiftool'),
    ollama: modelConfig.optional(),
    sftp: transferConfig.optional(),
    ftps: ftpsSettings.optional(),
  })
  .strict()
  .refine((v) => !(v.sftp && v.ftps), 'Select only one upload transport');
export type ModelConfig = z.infer<typeof modelConfig>;
export type TransferConfig = z.infer<typeof transferConfig>;
const ftpEnvironment = z
  .object({
    MEDIA_FTP_HOST: z.string().regex(/^[a-zA-Z0-9.-]+$/),
    MEDIA_FTP_PORT: z.coerce.number().int().min(1).max(65535).default(21),
    MEDIA_FTP_USER: z
      .string()
      .min(1)
      .regex(/^[^\r\n\x00]+$/),
    MEDIA_FTP_PASSWORD: z
      .string()
      .min(1)
      .regex(/^[^\r\n\x00]+$/),
    MEDIA_FTP_SECURE: z.literal('true'),
    MEDIA_REMOTE_ROOT: transferConfig.shape.root,
    MEDIA_PUBLIC_BASE: z
      .string()
      .refine((value) => value === mediaOrigin || value === `${mediaOrigin}/`),
  })
  .strict();
export type FtpsConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  root: string;
  directoryRenameVerified: true;
};
// Called only by upload: processing must not read transfer credentials.
export async function loadFtpsConfig(
  settings: z.infer<typeof ftpsSettings>,
): Promise<FtpsConfig> {
  try {
    const checked = ftpsSettings.parse(settings);
    if (!outsideRepository(checked.envFile)) throw new Error();
    await safePath(checked.envFile);
    const info = await exists(checked.envFile);
    if (!info?.isFile() || (info.mode & 0o077) !== 0) throw new Error();
    const values = ftpEnvironment.parse(
      parseEnv((await bytes(checked.envFile, 16384)).toString()),
    );
    return {
      host: values.MEDIA_FTP_HOST,
      port: values.MEDIA_FTP_PORT,
      username: values.MEDIA_FTP_USER,
      password: values.MEDIA_FTP_PASSWORD,
      root: values.MEDIA_REMOTE_ROOT,
      directoryRenameVerified: true,
    };
  } catch {
    throw new Error(
      'Invalid private FTPS settings: check external envFile, owner-only permissions, secure=true, public base and verified directory promotion',
    );
  }
}
export async function loadConfig() {
  const configPath = resolve(
    process.env.RADIBYDLIME_MEDIA_CONFIG ||
      join(homedir(), '.config/radibydlime/media.json'),
  );
  const inside = (path: string) => {
    const r = relative(repository, path);
    return !r.startsWith(`..${sep}`) && r !== '..' && !isAbsolute(r);
  };
  if (inside(configPath))
    throw new Error(
      'Media machine configuration must be outside the repository',
    );
  let raw: unknown;
  try {
    raw = (await exists(configPath)) ? await json(configPath) : {};
  } catch {
    throw new Error(
      'Cannot read machine media configuration; check JSON syntax and file permissions',
    );
  }
  const config = configSchema.parse(raw);
  if (config.ftps && !outsideRepository(config.ftps.envFile))
    throw new Error('FTPS credentials must stay outside the repository');
  if (
    config.sftp?.privateKeyPath &&
    inside(resolve(config.sftp.privateKeyPath))
  )
    throw new Error('Private keys must stay outside the repository');
  const root = resolve(config.workRoot || join(repository, '.media'));
  if (inside(root) && root !== resolve(repository, '.media'))
    throw new Error(
      'Use .media or an absolute workRoot outside the repository',
    );
  await safePath(root);
  return { ...config, root, catalog: join(repository, 'src/content/media') };
}
