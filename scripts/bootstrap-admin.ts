import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { runAdminBootstrap } from '../src/lib/admin-bootstrap';
import { ensureDefaultAdmin } from '../src/lib/db-store';
runAdminBootstrap(ensureDefaultAdmin).catch(() => {
  console.error('Administrator bootstrap failed. Check private configuration and schema.');
  process.exitCode = 1;
});
