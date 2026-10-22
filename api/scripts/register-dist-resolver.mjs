import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./dist-import-resolver.mjs', import.meta.url);
