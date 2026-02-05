import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Fetch all users
    const users = await prisma.user.findMany();
    console.log("Users in DB:", users);

    // Create a test user (optional)
    const newUser = await prisma.user.create({
      data: {
        firstName: "Test",
        lastName: "User",
        username: "testuser123",
        email: "testuser@example.com",
        password: "password123",
      },
    });
    console.log("Created User:", newUser);

    // Clean up: delete the test user
    await prisma.user.delete({ where: { id: newUser.id } });

    console.log("Prisma test completed successfully!");
  } catch (error) {
    console.error("Error testing Prisma:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
