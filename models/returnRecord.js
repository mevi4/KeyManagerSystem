module.exports = (sequelize, DataTypes) => {
    const ReturnRecord = sequelize.define('ReturnRecord', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        issueRecordId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'issueRecordId'
        },
        returnedBy: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'returned_by'
        },
        acceptedBy: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'accepted_by'
        },
        returnDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'return_date'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        tableName: 'return_records',
        timestamps: false
    });

    return ReturnRecord;
};