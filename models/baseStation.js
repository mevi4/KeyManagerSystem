module.exports = (sequelize, DataTypes) => {
    const BaseStation = sequelize.define('BaseStation', {
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
        address: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'address'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        tableName: 'base_stations',
        timestamps: false
    });

    return BaseStation;
};