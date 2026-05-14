const { AuditLog } = require('../models');

class AuditService {
    async log(username, ipAddress, operationType, objectId, details) {
        console.log(`[AUDIT] ${operationType} - ${username}`);
        
        try {
            const result = await AuditLog.create({
                username: username,
                ipaddress: ipAddress || '127.0.0.1',
                operationtype: operationType,
                objectid: objectId || null,
                details: details || null,
                timestamp: new Date()
            });
            console.log(`[AUDIT] Запись добавлена, ID: ${result.id}`);
        } catch (error) {
            console.error('[AUDIT] Ошибка:', error.message);
        }
    }
}

module.exports = new AuditService();