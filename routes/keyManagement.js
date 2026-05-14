const express = require('express');
const router = express.Router();
const { Key, BaseStation } = require('../models');
const auditService = require('../services/auditService');
const ExcelExport = require('../utils/excelExport');

const authMiddleware = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Список ключей
router.get('/', authMiddleware, async (req, res) => {
    const keys = await Key.findAll({ include: [BaseStation], order: [['number', 'ASC']] });
    res.render('keyManagement/index', { 
        user: req.session.user,
        keys: keys || [],
        activePage: 'keyManagement'
    });

});

// Форма создания ключа
router.get('/create', authMiddleware, async (req, res) => {
    const stations = await BaseStation.findAll({ order: [['number', 'ASC']] });
    res.render('keyManagement/create', { user: req.session.user, stations: stations || [] });
});

// Создание ключа
router.post('/create', authMiddleware, async (req, res) => {
    const { number, baseStationId } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
        const existingKey = await Key.findOne({ where: { number } });
        if (existingKey) {
            return res.redirect('/keyManagement/create?error=Ключ с таким номером уже существует');
        }
        
        const key = await Key.create({ number, baseStationId, status: 'доступен' });
        await auditService.log(req.session.user.username, ip, 'Создание ключа', number, `Создан ключ ${number} для БС ID ${baseStationId}`);
        
        res.redirect('/keyManagement');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/keyManagement/create?error=' + encodeURIComponent(error.message));
    }
});

// Удаление ключа
router.post('/delete/:id', authMiddleware, async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = await Key.findByPk(req.params.id);
    
    try {
        if (!key) return res.redirect('/keyManagement?error=Ключ не найден');
        if (key.status !== 'доступен') {
            return res.redirect('/keyManagement?error=Нельзя удалить выданный или просроченный ключ');
        }
        
        await Key.destroy({ where: { id: req.params.id } });
        await auditService.log(req.session.user.username, ip, 'Удаление ключа', key.number, `Удалён ключ ${key.number}`);
        res.redirect('/keyManagement');
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.redirect('/keyManagement?error=' + encodeURIComponent(error.message));
    }
});

// Экспорт в Excel
router.get('/export', authMiddleware, async (req, res) => {
    try {
        const keys = await Key.findAll({
            include: [BaseStation],
            order: [['number', 'ASC']]
        });
        
        const exportData = keys.map(key => ({
            'ID': key.id,
            'Номер ключа': key.number,
            'Базовая станция': key.BaseStation ? key.BaseStation.number : 'Н/Д',
            'Адрес БС': key.BaseStation ? key.BaseStation.address : 'Н/Д',
            'Статус': key.status,
            'Дата создания': key.createdAt ? new Date(key.createdAt).toLocaleDateString() : 'Н/Д'
        }));
        
        ExcelExport.exportToExcel(exportData, 'Ключи', 'keys', res);
    } catch (error) {
        console.error('Ошибка экспорта:', error.message);
        res.status(500).send('Ошибка при выгрузке Excel');
    }
});

module.exports = router;