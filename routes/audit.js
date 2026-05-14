const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { Op } = require('sequelize');
const ExcelExport = require('../utils/excelExport');

const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { from, to, username, operationType } = req.query;
        let where = {};

        if (from && from.trim()) {
            const fromDate = new Date(from);
            if (!isNaN(fromDate.getTime())) {
                where.timestamp = { [Op.gte]: fromDate };
            }
        }
        if (to && to.trim()) {
            const toDate = new Date(to);
            if (!isNaN(toDate.getTime())) {
                toDate.setHours(23, 59, 59, 999);
                if (where.timestamp) {
                    where.timestamp[Op.lte] = toDate;
                } else {
                    where.timestamp = { [Op.lte]: toDate };
                }
            }
        }
        if (username && username.trim()) {
            where.username = { [Op.iLike]: `%${username}%` };
        }
        if (operationType && operationType.trim()) {
            where.operationtype = operationType;
        }

        const logs = await AuditLog.findAll({
            where: where,
            order: [['timestamp', 'DESC']],
            limit: 500
        });

        // Получаем уникальные типы операций для выпадающего списка
        const allLogs = await AuditLog.findAll({
            attributes: ['operationtype'],
            group: ['operationtype']
        });
        const operationTypes = allLogs.map(l => l.operationtype).filter(t => t);

        res.render('audit/index', {
            user: req.session.user,
            logs: logs || [],
            operationTypes: operationTypes || [],
            filters: { from, to, username, operationType }
        });
    } catch (error) {
        console.error('Ошибка аудита:', error);
        res.render('audit/index', {
            user: req.session.user,
            logs: [],
            operationTypes: [],
            filters: {}
        });
    }
});

router.get('/export', authMiddleware, async (req, res) => {
    try {
        const { from, to, username, operationType } = req.query;
        let where = {};

        if (from && from.trim()) {
            const fromDate = new Date(from);
            if (!isNaN(fromDate.getTime())) {
                where.timestamp = { [Op.gte]: fromDate };
            }
        }
        if (to && to.trim()) {
            const toDate = new Date(to);
            if (!isNaN(toDate.getTime())) {
                toDate.setHours(23, 59, 59, 999);
                if (where.timestamp) {
                    where.timestamp[Op.lte] = toDate;
                } else {
                    where.timestamp = { [Op.lte]: toDate };
                }
            }
        }
        if (username && username.trim()) {
            where.username = { [Op.iLike]: `%${username}%` };
        }
        if (operationType && operationType.trim()) {
            where.operationtype = operationType;
        }

        const logs = await AuditLog.findAll({
            where: where,
            order: [['timestamp', 'DESC']],
            limit: 5000
        });

        const exportData = logs.map(log => ({
            'Дата и время': log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Н/Д',
            'Пользователь': log.username || 'Н/Д',
            'IP-адрес': log.ipaddress || 'Н/Д',
            'Тип операции': log.operationtype || 'Н/Д',
            'ID объекта': log.objectid || 'Н/Д',
            'Детали': log.details || 'Н/Д'
        }));

        ExcelExport.exportToExcel(exportData, 'Журнал аудита', 'audit_log', res);
    } catch (error) {
        console.error('Ошибка экспорта аудита:', error);
        res.status(500).send('Ошибка при выгрузке Excel: ' + error.message);
    }
});

module.exports = router;