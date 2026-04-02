const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { Op } = require('sequelize');

const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

const auditorMiddleware = (req, res, next) => {
    if (!req.session.user || (req.session.user.role !== 'Аудитор' && req.session.user.role !== 'Администратор')) {
        return res.status(403).send('Доступ запрещён');
    }
    next();
};

// Страница журнала аудита
router.get('/', authMiddleware, auditorMiddleware, async (req, res) => {
    try {
        const { from, to, username, operationType } = req.query;
        let where = {};

        if (from) where.timestamp = { [Op.gte]: new Date(from) };
        if (to) where.timestamp = { ...where.timestamp, [Op.lte]: new Date(to) };
        if (username) where.username = { [Op.iLike]: `%${username}%` };
        if (operationType) where.operationType = operationType;

        const logs = await AuditLog.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: 200
        });

        const operationTypes = await AuditLog.findAll({
            attributes: ['operationType'],
            group: ['operationType']
        });

        res.render('audit/index', {
            user: req.session.user,
            logs,
            operationTypes: operationTypes.map(t => t.operationType),
            filters: { from, to, username, operationType }
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('audit/index', {
            user: req.session.user,
            logs: [],
            operationTypes: [],
            filters: {}
        });
    }
});

module.exports = router;