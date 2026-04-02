const express = require('express');
const router = express.Router();
const { UserRole } = require('../models');

const adminMiddleware = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'Администратор') {
        return res.status(403).send('Доступ запрещён');
    }
    next();
};

// Список пользователей
router.get('/', adminMiddleware, async (req, res) => {
    const users = await UserRole.findAll();
    res.render('users/index', { user: req.session.user, users });
});

// Назначение роли
router.post('/assign', adminMiddleware, async (req, res) => {
    const { username, role } = req.body;
    
    const existing = await UserRole.findOne({ where: { username } });
    if (existing) {
        existing.role = role;
        await existing.save();
    } else {
        await UserRole.create({ username, role });
    }
    
    res.redirect('/users');
});

// Удаление пользователя
router.post('/delete/:id', adminMiddleware, async (req, res) => {
    await UserRole.destroy({ where: { id: req.params.id } });
    res.redirect('/users');
});

module.exports = router;