import 'dotenv/config';
import { app } from './app.js';
import { prisma } from '#src/core/prisma.js';
import { logger } from '#src/core/logger.js';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const LAN_IP = process.env.LAN_IP || 'localhost';
let server = null;

const reset = '\x1b[0m';
const yellow = '\x1b[33m';
const blue = '\x1b[36m';
const bold = '\x1b[1m';

const shutdown = async (signal) => {
  logger.warn(`${signal} received, shutting down`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await prisma.$disconnect();
  process.exit(0);
};

const start = async () => {
  try {
    await prisma.$connect();
    logger.success('Database connected');

    server = app.listen(PORT, HOST, () => {
      logger.success(`Server running on port ${blue}http://localhost:${bold}${PORT}${reset}`);
      logger.success(`LAN access: ${blue}http://${LAN_IP}:${bold}${PORT}${reset}`);
    });
  } catch (err) {
    logger.error('Startup failed: database unavailable', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void start();
