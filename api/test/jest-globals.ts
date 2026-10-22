/** Jest 30 + native ESM does not always inject globals; e2e suites expect them on globalThis. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

Object.assign(globalThis, { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest });
