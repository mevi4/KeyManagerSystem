const XLSX = require('xlsx');

class ExcelExport {
    static exportToExcel(data, worksheetName, fileName, res) {
        if (!data || data.length === 0) {
            // Если нет данных, отправляем пустой файл с заголовками
            return res.status(404).send('Нет данных для экспорта');
        }
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);
        
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        
        const safeFileName = fileName.replace(/[^a-zа-яё0-9_]/gi, '_');
        res.setHeader('Content-Disposition', `attachment; filename=${safeFileName}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    }
}

module.exports = ExcelExport;