import { db } from '@/db';
import { settings } from '@/db/schema';

async function main() {
    const defaultSettings = [
        {
            theme: 'system',
            defaultView: 'dashboard',
            notifications: true,
        }
    ];

    // Add required fields: createdAt and updatedAt
    const now = Date.now();
    const settingsWithTimestamps = defaultSettings.map(setting => ({
        ...setting,
        createdAt: now,
        updatedAt: now,
    }));

    await db.insert(settings).values(settingsWithTimestamps);

    console.log('✅ Settings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});