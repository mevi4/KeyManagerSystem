const express = require('express');
const router = express.Router();
const { UserRole } = require('../models');
const auditService = require('../services/auditService');

const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Список пользователей
router.get('/', authMiddleware, async (req, res) => {
    const users = await UserRole.findAll();
        res.render('users/index', { 
        user: req.session.user, 
        users: users || [],
        activePage: 'users'
    });
});

// Назначение роли
router.post('/assign', authMiddleware, async (req, res) => {
    const { username, role } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    const existing = await UserRole.findOne({ where: { username } });
    if (existing) {
        existing.role = role;
        await existing.save();
    } else {
        await UserRole.create({ username, role });
    }
    
    await auditService.log(req.session.user.username, ip, 'Назначение роли', username, `Пользователю ${username} назначена роль ${role}`);
    res.redirect('/users');
});

// Удаление пользователя
router.post('/delete/:id', authMiddleware, async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userRole = await UserRole.findByPk(req.params.id);
    
    if (userRole) {
        await UserRole.destroy({ where: { id: req.params.id } });
        await auditService.log(req.session.user.username, ip, 'Удаление роли', userRole.username, `У пользователя ${userRole.username} удалена роль`);
    }
    
    res.redirect('/users');
});

module.exports = router;