const express = require('express');
const router = express.Router();
const { BaseStation, Key } = require('../models');
const auditService = require('../services/auditService');
const ExcelExport = require('../utils/excelExport');

const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Список БС
router.get('/', authMiddleware, async (req, res) => {
    const stations = await BaseStation.findAll({ include: [Key], order: [['number', 'ASC']] });
    res.render('stations/index', { 
         user: req.session.user,
        stations: stations || [],
        activePage: 'stations'
    });
});

// Страница создания
router.get('/create', authMiddleware, async (req, res) => {
    res.render('stations/create', { user: req.session.user });
});

// Создание БС + ключа + аудит
router.post('/', authMiddleware, async (req, res) => {
    const { number, address } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
        const station = await BaseStation.create({ number, address });
        const keyNumber = `KEY-${station.id}`;
        await Key.create({ number: keyNumber, baseStationId: station.id, status: 'доступен' });
        
        await auditService.log(req.session.user.username, ip, 'Создание БС', station.id.toString(), `Создана БС ${number} по адресу ${address}`);
        await auditService.log(req.session.user.username, ip, 'Создание ключа', keyNumber, `Создан ключ ${keyNumber} для БС ${number}`);
        
        res.redirect('/stations');
    } catch (error) {
        console.error(error);
        res.redirect('/stations/create?error=' + encodeURIComponent(error.message));
    }
});

// Редактирование БС
router.put('/:id', authMiddleware, async (req, res) => {
    const { number, address } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const oldStation = await BaseStation.findByPk(req.params.id);
    
    try {
        await BaseStation.update({ number, address }, { where: { id: req.params.id } });
        await auditService.log(req.session.user.username, ip, 'Редактирование БС', req.params.id, `БС ${oldStation.number} изменена на ${number}`);
        res.redirect('/stations');
    } catch (error) {
        res.redirect('/stations/edit/' + req.params.id + '?error=' + encodeURIComponent(error.message));
    }
});

// Удаление БС
router.delete('/:id', authMiddleware, async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    const station = await BaseStation.findByPk(req.params.id);
    
    try {
        const keyCount = await Key.count({ where: { baseStationId: req.params.id } });
        if (keyCount > 0) {
            return res.redirect('/stations?error=Нельзя удалить станцию с привязанными ключами');
        }
        await BaseStation.destroy({ where: { id: req.params.id } });
        await auditService.log(req.session.user.username, ip, 'Удаление БС', req.params.id, `Удалена БС ${station.number}`);
        res.redirect('/stations');
    } catch (error) {
        res.redirect('/stations?error=' + encodeURIComponent(error.message));
    }
});

// Экспорт в Excel
router.get('/export', authMiddleware, async (req, res) => {
    try {
        const stations = await BaseStation.findAll({
            include: [Key],
            order: [['number', 'ASC']]
        });
        
        const exportData = stations.map(station => ({
            'ID': station.id,
            'Номер БС': station.number,
            'Адрес': station.address,
            'Количество ключей': station.Keys ? station.Keys.length : 0,
            'Дата создания': station.createdAt ? new Date(station.createdAt).toLocaleDateString() : 'Н/Д'
        }));
        
        ExcelExport.exportToExcel(exportData, 'Базовые станции', 'base_stations', res);
    } catch (error) {
        console.error('Ошибка экспорта:', error.message);
        res.status(500).send('Ошибка при выгрузке Excel');
    }
});

module.exports = router;