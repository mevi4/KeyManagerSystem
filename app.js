const express = require('express');
const session = require('express-session');
const methodOverride = require('method-override');
const path = require('path');
const dotenv = require('dotenv');
const ejsMate = require('ejs-mate');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка ejs-mate
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));

// Настройка сессий
app.use(session({
    secret: 'keymanager-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

// Редирект с корневого пути
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Подключение маршрутов
const authRoutes = require('./routes/auth');
const keyRoutes = require('./routes/keys');
const stationRoutes = require('./routes/stations');
const userRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');

app.use('/', authRoutes);
app.use('/keys', keyRoutes);
app.use('/stations', stationRoutes);
app.use('/users', userRoutes);
app.use('/audit', auditRoutes);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});