module.exports = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: false
        },
        operationType: {
            type: DataTypes.STRING,
            allowNull: false
        },
        objectId: {
            type: DataTypes.STRING
        },
        details: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'audit_logs',
        timestamps: false
    });

    return AuditLog;
};