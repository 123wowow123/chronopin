// Runs once before the server takes requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { checkConfig } = await import('./instrumentation.node');
    await checkConfig();
  }
}
