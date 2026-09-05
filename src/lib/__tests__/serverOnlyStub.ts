// Stand-in for the "server-only" package in tests: vitest doesn't run under
// Next.js's RSC bundler conditions, so the real package's import-time throw
// would fire in every test. Aliased in via vitest config resolve.alias.
export {};
