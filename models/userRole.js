module.exports = (sequelize, DataTypes) => {
    const UserRole = sequelize.define('UserRole', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'username'
        },
        role: {
            type: DataTypes.STRING,
            defaultValue: 'Инженер',
            field: 'role'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        tableName: 'user_roles',
        timestamps: false
    });

    return UserRole;
};