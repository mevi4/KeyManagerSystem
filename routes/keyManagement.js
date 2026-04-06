const express = require('express');
const router = express.Router();
const { Key, BaseStation } = require('../models');

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

// Список ключей
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const keys = await Key.findAll({
            include: [BaseStation],
            order: [['number', 'ASC']]
        });
        
        res.render('keyManagement/index', { 
            user: req.session.user,
            keys: keys || []
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keyManagement/index', { 
            user: req.session.user,
            keys: []
        });
    }
});

// Форма создания ключа
router.get('/create', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const stations = await BaseStation.findAll({ order: [['number', 'ASC']] });
        res.render('keyManagement/create', { 
            user: req.session.user,
            stations: stations || []
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keyManagement/create', { 
            user: req.session.user,
            stations: []
        });
    }
});

// Создание ключа
router.post('/create', authMiddleware, adminMiddleware, async (req, res) => {
    const { number, baseStationId } = req.body;
    
    try {
        // Проверка уникальности номера ключа
        const existingKey = await Key.findOne({ where: { number } });
        if (existingKey) {
            return res.redirect('/keyManagement/create?error=Ключ с таким номером уже существует');
        }
        
        await Key.create({
            number,
            baseStationId,
            status: 'доступен'
        });
        
        res.redirect('/keyManagement');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/keyManagement/create?error=' + encodeURIComponent(error.message));
    }
});

// Удаление ключа
router.post('/delete/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const key = await Key.findByPk(req.params.id);
        if (!key) {
            return res.redirect('/keyManagement?error=Ключ не найден');
        }
        
        // Проверка, не выдан ли ключ
        if (key.status !== 'доступен') {
            return res.redirect('/keyManagement?error=Нельзя удалить выданный или просроченный ключ');
        }
        
        await Key.destroy({ where: { id: req.params.id } });
        res.redirect('/keyManagement');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/keyManagement?error=' + encodeURIComponent(error.message));
    }
});

module.exports = router;