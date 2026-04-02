const express = require('express');
const router = express.Router();
const { UserRole } = require('../models');

router.get('/login', (req, res) => {
    res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username) {
        return res.render('auth/login', { error: 'Введите логин' });
    }

    try {
        let userRole = await UserRole.findOne({ where: { username } });
        
        if (!userRole) {
            userRole = await UserRole.create({ username, role: 'Инженер' });
        }

        req.session.user = {
            username: username,
            role: userRole.role
        };

        console.log(`Пользователь ${username} вошёл с ролью ${userRole.role}`);
        res.redirect('/keys/dashboard');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('auth/login', { error: 'Ошибка базы данных' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;