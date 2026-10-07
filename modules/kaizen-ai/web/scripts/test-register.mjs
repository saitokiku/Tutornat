// Entry point for `npm test` — registers the "@/" alias loader before the
// test runner imports any lib module. Used as: node --import ./scripts/test-register.mjs --test test/
import { register } from 'node:module';

register(new URL('./test-loader.mjs', import.meta.url));
