const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.globalSetting.update({
            where: { key: 'closed_days' },
            data: { value: JSON.stringify([]) }
        });

        console.log('✅ Updated closed_days setting to empty array (all days available)');
        console.log('Current value:', result.value);
    } catch (error) {
        console.error('Error updating setting:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
