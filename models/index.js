const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'KeyManagerDB',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '123',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false
    }
);

const UserRole = require('./userRole')(sequelize, DataTypes);
const BaseStation = require('./baseStation')(sequelize, DataTypes);
const Key = require('./key')(sequelize, DataTypes);
const IssueRecord = require('./issueRecord')(sequelize, DataTypes);
const ReturnRecord = require('./returnRecord')(sequelize, DataTypes);
const AuditLog = require('./auditLog')(sequelize, DataTypes);

// Связи
Key.belongsTo(BaseStation, { foreignKey: 'baseStationId' });
BaseStation.hasMany(Key, { foreignKey: 'baseStationId' });

IssueRecord.belongsTo(Key, { foreignKey: 'keyId' });
Key.hasMany(IssueRecord, { foreignKey: 'keyId' });

ReturnRecord.belongsTo(IssueRecord, { foreignKey: 'issueRecordId' });
IssueRecord.hasOne(ReturnRecord, { foreignKey: 'issueRecordId' });

module.exports = {
    sequelize,
    UserRole,
    BaseStation,
    Key,
    IssueRecord,
    ReturnRecord,
    AuditLog
};