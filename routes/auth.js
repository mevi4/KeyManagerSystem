const express = require('express');
const router = express.Router();
const { UserRole } = require('../models');
const auditService = require('../services/auditService');

router.get('/login', (req, res) => {
    res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (!username) {
        return res.render('auth/login', { error: 'Введите логин' });
    }

    try {
        let user = await UserRole.findOne({ where: { username } });
        
        if (!user) {
            user = await UserRole.create({ 
                username, 
                fullName: username,
            });
        }

        req.session.user = {
            username: user.username,
            fullName: user.fullName || user.username,  // ← ключевая строка
        };

        await auditService.log(username, ip, 'Вход в систему', username, `Пользователь ${username} вошёл в систему`);
        res.redirect('/keys/dashboard');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('auth/login', { error: 'Ошибка входа' });
    }
});

router.post('/logout', async (req, res) => {
    const username = req.session.user?.username || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress;
    await auditService.log(username, ip, 'Выход из системы', username, `Пользователь ${username} вышел из системы`);
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;