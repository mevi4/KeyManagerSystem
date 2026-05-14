const express = require('express');
const router = express.Router();
const { Key, BaseStation, IssueRecord, ReturnRecord } = require('../models');
const { Op } = require('sequelize');
const auditService = require('../services/auditService');
const ExcelExport = require('../utils/excelExport');

const authMiddleware = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Дашборд
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const allIssues = await IssueRecord.findAll({
            include: [
                { model: Key, include: [BaseStation] },
                { model: ReturnRecord }
            ],
            order: [['issueDate', 'DESC']]
        });
        
        const activeIssues = allIssues.filter(issue => !issue.ReturnRecord);
        const today = new Date();
        const overdueCount = activeIssues.filter(issue => new Date(issue.plannedReturnDate) < today).length;

        res.render('keys/dashboard', {
            user: req.session.user,
             activeIssues: activeIssues,
            overdueCount: overdueCount,
             activePage: 'dashboard'
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keys/dashboard', {
            user: req.session.user,
            activeIssues: [],
            overdueCount: 0
        });
    }
});

router.get('/dashboard/export', authMiddleware, async (req, res) => {
    try {
        const allIssues = await IssueRecord.findAll({
            include: [
                { model: Key, include: [BaseStation] },
                { model: ReturnRecord }
            ],
            order: [['issueDate', 'DESC']]
        });
        
        const activeIssues = allIssues.filter(issue => !issue.ReturnRecord);
        
        // Форматируем данные для Excel
        const exportData = activeIssues.map(issue => ({
            'Номер ключа': issue.Key?.number || 'Н/Д',
            'Базовая станция': issue.Key?.BaseStation?.number || 'Н/Д',
            'Кто выдал': issue.issuedBy || 'Н/Д',
            'Кто получил': issue.receivedBy || 'Н/Д',
            'Телефон': issue.phone || 'Н/Д',
            'Организация': issue.organization || 'Н/Д',
            'Дата выдачи': issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : 'Н/Д',
            'Плановая дата возврата': issue.plannedReturnDate ? new Date(issue.plannedReturnDate).toLocaleDateString() : 'Н/Д',
            'Статус': new Date(issue.plannedReturnDate) < new Date() ? 'Просрочен' : 'Активен'
        }));
        
        ExcelExport.exportToExcel(exportData, 'Выданные ключи', 'vydannye_klyuchi', res);
    } catch (error) {
        console.error('Ошибка экспорта:', error.message);
        res.status(500).send('Ошибка при выгрузке Excel');
    }
});

// Страница выдачи ключа
router.get('/issue', authMiddleware, async (req, res) => {
    try {
        const availableKeys = await Key.findAll({
            where: { status: 'доступен' },
            include: [BaseStation],
            order: [['number', 'ASC']]
        });
        
        res.render('keys/issue', { 
            user: req.session.user,
            availableKeys: availableKeys || [],
                activePage: 'issue'
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keys/issue', { 
            user: req.session.user,
            availableKeys: []
        });
    }
});

// Выдача ключа (с ручным вводом issuedBy)
router.post('/issue', authMiddleware, async (req, res) => {
    const { keyId, issuedBy, receivedBy, phone, organization, plannedReturnDate } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const key = await Key.findByPk(keyId);
        if (!key || key.status !== 'доступен') {
            return res.redirect('/keys/issue?error=Ключ недоступен');
        }

        const issueRecord = await IssueRecord.create({
            keyId,
            issuedBy: issuedBy,           // ручной ввод
            receivedBy: receivedBy,       // ручной ввод
            phone: phone || null,
            organization: organization || null,
            plannedReturnDate,
            issueDate: new Date()
        });

        key.status = 'выдан';
        await key.save();

        await auditService.log(req.session.user.username, ip, 'Выдача ключа', key.number, `Ключ ${key.number} выдан сотруднику ${receivedBy} (выдал: ${issuedBy})`);

        res.redirect('/keys/dashboard');
    } catch (error) {
        console.error('Ошибка при выдаче ключа:', error.message);
        res.redirect('/keys/issue?error=' + encodeURIComponent(error.message));
    }
});

