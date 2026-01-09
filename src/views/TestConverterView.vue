<template>
    <div class="min-h-screen bg-gradient-to-br from-pastel-pink via-pastel-purple to-pastel-blue p-8">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="bg-white rounded-[2rem] p-8 mb-6 soft-shadow">
                <h1 class="text-3xl font-bold text-primary mb-2">🧪 Format Converter Test Lab</h1>
                <p class="text-sm opacity-60">Testing ExcelJS conversion logic before UI integration</p>
            </div>

            <!-- Test Controls -->
            <div class="bg-white rounded-[2rem] p-8 mb-6 soft-shadow">
                <h2 class="text-xl font-bold mb-4">📤 Upload & Convert</h2>
                
                <!-- File Upload -->
                <div class="mb-4">
                    <label class="block text-sm font-bold mb-2">Select File:</label>
                    <input 
                        type="file" 
                        @change="handleFileSelect"
                        accept=".xlsx,.xls,.csv,.json"
                        class="w-full p-3 border-2 border-primary/20 rounded-xl focus:border-primary focus:outline-none"
                    />
                </div>

                <!-- Format Selection -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-bold mb-2">Source Format:</label>
                        <input 
                            :value="sourceFormat" 
                            readonly 
                            class="w-full p-3 bg-gray-100 rounded-xl font-mono text-sm"
                            placeholder="Auto-detected"
                        />
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">Target Format:</label>
                        <select 
                            v-model="targetFormat"
                            class="w-full p-3 border-2 border-primary/20 rounded-xl focus:border-primary focus:outline-none"
                        >
                            <option value="xlsx">Excel (.xlsx)</option>
                            <option value="csv">CSV (.csv)</option>
                            <option value="json">JSON (.json)</option>
                        </select>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-3">
                    <button 
                        @click="testConversion"
                        :disabled="!selectedFile || isLoading"
                        class="flex-1 bg-primary text-white py-3 px-6 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                    >
                        {{ isLoading ? '⏳ Converting...' : '🔄 Convert File' }}
                    </button>
                    <button 
                        @click="testFileValidation"
                        class="bg-secondary text-white py-3 px-6 rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        🧪 Test Validation
                    </button>
                </div>
            </div>

            <!-- Test Results -->
            <div class="bg-white rounded-[2rem] p-8 soft-shadow">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold">📋 Test Logs</h2>
                    <button 
                        @click="clearLogs"
                        class="text-sm text-red-500 hover:underline"
                    >
                        Clear Logs
                    </button>
                </div>
                
                <div class="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs h-96 overflow-y-auto">
                    <div v-if="testResults.length === 0" class="opacity-50">
                        No logs yet. Upload a file and test conversion!
                    </div>
                    <div v-for="(log, index) in testResults" :key="index" class="mb-1">
                        {{ log }}
                    </div>
                </div>
            </div>

            <!-- Quick Test Guide -->
            <div class="bg-white rounded-[2rem] p-8 mt-6 soft-shadow">
                <h2 class="text-xl font-bold mb-4">📖 Test Guide</h2>
                <div class="space-y-2 text-sm">
                    <p><strong>1. Excel → CSV:</strong> Upload .xlsx file, select CSV as target</p>
                    <p><strong>2. CSV → Excel:</strong> Upload .csv file, select Excel as target</p>
                    <p><strong>3. Excel → JSON:</strong> Upload .xlsx file, select JSON as target</p>
                    <p><strong>4. JSON → Excel:</strong> Upload .json file (array of objects), select Excel as target</p>
                    <p><strong>5. Validation Test:</strong> Click "Test Validation" to run automated tests</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { converterService } from '@/services/excel/ConverterService';
import { excelService } from '@/services/excel/ExcelService';
import { ConversionFormat } from '@/types/excel';

const testResults = ref<string[]>([]);
const isLoading = ref(false);
const selectedFile = ref<File | null>(null);
const sourceFormat = ref<string>('');
const targetFormat = ref<string>(ConversionFormat.CSV);

const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    testResults.value.push(`[${timestamp}] ${emoji} ${message}`);
};

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
        selectedFile.value = target.files[0];
        
        // Validate file
        const validation = converterService.validateFile(target.files[0]);
        if (validation.isValid) {
            sourceFormat.value = validation.format || '';
            addLog(`File selected: ${target.files[0].name} (${(validation.size / 1024).toFixed(2)} KB)`, 'success');
            addLog(`Detected format: ${validation.format}`, 'info');
        } else {
            addLog(`Validation failed: ${validation.error}`, 'error');
            selectedFile.value = null;
        }
    }
};

const testConversion = async () => {
    if (!selectedFile.value) {
        addLog('No file selected!', 'error');
        return;
    }

    isLoading.value = true;
    addLog(`Starting conversion: ${sourceFormat.value} → ${targetFormat.value}`, 'info');

    try {
        const result = await converterService.convert(selectedFile.value, {
            sourceFormat: sourceFormat.value as any,
            targetFormat: targetFormat.value as any
        });

        if (result.success) {
            addLog('Conversion successful!', 'success');
            addLog(`Output filename: ${result.filename}`, 'info');
            addLog(`MIME type: ${result.mimeType}`, 'info');
            
            // Download the result
            if (result.data) {
                excelService.downloadFile(result.data as ArrayBuffer | string, result.filename, result.mimeType);
                addLog('File downloaded!', 'success');
            }
        } else {
            addLog(`Conversion failed: ${result.error}`, 'error');
        }
    } catch (error) {
        addLog(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
        isLoading.value = false;
    }
};

const clearLogs = () => {
    testResults.value = [];
};

const testFileValidation = () => {
    addLog('=== Testing File Validation ===', 'info');
    
    // Test with mock files
    const testCases = [
        { name: 'test.xlsx', size: 1024 * 1024, expected: true },
        { name: 'test.csv', size: 500 * 1024, expected: true },
        { name: 'test.json', size: 2 * 1024 * 1024, expected: true },
        { name: 'test.txt', size: 1024, expected: false },
        { name: 'huge.xlsx', size: 15 * 1024 * 1024, expected: false }
    ];

    testCases.forEach(tc => {
        const mockFile = new File([''], tc.name, { type: 'application/octet-stream' });
        Object.defineProperty(mockFile, 'size', { value: tc.size });
        
        const result = converterService.validateFile(mockFile);
        const passed = result.isValid === tc.expected;
        addLog(`${tc.name} (${(tc.size / 1024 / 1024).toFixed(2)}MB): ${passed ? 'PASS' : 'FAIL'}`, passed ? 'success' : 'error');
    });
};
</script>
