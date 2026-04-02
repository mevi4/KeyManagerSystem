module.exports = (sequelize, DataTypes) => {
    const Key = sequelize.define('Key', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        number: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'number'
        },
        baseStationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'baseStationId'
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'доступен',
            field: 'status'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        tableName: 'keys',
        timestamps: false
    });

    return Key;
};