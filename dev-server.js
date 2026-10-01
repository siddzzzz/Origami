import { createServer } from 'vite';

async function start() {
  const server = await createServer({
    configFile: './vite.config.js',
    server: {
      port: 5173
    }
  });
  await server.listen();
  server.printUrls();

  // Keep event loop active and immune to stdin closure
  setInterval(() => {}, 1000 * 3600);

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('Failed to start Vite server:', err);
  process.exit(1);
});
