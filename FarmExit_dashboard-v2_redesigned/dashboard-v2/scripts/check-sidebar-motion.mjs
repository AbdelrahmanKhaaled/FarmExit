import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const motionSrc = readFileSync(join(root, 'src/features/admin/shell/sidebar-motion.ts'), 'utf8');
const sidebarSrc = readFileSync(join(root, 'src/features/admin/AdminSidebar.tsx'), 'utf8');

if (!motionSrc.includes('max-md:rtl:translate-x-full')) {
  console.error('check-sidebar-motion: expected max-md-scoped RTL mobile transform');
  process.exit(1);
}
if (/rtl:translate-x-full/.test(sidebarSrc) && !/max-md:rtl:translate-x-full/.test(sidebarSrc)) {
  console.error('check-sidebar-motion: unscoped rtl:translate-x-full would hide sidebar on Arabic desktop');
  process.exit(1);
}
if (!sidebarSrc.includes('inset-inline-start-0')) {
  console.error('check-sidebar-motion: sidebar should anchor with inset-inline-start-0');
  process.exit(1);
}

console.log('check-sidebar-motion: OK');
