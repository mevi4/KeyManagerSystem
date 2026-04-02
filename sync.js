require('dotenv').config();
const { sequelize, BaseStation, Key, IssueRecord, ReturnRecord, UserRole } = require('./models');

async function sync() {
    try {
        // Синхронизация всех моделей (force: true удалит старые таблицы и создаст новые)
        await sequelize.sync({ force: true });
        console.log('✅ Таблицы успешно созданы!');
        
        // Добавляем тестового администратора
        await UserRole.create({
            username: 'admin',
            role: 'Администратор'
        });
        console.log('✅ Добавлен пользователь admin с ролью Администратор');
        
        // Добавляем тестовую базовую станцию
        const station = await BaseStation.create({
            number: 'BS-001',
            address: 'г. Москва, ул. Тверская, д. 1'
        });
        console.log('✅ Добавлена базовая станция BS-001');
        
        // Добавляем тестовый ключ
        await Key.create({
            number: 'KEY-001',
            baseStationId: station.id,
            status: 'доступен'
        });
        console.log('✅ Добавлен ключ KEY-001');
        
        console.log('\n🎉 Готово! Запустите app.js');
        process.exit(0);
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    }
}

sync();