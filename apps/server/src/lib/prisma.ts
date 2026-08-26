import { PrismaClient } from '@prisma/client';
import '../env';

// Single shared Prisma client for the process.
export const prisma = new PrismaClient();
