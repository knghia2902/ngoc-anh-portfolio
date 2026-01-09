// Excel Tool Type Definitions
// Stage 3: TypeScript types for Format Converter

/**
 * Supported conversion formats
 */
export const ConversionFormat = {
    EXCEL: 'xlsx',
    CSV: 'csv',
    JSON: 'json'
} as const;

export type ConversionFormat = typeof ConversionFormat[keyof typeof ConversionFormat];

/**
 * Options for file conversion
 */
export interface ConversionOptions {
    sourceFormat: ConversionFormat;
    targetFormat: ConversionFormat;
    preserveFormatting?: boolean;
    sheetIndex?: number; // For multi-sheet Excel (0-based)
    sheetName?: string; // Alternative to sheetIndex
    includeHeaders?: boolean; // For CSV/JSON conversion
}

/**
 * Result of a conversion operation
 */
export interface ConversionResult {
    success: boolean;
    data?: ArrayBuffer | string | Blob;
    filename: string;
    mimeType: string;
    error?: string;
    warnings?: string[];
}

/**
 * File upload validation result
 */
export interface FileValidation {
    isValid: boolean;
    format?: ConversionFormat;
    size: number;
    error?: string;
}

/**
 * Conversion progress (for future use)
 */
export interface ConversionProgress {
    stage: 'reading' | 'processing' | 'writing' | 'complete';
    percentage: number;
    message: string;
}