// Редактирование получателя (передача ключа другому сотруднику)
router.post('/edit-recipient', authMiddleware, async (req, res) => {
    const { issueRecordId, receivedBy, phone, organization } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const issueRecord = await IssueRecord.findByPk(issueRecordId);
        if (!issueRecord) {
            return res.redirect('/keys/dashboard?error=Запись не найдена');
        }

        const oldReceivedBy = issueRecord.receivedBy;
        issueRecord.receivedBy = receivedBy;
        if (phone) issueRecord.phone = phone;
        if (organization) issueRecord.organization = organization;
        await issueRecord.save();

        await auditService.log(req.session.user.username, ip, 'Смена получателя', issueRecord.keyId, `Получатель изменён с ${oldReceivedBy} на ${receivedBy}`);

        res.redirect('/keys/dashboard');
    } catch (error) {
        console.error('Ошибка при смене получателя:', error.message);
        res.redirect('/keys/dashboard?error=' + encodeURIComponent(error.message));
    }
});

// Страница возврата ключа
router.get('/return', authMiddleware, async (req, res) => {
    try {
        const allIssues = await IssueRecord.findAll({
            include: [
                { model: Key, include: [BaseStation] },
                { model: ReturnRecord }
            ],
            order: [['issueDate', 'DESC']]
        });
        
        const activeIssues = allIssues.filter(issue => !issue.ReturnRecord);
        
        res.render('keys/return', { 
            user: req.session.user,
            activeIssues: activeIssues || [],
            activePage: 'return'
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keys/return', { 
            user: req.session.user,
            activeIssues: []
        });
    }
});

// Возврат ключа
router.post('/return', authMiddleware, async (req, res) => {
    const { issueRecordId, acceptedBy, returnedBy } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const issueRecord = await IssueRecord.findByPk(issueRecordId, {
            include: [Key]
        });

        if (!issueRecord) {
            return res.redirect('/keys/return?error=Запись не найдена');
        }

        const existingReturn = await ReturnRecord.findOne({
            where: { issueRecordId: issueRecord.id }
        });

        if (existingReturn) {
            return res.redirect('/keys/return?error=Ключ уже был возвращён');
        }

        await ReturnRecord.create({
            issueRecordId: issueRecord.id,
            returnedBy: returnedBy,     // ручной ввод
            acceptedBy: acceptedBy,     // ручной ввод
            returnDate: new Date()
        });

        if (issueRecord.Key) {
            issueRecord.Key.status = 'доступен';
            await issueRecord.Key.save();
        }

        await auditService.log(req.session.user.username, ip, 'Возврат ключа', issueRecord.Key?.number, `Ключ ${issueRecord.Key?.number} возвращён сотрудником ${returnedBy} (принял: ${acceptedBy})`);

        res.redirect('/keys/dashboard');
    } catch (error) {
        console.error('Ошибка при возврате ключа:', error.message);
        res.redirect('/keys/return?error=' + encodeURIComponent(error.message));
    }
});

// Просроченные ключи
router.get('/overdue', authMiddleware, async (req, res) => {
    try {
        const today = new Date();
        const allIssues = await IssueRecord.findAll({
            include: [
                { model: Key, include: [BaseStation] },
                { model: ReturnRecord }
            ],
            order: [['plannedReturnDate', 'ASC']]
        });
        
        const overdueIssues = allIssues.filter(issue => {
            return !issue.ReturnRecord && new Date(issue.plannedReturnDate) < today;
        });
        
        res.render('keys/overdue', { 
            user: req.session.user,
            overdueIssues: overdueIssues || [],
            activePage: 'overdue'
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keys/overdue', { 
            user: req.session.user,
            overdueIssues: []
        });
    }
});

