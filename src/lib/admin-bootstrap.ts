import { randomBytes } from 'node:crypto';

interface BootstrapResult { created: boolean; username: string }

/** Run only from the operator's local CLI, never from a public route. */
export async function runAdminBootstrap(
  initialize: () => Promise<BootstrapResult>,
  env: Record<string, string | undefined> = process.env,
  output: (message: string) => void = console.log,
): Promise<BootstrapResult> {
  const generated = !env.ADMIN_PASSWORD;
  if (generated) env.ADMIN_PASSWORD = randomBytes(24).toString('base64url');
  try {
    const result = await initialize();
    if (!result.created) {
      output('Administrator already exists. No account or password was changed.');
      return result;
    }
    output(`Administrator created: ${result.username}`);
    if (generated) {
      output(`Initial password (shown once): ${env.ADMIN_PASSWORD}`);
      output('Save this password privately. Do not redirect this output into shared logs.');
    } else {
      output('Use the password from your private ADMIN_PASSWORD configuration.');
    }
    return result;
  } finally {
    if (generated) delete env.ADMIN_PASSWORD;
  }
}
