import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SettingsService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        // Initialize default settings if they don't exist
        const defaults = [
            { key: 'timezone', value: 'Europe/Lisbon' },
            {
                key: 'working_hours',
                value: JSON.stringify({ start: '09:00', end: '19:00', days: [1, 2, 3, 4, 5] })
            },
            {
                key: 'non_working_hours',
                value: JSON.stringify({ start: '13:00', end: '14:00', label: 'Lunch Break' })
            },
            { key: 'closed_days', value: JSON.stringify([]) }, // No closed days by default
            { key: 'business_address', value: 'Rua de Exemplo 123, Lisboa' },
            { key: 'business_google_maps', value: 'https://maps.google.com' },
            { key: 'service_address', value: 'Rua de Exemplo 123, Lisboa' },
            { key: 'business_name', value: 'Munitum' },
            { key: 'staff_commission_rates', value: JSON.stringify({}) }
        ];

        for (const setting of defaults) {
            await (this.prisma as any).globalSetting.upsert({
                where: { key: setting.key },
                update: {},
                create: setting,
            });
        }
    }

    async getAll() {
        const settings = await this.prisma.globalSetting.findMany();
        return settings.reduce((acc, curr) => {
            try {
                acc[curr.key] = JSON.parse(curr.value);
            } catch {
                acc[curr.key] = curr.value;
            }
            return acc;
        }, {});
    }

    async update(key: string, value: any) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        return this.prisma.globalSetting.upsert({
            where: { key },
            update: { value: stringValue },
            create: { key, value: stringValue },
        });
    }

    async getOne(key: string) {
        const setting = await this.prisma.globalSetting.findUnique({ where: { key } });
        if (!setting) return null;
        try {
            return JSON.parse(setting.value);
        } catch {
            return setting.value;
        }
    }
}