// История по сотруднику
router.get('/employee-history', authMiddleware, async (req, res) => {
    try {
        const { searchName } = req.query;
        let history = [];
        let searched = false;

        if (searchName && searchName.trim()) {
            searched = true;
            history = await IssueRecord.findAll({
                include: [
                    { model: Key, include: [BaseStation] },
                    { model: ReturnRecord }
                ],
                where: {
                    [Op.or]: [
                        { receivedBy: { [Op.iLike]: `%${searchName}%` } },
                        { issuedBy: { [Op.iLike]: `%${searchName}%` } }
                    ]
                },
                order: [['issueDate', 'DESC']]
            });
        }

        res.render('keys/employee-history', {
            user: req.session.user,
            history: history,
            searched: searched,
            searchName: searchName || '',
            activePage: 'employee-history'
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keys/employee-history', {
            user: req.session.user,
            history: [],
            searched: false,
            searchName: ''
        });
    }
});

router.get('/overdue/export', authMiddleware, async (req, res) => {
    try {
        const today = new Date();
        const allIssues = await IssueRecord.findAll({
            include: [
                { model: Key, include: [BaseStation] },
                { model: ReturnRecord }
            ]
        });
        
        const overdueIssues = allIssues.filter(issue => {
            return !issue.ReturnRecord && new Date(issue.plannedReturnDate) < today;
        });
        
        const exportData = overdueIssues.map(issue => ({
            'Номер ключа': issue.Key?.number || 'Н/Д',
            'Базовая станция': issue.Key?.BaseStation?.number || 'Н/Д',
            'Кто выдал': issue.issuedBy || 'Н/Д',
            'Кто получил': issue.receivedBy || 'Н/Д',
            'Телефон': issue.phone || 'Н/Д',
            'Организация': issue.organization || 'Н/Д',
            'Дата выдачи': issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : 'Н/Д',
            'Плановая дата': issue.plannedReturnDate ? new Date(issue.plannedReturnDate).toLocaleDateString() : 'Н/Д',
            'Просрочено дней': Math.floor((new Date() - new Date(issue.plannedReturnDate)) / (1000 * 60 * 60 * 24))
        }));
        
        ExcelExport.exportToExcel(exportData, 'Просроченные ключи', 'overdue_keys', res);
    } catch (error) {
        console.error('Ошибка экспорта:', error.message);
        res.status(500).send('Ошибка при выгрузке Excel');
    }
});

// Экспорт истории сотрудника в Excel
router.get('/employee-history/export', authMiddleware, async (req, res) => {
    try {
        const { searchName } = req.query;
        let history = [];

        if (searchName && searchName.trim()) {
            history = await IssueRecord.findAll({
                include: [
                    { model: Key, include: [BaseStation] },
                    { model: ReturnRecord }
                ],
                where: {
                    [Op.or]: [
                        { receivedBy: { [Op.iLike]: `%${searchName}%` } },
                        { issuedBy: { [Op.iLike]: `%${searchName}%` } }
                    ]
                },
                order: [['issueDate', 'DESC']]
            });
        }
        
        const exportData = history.map(record => ({
            'Номер ключа': record.Key?.number || 'Н/Д',
            'Базовая станция': record.Key?.BaseStation?.number || 'Н/Д',
            'Кто выдал': record.issuedBy || 'Н/Д',
            'Кто получил': record.receivedBy || 'Н/Д',
            'Телефон': record.phone || 'Н/Д',
            'Организация': record.organization || 'Н/Д',
            'Дата выдачи': record.issueDate ? new Date(record.issueDate).toLocaleDateString() : 'Н/Д',
            'Плановая дата возврата': record.plannedReturnDate ? new Date(record.plannedReturnDate).toLocaleDateString() : 'Н/Д',
            'Кто вернул': record.ReturnRecord?.returnedBy || 'Н/Д',
            'Дата возврата': record.ReturnRecord?.returnDate ? new Date(record.ReturnRecord.returnDate).toLocaleDateString() : 'Н/Д',
            'Статус': record.ReturnRecord ? 'Возвращён' : (new Date(record.plannedReturnDate) < new Date() ? 'Просрочен' : 'Активен')
        }));
        
        ExcelExport.exportToExcel(exportData, 'История сотрудника', `history_${searchName}`, res);
    } catch (error) {
        console.error('Ошибка экспорта истории:', error.message);
        res.status(500).send('Ошибка при выгрузке Excel');
    }
});

module.exports = router;