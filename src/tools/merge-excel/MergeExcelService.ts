import ExcelJS from 'exceljs';
import type { UploadedFile, MergeOptions, MergeResult } from './types';

export class MergeExcelService {
    async loadWorkbook(file: File): Promise<{ workbook: ExcelJS.Workbook; sheetNames: string[] }> {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const sheetNames = workbook.worksheets.map(s => s.name);
        return { workbook, sheetNames };
    }

    // New helper to get raw top rows for header selection
    getRawTopRows(workbook: ExcelJS.Workbook, sheetName: string, limit: number = 20): string[][] {
        const sheet = workbook.getWorksheet(sheetName);
        const rows: string[][] = [];
        if (sheet) {
            for (let i = 1; i <= limit; i++) {
                const row = sheet.getRow(i);
                const rowData: string[] = [];
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    // Limit cell preview to first 10 columns to avoid clutter
                    if (colNumber <= 10) {
                        rowData.push(this.getSafeText(cell));
                    }
                });
                rows.push(rowData);
            }
        }
        return rows;
    }

    // Heuristic detection: Find row with most text cells in first 20 rows
    detectHeaderRow(workbook: ExcelJS.Workbook, sheetName: string): number {
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) return 1;

        let bestRow = 1;
        let maxScore = -1;

        // Scan top 20 rows explicitly
        for (let i = 1; i <= 20; i++) {
            const row = sheet.getRow(i);
            let score = 0;

            row.eachCell({ includeEmpty: false }, (cell) => {
                const val = this.getSafeText(cell);
                if (val.length > 0) {
                    score += 1;
                }
            });

            if (score > maxScore) {
                maxScore = score;
                bestRow = i;
            }
        }

        return bestRow;
    }

    // V15: Ultra-safe text extractor to prevent "null.toString()" crashes
    getSafeText(cell: ExcelJS.Cell): string {
        try {
            if (!cell) return '';
            // ExcelJS cell.text can sometimes throw if value is weirdly formatted
            const val = cell.value;
            if (val === null || val === undefined) return '';
            // If simple primitive
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                return val.toString().trim();
            }
            // If rich text or other object, try .text check
            if (cell.text) return cell.text.toString().trim();

            // Fallback for objects without text
            return JSON.stringify(val).substring(0, 50);
        } catch (e) {
            return '';
        }
    }

    getPreviewData(workbook: ExcelJS.Workbook, sheetName: string, headerRowIdx: number): { headers: string[]; previewRows: any[][] } {
        const sheet = workbook.getWorksheet(sheetName);
        const headers: string[] = [];
        const previewRows: any[][] = [];

        if (sheet) {
            // Get extracted headers from specified Header Row
            const headerRow = sheet.getRow(headerRowIdx);
            headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                headers[colNumber - 1] = this.getSafeText(cell) || `Col ${colNumber}`;
            });

            // Get up to 500 rows for preview (scrolling supported)
            let count = 0;
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber > headerRowIdx && count < 500) {
                    const rowData: any[] = [];
                    // Ensure we match header length
                    for (let i = 0; i < headers.length; i++) {
                        // V15 Fix: Use getSafeText instead of accessing .text directly
                        rowData.push(this.getSafeText(row.getCell(i + 1)));
                    }
                    previewRows.push(rowData);
                    count++;
                }
            });
        }
        return { headers, previewRows };
    }

    async mergeWorkbooks(
        files: UploadedFile[],
        options: MergeOptions
    ): Promise<MergeResult> {
        const logs: string[] = [];
        logs.push(`Starting merge process (V11 Vertical Append)...`);

        try {
            const mainFile = files.find(f => f.id === options.mainFileId);
            if (!mainFile) {
                throw new Error("Main file not found.");
            }
            logs.push(`Main file: ${mainFile.name} (Sheet: ${mainFile.selectedSheet})`);

            const secondaryFiles = files.filter(f => options.secondaryFileIds.includes(f.id));
            logs.push(`Processing ${secondaryFiles.length} secondary files.`);

            // 1. Load Main File (STRICT fresh load)
            const mainBuffer = await mainFile.file.arrayBuffer();
            const mainWorkbook = new ExcelJS.Workbook();
            await mainWorkbook.xlsx.load(mainBuffer);

            const mainSheet = mainWorkbook.getWorksheet(mainFile.selectedSheet);
            if (!mainSheet) throw new Error(`Sheet ${mainFile.selectedSheet} not found in output.`);

            // 2. Map Main Headers (Name -> Col Index)
            const mainHeaderMap = new Map<string, number>();
            const mainHeaderRow = mainSheet.getRow(mainFile.headerRowIndex);

            mainHeaderRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
                const headerText = cell.text ? cell.text.toString().trim() : '';
                if (headerText) {
                    mainHeaderMap.set(headerText, colNum);
                    // Also support lowercase lookup for robustness
                    mainHeaderMap.set(headerText.toLowerCase(), colNum);
                }
            });
            logs.push(`Mapped ${mainHeaderMap.size / 2} columns in Main File.`);

            // 3. Build Key Set for Deduplication (if active)
            const existingKeys = new Set<string>();
            let dedupeActive = false;
            let mainKeyColIdx = -1;

            if (options.keyColumn && options.keyColumn.trim() !== '') {
                dedupeActive = true;
                // Find index of key column in main file
                // Try direct match then lowercase
                if (mainHeaderMap.has(options.keyColumn.trim())) {
                    mainKeyColIdx = mainHeaderMap.get(options.keyColumn.trim())!;
                } else if (mainHeaderMap.has(options.keyColumn.trim().toLowerCase())) {
                    mainKeyColIdx = mainHeaderMap.get(options.keyColumn.trim().toLowerCase())!;
                }

                if (mainKeyColIdx !== -1) {
                    logs.push(`Deduplication Active. Key Column: '${options.keyColumn}' (Index ${mainKeyColIdx})`);
                    mainSheet.eachRow((row, rowNumber) => {
                        if (rowNumber <= mainFile.headerRowIndex) return;
                        const keyVal = row.getCell(mainKeyColIdx).text.trim();
                        if (keyVal) existingKeys.add(keyVal);
                    });
                    logs.push(`Found ${existingKeys.size} existing keys in Main File.`);
                } else {
                    logs.push(`Warning: Key Column '${options.keyColumn}' not found in Main File. Appending ALL rows.`);
                    dedupeActive = false;
                }
            } else {
                logs.push(`No Key Column selected. Appending ALL rows.`);
            }

            // 4. Iterate Secondary Files and Append
            for (const secFileItem of secondaryFiles) {
                logs.push(`-- Processing File: ${secFileItem.name}`);

                try {
                    // Fresh Load
                    const secBuffer = await secFileItem.file.arrayBuffer();
                    const secWorkbook = new ExcelJS.Workbook();
                    await secWorkbook.xlsx.load(secBuffer);
                    const secSheet = secWorkbook.getWorksheet(secFileItem.selectedSheet);
                    if (!secSheet) {
                        logs.push(`   Warning: Sheet '${secFileItem.selectedSheet}' not found. Available sheets: [${secWorkbook.worksheets.map(s => s.name).join(', ')}]. Skipping.`);
                        continue;
                    }

                    // Map Secondary Headers
                    const secHeaderMap = new Map<number, string>(); // Col Index -> Header Name
                    const secHeaderRow = secSheet.getRow(secFileItem.headerRowIndex);

                    secHeaderRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
                        const headerText = cell.text ? cell.text.toString().trim() : '';
                        if (headerText) {
                            secHeaderMap.set(colNum, headerText);
                        }
                    });

                    // Key Col Index in Secondary
                    let secKeyColIdx = -1;
                    if (dedupeActive) {
                        secHeaderRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
                            const t = cell.text.trim();
                            if (t === options.keyColumn.trim()) secKeyColIdx = colNum;
                            else if (t.toLowerCase() === options.keyColumn.trim().toLowerCase()) secKeyColIdx = colNum;
                        });
                        if (secKeyColIdx === -1) {
                            logs.push(`   Warning: Key Column not found in Secondary. Appending all (potential duplicates).`);
                        }
                    }

                    // Iterate Rows and Append
                    let appendedCount = 0;
                    let skippedCount = 0;

                    secSheet.eachRow((row, rowNumber) => {
                        if (rowNumber <= secFileItem.headerRowIndex) return; // Skip headers

                        // Deduplication Check
                        if (dedupeActive && secKeyColIdx !== -1) {
                            const keyVal = row.getCell(secKeyColIdx).text.trim();
                            if (keyVal && existingKeys.has(keyVal)) {
                                skippedCount++;
                                return; // Skip duplicate
                            }
                            // Add new key to set so duplicates within the SAME secondary file are also caught? 
                            // Usually yes.
                            if (keyVal) existingKeys.add(keyVal);
                        }

                        // V17: Find the true last row with content to prevent gaps
                        // Standard sheet.rowCount includes empty rows with styles.
                        // We need to find the last row that actually has values.
                        let insertRowIdx = mainSheet.rowCount + 1;
                        // Optimization: scan backwards from rowCount to find last data
                        for (let r = mainSheet.rowCount; r >= 1; r--) {
                            const row = mainSheet.getRow(r);
                            if (row.hasValues) {
                                insertRowIdx = r + 1;
                                break;
                            }
                        }
                        // If file is empty or just headers
                        if (insertRowIdx <= mainFile.headerRowIndex) insertRowIdx = mainFile.headerRowIndex + 1;

                        // Insert new row at calculated index
                        // Note: insertRow moves existing rows down. Since we are appending to bottom, this is safe.
                        // However, to be strictly "appending", we should just getRow(insertRowIdx) if it's beyond current limit.

                        const newRow = mainSheet.getRow(insertRowIdx + appendedCount);

                        // Map Values Column-by-Column
                        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                            const headerName = secHeaderMap.get(colNum);
                            if (headerName) {
                                // Find where this goes in Main
                                const mainColIdx = mainHeaderMap.get(headerName) || mainHeaderMap.get(headerName.toLowerCase());
                                if (mainColIdx) {
                                    const targetCell = newRow.getCell(mainColIdx);
                                    targetCell.value = cell.value;

                                    // Safer style copy (only if copyStyle is on and style exists)
                                    // V17: Ensure we don't overwrite if target has style? No, we want to bring style from source.
                                    if (options.copyStyle && cell.style && Object.keys(cell.style).length > 0) {
                                        try {
                                            // Avoid circular structure issues or partial styles
                                            targetCell.style = JSON.parse(JSON.stringify(cell.style));
                                        } catch (e) { }
                                    }
                                }
                            }
                        });
                        newRow.commit();
                        appendedCount++;
                    });

                    logs.push(`   Appended ${appendedCount} rows. Skipped ${skippedCount} duplicates.`);

                } catch (err: any) {
                    logs.push(`   Error reading file: ${err.message}`);
                }
            }

            // Export
            const outBuffer = await mainWorkbook.xlsx.writeBuffer();
            // V16: Use standard Excel MIME type. The browser will handle the download correctly via the anchor tag.
            const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Generate Preview
            const { headers: mergedHeaders, previewRows: mergedRows } = this.getPreviewData(mainWorkbook, mainFile.selectedSheet, mainFile.headerRowIndex);

            logs.push("Done! File ready for download. Size: " + (blob.size / 1024).toFixed(2) + " KB");
            return {
                success: true,
                outputWorkbook: mainWorkbook,
                logs,
                blob,
                mergedHeaders,
                mergedRows
            };

        } catch (error: any) {
            console.error(error);
            return {
                success: false,
                logs: [...logs, `Error: ${error.message}`]
            };
        }
    }
}
