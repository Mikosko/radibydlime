import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
import { loadConfig, loadFtpsConfig } from './config.ts';

const [command, ...args] = process.argv.slice(2);
if (args.includes('--help') || command === '--help') {
  console.log(
    'media:process [--manual] [--review <id>] — prepare/review locally; never uploads\nmedia:upload — publish sealed ready items only; never invokes AI\nSetup and recovery: docs/media.md',
  );
} else {
  try {
    if (!['process', 'upload'].includes(command ?? ''))
      throw new Error('Expected process or upload');
    const config = await loadConfig();
    let result;
    if (command === 'process') {
      const options: { manual?: boolean; reviewId?: string } = {};
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--manual') options.manual = true;
        else if (args[i] === '--review' && args[i + 1])
          options.reviewId = args[++i];
        else throw new Error('Unknown process argument; use --help');
      }
      const { processMedia } = await import('./process.ts');
      result = await processMedia({
        ...config,
        ...options,
        report: console.log,
        review: async (context) => {
          console.log(
            JSON.stringify(
              { facts: context.facts, proposedCatalog: context.catalog },
              null,
              2,
            ),
          );
          if (!stdin.isTTY || !stdout.isTTY) {
            console.log(
              'Noninteractive: left unapproved. Edit the draft and rerun --review in a terminal.',
            );
            return false;
          }
          const terminal = createInterface({ input: stdin, output: stdout });
          try {
            return (
              (await terminal.question(
                'Inspect image.webp. Check all facts, alt, captions and labels. Type approve to approve these exact files, or Enter to skip: ',
              )) === 'approve'
            );
          } finally {
            terminal.close();
          }
        },
      });
    } else {
      if (args.length) throw new Error('media:upload takes no arguments');
      // Lazy imports keep upload independent of Sharp/ExifTool/Ollama and process independent of SFTP.
      const { uploadMedia } = await import('./upload.ts');
      result = await uploadMedia({
        ...config,
        report: console.log,
        connect: async () => {
          if (config.ftps) {
            const settings = await loadFtpsConfig(config.ftps);
            const { connectFtps } = await import('./ftps.ts');
            return connectFtps(settings);
          }
          if (!config.sftp)
            throw new Error(
              'Configure FTPS or SFTP in the machine-local media.json; see docs/media.md',
            );
          const { connectSftp } = await import('./transport.ts');
          return connectSftp(config.sftp);
        },
      });
    }
    for (const [status, ids] of Object.entries(result))
      console.log(
        `${status}: ${ids.length}${ids.length ? ` (${ids.join(', ')})` : ''}`,
      );
    if (result.failed.length) process.exitCode = 1;
  } catch (e) {
    console.error(
      e instanceof z.ZodError
        ? `Invalid media configuration/state: ${e.issues.map((i) => i.path.join('.')).join(', ')}`
        : e instanceof Error
          ? e.message
          : 'Media command failed',
    );
    process.exitCode = 1;
  }
}
