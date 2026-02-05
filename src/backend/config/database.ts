import { PrismaClient } from "@prisma/client";

// Create a single shared Prisma client instance
// This follows Prisma's best practice of using a singleton pattern
const prisma = new PrismaClient();

export default prisma;
