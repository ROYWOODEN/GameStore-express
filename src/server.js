import { app } from './app.js';
import { prisma } from '#src/core/prisma.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Запущен на порту ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Завершение работы...');
  server.close(() => {
    console.log('Сервер остановлен');
  });
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
