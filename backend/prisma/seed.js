const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
    const prisma = new PrismaClient();

    const email = 'admin@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Seeding user: ${email}...`);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: hashedPassword,
                name: 'Admin User',
                role: 'ADMIN',
            },
        });
        console.log('User created:', user);
    } catch (e) {
        console.error('Error seeding user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
