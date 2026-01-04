import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHARED_DIR = path.join(__dirname, '..', 'public', '_shared');

const MAX_AGE_MINUTES = process.env.SHARE_MAX_AGE_MINUTES ? Number(process.env.SHARE_MAX_AGE_MINUTES) : 60;

async function exists(fp) {
  try {
    await fs.access(fp);
    return true;
  } catch {
    return false;
  }
}

async function cleanupOnce() {
  try {
    if (!(await exists(SHARED_DIR))) {
      console.log('No shared dir found, nothing to do.');
      return 0;
    }
    const cutoff = Date.now() - MAX_AGE_MINUTES * 60 * 1000;
    const files = await fs.readdir(SHARED_DIR);
    let removed = 0;
    for (const f of files) {
      const fp = path.join(SHARED_DIR, f);
      try {
        const st = await fs.stat(fp);
        if (st.mtimeMs < cutoff) {
          await fs.unlink(fp);
          removed++;
          console.log(`Removed old shared file: ${fp}`);
        }
      } catch (e) {
        console.warn('cleanup file error', fp, e?.message || e);
      }
    }
    console.log(`Cleanup complete: removed ${removed} files older than ${MAX_AGE_MINUTES} minutes`);
    return removed;
  } catch (err) {
    console.error('cleanupOnce error', err);
    process.exit(1);
  }
}

cleanupOnce().then(() => process.exit(0));
