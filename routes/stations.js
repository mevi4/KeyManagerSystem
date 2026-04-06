const express = require('express');
const router = express.Router();
const { BaseStation, Key } = require('../models');

const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

const adminMiddleware = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'Администратор') {
        return res.status(403).send('Доступ запрещён. Требуется роль Администратор');
    }
    next();
};

// Список базовых станций
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const stations = await BaseStation.findAll({
            include: [Key],
            order: [['number', 'ASC']]
        });
        
        res.render('stations/index', { 
            user: req.session.user,
            stations: stations || []
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('stations/index', { 
            user: req.session.user,
            stations: []
        });
    }
});

// Страница создания
router.get('/create', authMiddleware, adminMiddleware, (req, res) => {
    res.render('stations/create', { user: req.session.user });
});

// Создание БС + автоматическое создание ключа
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    const { number, address } = req.body;
    
    try {
        // 1. Создаём базовую станцию
        const station = await BaseStation.create({ number, address });
        
        // 2. Автоматически создаём ключ для этой БС
        const keyNumber = `KEY-${station.id}`;
        await Key.create({
            number: keyNumber,
            baseStationId: station.id,
            status: 'доступен'
        });
        
        console.log(`Создана БС ${number} и ключ ${keyNumber}`);
        res.redirect('/stations');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/stations/create?error=' + encodeURIComponent(error.message));
    }
});

// Страница редактирования
router.get('/edit/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const station = await BaseStation.findByPk(req.params.id);
        if (!station) {
            return res.redirect('/stations');
        }
        res.render('stations/edit', { 
            user: req.session.user,
            station: station
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/stations');
    }
});

// Редактирование
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { number, address } = req.body;
    
    try {
        await BaseStation.update({ number, address }, { where: { id: req.params.id } });
        res.redirect('/stations');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/stations/edit/' + req.params.id + '?error=' + encodeURIComponent(error.message));
    }
});

// Удаление
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const keyCount = await Key.count({ where: { baseStationId: req.params.id } });
        if (keyCount > 0) {
            return res.redirect('/stations?error=Нельзя удалить станцию с привязанными ключами');
        }
        await BaseStation.destroy({ where: { id: req.params.id } });
        res.redirect('/stations');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/stations?error=' + encodeURIComponent(error.message));
    }
});

module.exports = router;