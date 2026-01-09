import type { Workbook } from 'exceljs';

export interface UploadedFile {
    id: string;
    file: File;
    workbook?: Workbook;
    name: string;
    isMain: boolean;
    headerRowIndex: number;
    sheetNames: string[];
    selectedSheet: string;
    rawTopRows?: string[][]; // Content of first 5 rows for header selection
    headers: string[];
    previewRows: any[][];
}

export interface MergeOptions {
    mainFileId: string;
    secondaryFileIds: string[];
    keyColumn: string;
    matchType: 'exact' | 'fuzzy';
    fuzzyThreshold: number; // 0.0 to 1.0 (default 0.4)
    copyStyle: boolean;
    includeUnmatched: boolean;
}

export interface MergeResult {
    success: boolean;
    outputWorkbook?: Workbook;
    logs: string[];
    blob?: Blob;
    mergedHeaders?: string[];
    mergedRows?: any[][];
}

export interface HeaderInfo {
    index: number;
    value: string;
}
