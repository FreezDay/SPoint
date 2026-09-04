const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
    const prisma = new PrismaClient();

    try {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount > 0) {
            console.log('Admin account already exists — seed skipped (no default admin created).');
            return;
        }

        const email = 'admin@example.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(`Seeding user: ${email}...`);
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
