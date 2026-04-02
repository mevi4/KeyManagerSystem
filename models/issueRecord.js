module.exports = (sequelize, DataTypes) => {
    const IssueRecord = sequelize.define('IssueRecord', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        keyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'keyId'
        },
        issuedBy: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'issued_by'
        },
        receivedBy: {
            type: DataTypes.STRING,
            allowNull: false,
            field: 'received_by'
        },
        issueDate: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'issue_date'
        },
        plannedReturnDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'planned_return_date'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        tableName: 'issue_records',
        timestamps: false
    });

    return IssueRecord;
};