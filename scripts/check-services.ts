// Explicit live tests: authenticate Twitch and send one synthetic Jev diagnostic.
process.env.RUN_SERVICE_TESTS='1';
await import('../tests/integration/services.test.ts');
export {};
