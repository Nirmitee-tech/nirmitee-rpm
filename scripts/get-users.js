const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
      take: 5,
    });

    console.log('\n=== Users in Database ===\n');
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Active: ${user.isActive}`);
      console.log('---');
    });

    if (users.length === 0) {
      console.log('No users found. You may need to run: pnpm prisma db seed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getUsers();
