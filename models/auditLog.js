module.exports = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        username: { type: DataTypes.STRING, allowNull: false },
        ipaddress: { type: DataTypes.STRING, allowNull: false },
        operationtype: { type: DataTypes.STRING, allowNull: false },
        objectid: { type: DataTypes.STRING },
        details: { type: DataTypes.TEXT },
        createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, {
        tableName: 'audit_logs',
        timestamps: false
    });
    return AuditLog;
};