// Vitest runs under plain Node, not Next's bundler, so the real "server-only" package (which
// unconditionally throws to enforce its "never import from client code" contract) would break
// every test that imports server code. Aliased in vitest.config.mts instead of hand-stubbing
// node_modules before each test run.
export {};
