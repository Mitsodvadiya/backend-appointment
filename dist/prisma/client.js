import { PrismaClient } from '@prisma/client';
console.log('Initializing Prisma Client...');
export const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
