const express = require('express');
const router = express.Router();
const { Key, BaseStation, IssueRecord, ReturnRecord } = require('../models');
const { Op } = require('sequelize');

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
            overdueCount: overdueCount
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

// Страница выдачи ключа
router.get('/issue', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const availableKeys = await Key.findAll({
            where: { status: 'доступен' },
            include: [BaseStation],
            order: [['number', 'ASC']]
        });
        
        res.render('keys/issue', { 
            user: req.session.user,
            availableKeys: availableKeys || []
        });
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.render('keys/issue', { 
            user: req.session.user,
            availableKeys: []
        });
    }
});

// Выдача ключа
router.post('/issue', authMiddleware, adminMiddleware, async (req, res) => {
    const { keyId, receivedBy, plannedReturnDate } = req.body;

    try {
        const key = await Key.findByPk(keyId);
        if (!key || key.status !== 'доступен') {
            return res.redirect('/keys/issue?error=Ключ недоступен');
        }

        await IssueRecord.create({
            keyId,
            issuedBy: req.session.user.username,
            receivedBy,
            plannedReturnDate,
            issueDate: new Date()
        });

        key.status = 'выдан';
        await key.save();

        res.redirect('/keys/dashboard');
    } catch (error) {
        console.error('Ошибка при выдаче ключа:', error.message);
        res.redirect('/keys/issue?error=' + encodeURIComponent(error.message));
    }
});

// Страница возврата ключа
router.get('/return', authMiddleware, adminMiddleware, async (req, res) => {
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
            activeIssues: activeIssues || []
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
router.post('/return', authMiddleware, adminMiddleware, async (req, res) => {
    const { issueRecordId, returnedBy } = req.body;

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
            returnedBy: returnedBy,
            acceptedBy: req.session.user.username,
            returnDate: new Date()
        });

        if (issueRecord.Key) {
            issueRecord.Key.status = 'доступен';
            await issueRecord.Key.save();
        }

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
            overdueIssues: overdueIssues || []
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
            searchName: searchName || ''
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

module.exports = router;