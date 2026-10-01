import { createServer } from 'vite';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('exit', (code) => {
  console.log('Process exit event with code:', code);
});
process.on('SIGINT', () => {
  console.log('Received SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  process.exit(0);
});

async function start() {
  const server = await createServer({
    configFile: './vite.config.js',
    server: {
      port: 5173,
      host: true
    }
  });
  await server.listen();
  server.printUrls();

  // Keep the process alive indefinitely
  setInterval(() => {}, 10000);
}

start().catch((err) => {
  console.error('Failed in start():', err);
  process.exit(1);
});
