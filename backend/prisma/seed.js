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

        const email = process.env.INITIAL_ADMIN_EMAIL;
        const password = process.env.INITIAL_ADMIN_PASSWORD;
        if (!email || !password) {
            console.log('Initial admin credentials are not configured — seed skipped.');
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(`Seeding user: ${email}...`);
        await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                email,
                password: hashedPassword,
                name: 'Admin User',
                role: 'ADMIN',
            },
        });
        console.log('Initial admin account created.');
    } catch (e) {
        console.error('Error seeding user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
