import { PrismaClient } from "../generated/prisma/client/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL! + "?allowPublicKeyRetrieval=true");

const prisma = new PrismaClient({ adapter });

export default prisma;
