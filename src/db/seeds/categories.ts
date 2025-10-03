import { db } from '@/db';
import { categories } from '@/db/schema';

async function main() {
    const sampleCategories = [
        {
            name: 'Work',
            color: '#3B82F6',
            createdAt: new Date('2024-01-10').toISOString(),
        },
        {
            name: 'Personal',
            color: '#10B981',
            createdAt: new Date('2024-01-11').toISOString(),
        },
        {
            name: 'Urgent',
            color: '#EF4444',
            createdAt: new Date('2024-01-12').toISOString(),
        },
        {
            name: 'Learning',
            color: '#8B5CF6',
            createdAt: new Date('2024-01-13').toISOString(),
        },
        {
            name: 'Health',
            color: '#F59E0B',
            createdAt: new Date('2024-01-14').toISOString(),
        }
    ];

    await db.insert(categories).values(sampleCategories);
    
    console.log('✅ Categories seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});