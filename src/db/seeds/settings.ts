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

    await db.insert(settings).values(defaultSettings);
    
    console.log('✅ Settings seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});