<script setup lang="ts">
import { ref, computed } from 'vue';
import { MergeExcelService } from './MergeExcelService';
import type { UploadedFile, MergeOptions, MergeResult } from './types';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close']);

const service = new MergeExcelService();

const files = ref<UploadedFile[]>([]);
const mainFileId = ref<string>('');
const options = ref<MergeOptions>({
  mainFileId: '',
  secondaryFileIds: [],
  keyColumn: '',
  matchType: 'exact',
  fuzzyThreshold: 0.4,
  copyStyle: true,
  includeUnmatched: false
});

const isProcessing = ref(false);
const result = ref<MergeResult | null>(null);

// Get Main File details for Preview
const mainFile = computed(() => files.value.find(f => f.id === mainFileId.value));
const availableHeaders = computed(() => mainFile.value?.headers || []);

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;

  try {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (!file) continue;
        
        // Load workbook initial meta (sheets)
        const { workbook, sheetNames } = await service.loadWorkbook(file);
        const id = Math.random().toString(36).substring(7);
        
        // Default to first sheet
        const defaultSheet = sheetNames[0] || 'Sheet1';
        
        // V8: Auto-detect header row
        const defaultHeaderRow = service.detectHeaderRow(workbook, defaultSheet);

        // Extract Top 5 Row Previews for Dropdown Selection
        const rawTopRows = service.getRawTopRows(workbook, defaultSheet, 5);

        // Get initial preview data (First 5 rows for header selection)
        const { headers, previewRows } = service.getPreviewData(workbook, defaultSheet, defaultHeaderRow);

        files.value.push({
          id,
          file,
          workbook,
          name: file.name,
          isMain: false,
          sheetNames,
          selectedSheet: defaultSheet,
          headerRowIndex: defaultHeaderRow,
          rawTopRows,
          headers,
          previewRows
        });

        if (files.value.length === 1) {
          mainFileId.value = id;
          if (headers.length > 0) options.value.keyColumn = headers[0] || '';
        }
      }
  } catch (err: any) {
      alert(`Lỗi khi đọc file: ${err.message}. Vui lòng thử file khác.`);
      console.error(err);
  } finally {
      // Always reset to allow re-upload
      input.value = '';
  }
};

const setMainFile = (id: string) => {
  mainFileId.value = id;
  files.value.forEach(f => f.isMain = f.id === id);
  if (mainFile.value && mainFile.value.headers.length > 0) {
    options.value.keyColumn = mainFile.value.headers[0] || '';
  }
};

const updateFilePreview = (fileId: string, refreshRaw: boolean = false) => {
    const file = files.value.find(f => f.id === fileId);
    if(file && file.workbook) {
        if (refreshRaw) {
             file.rawTopRows = service.getRawTopRows(file.workbook, file.selectedSheet, 5);
        }

        const { headers, previewRows } = service.getPreviewData(file.workbook, file.selectedSheet, file.headerRowIndex);
        file.headers = headers;
        file.previewRows = previewRows;
        
        if(file.isMain && !headers.includes(options.value.keyColumn)) {
             options.value.keyColumn = headers[0] || '';
        }
    }
};

const runMerge = async () => {
  if (!mainFileId.value) return;

  isProcessing.value = true;
  result.value = null;

  options.value.mainFileId = mainFileId.value;
  options.value.secondaryFileIds = files.value
    .filter(f => f.id !== mainFileId.value)
    .map(f => f.id);

  try {
    result.value = await service.mergeWorkbooks(files.value, options.value);
  } catch (e) {
    console.error(e);
  } finally {
    isProcessing.value = false;
  }
};

import { saveAs } from 'file-saver';

const downloadResult = () => {
    if (result.value?.blob) {
        // V17: Use FileSaver for robust cross-browser download
        // This solves the issue of "UUID" filenames or XML rendering
        const fileName = `merged_output_${new Date().getTime()}.xlsx`;
        saveAs(result.value.blob, fileName);
    }
};

const resetTool = () => {
    files.value = [];
    mainFileId.value = '';
    result.value = null;
    options.value.keyColumn = '';
};

const closeModal = () => {
  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden border-4 border-soft-pink">
      <!-- Header -->
      <div class="px-8 py-5 border-b border-soft-pink flex justify-between items-center bg-gradient-to-r from-soft-pink/20 to-white">
        <div class="flex items-center gap-3">
             <div class="size-10 bg-cute-peach rounded-full flex items-center justify-center text-primary shadow-sm border border-white">
                <span class="material-symbols-outlined">merge_type</span>
            </div>
            <h2 class="text-2xl font-display font-bold text-gray-800">Merge Excel V7 <span class="text-xs bg-primary text-white rounded-full px-2 py-0.5 ml-2 uppercase font-mono tracking-wider">Fixed</span></h2>
        </div>
        <button @click="closeModal" class="size-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-red-400 transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="p-8 overflow-y-auto flex-1 bg-white">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          <!-- Column 1: File Management (4 cols) -->
          <div class="lg:col-span-4 space-y-6 flex flex-col h-full">
             <!-- Upload Block -->
            <div class="border-2 border-dashed border-primary/30 bg-primary/5 rounded-2xl p-8 text-center hover:bg-primary/10 transition-colors cursor-pointer group relative">
              <input type="file" multiple accept=".xlsx" @change="handleFileUpload" class="absolute inset-0 opacity-0 cursor-pointer" />
              <div class="text-primary group-hover:scale-110 transition-transform duration-300">
                  <span class="material-symbols-outlined text-5xl mb-2">cloud_upload</span>
              </div>
              <div class="text-primary font-bold text-lg">Tải file lên đây</div>
              <div class="text-sm text-gray-500 mt-1">Hỗ trợ .xlsx, .xls</div>
            </div>

            <!-- File List -->
            <div v-if="files.length > 0" class="flex-1 overflow-y-auto pr-2 space-y-3">
              <h3 class="font-bold text-sm uppercase text-gray-400 tracking-wider">Danh sách File</h3>
              
              <div v-for="file in files" :key="file.id" 
                   class="p-4 rounded-2xl border transition-all duration-200 relative group overflow-visible"
                   :class="mainFileId === file.id ? 'border-primary bg-blue-50/50 ring-2 ring-primary/20' : 'border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md'">
                  
                  <div class="flex items-center mb-3 cursor-pointer" @click="setMainFile(file.id)">
                      <div class="w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center transition-colors"
                           :class="mainFileId === file.id ? 'border-primary bg-primary' : 'border-gray-300 bg-white'">
                          <span v-if="mainFileId === file.id" class="material-symbols-outlined text-[12px] text-white">check</span>
                      </div>
                       <span class="truncate font-bold text-gray-800 flex-1">{{ file.name }}</span>
                       <span v-if="mainFileId === file.id" class="text-[10px] bg-primary text-white px-2 py-1 rounded-full font-bold shadow-sm">FILE GỐC</span>
                  </div>

                  <!-- Expanded Config (Sheet & Header Dropdown) -->
                  <div class="grid grid-cols-1 gap-3 pl-8 text-xs">
                      <!-- Sheet Select -->
                      <div>
                            <label class="block text-gray-500 mb-1 font-bold">Sheet dữ liệu</label>
                            <select v-model="file.selectedSheet" @change="updateFilePreview(file.id, true)" class="w-full rounded-lg border-gray-200 bg-white py-1.5 pl-2 text-xs focus:ring-primary focus:border-primary">
                                <option v-for="s in file.sheetNames" :key="s" :value="s">{{ s }}</option>
                            </select>
                      </div>

                      <!-- Header Row Select (Dropdown) -->
                      <div>
                             <label class="block text-gray-500 mb-1 font-bold">Dòng tiêu đề (Preview)</label>
                             <select v-model.number="file.headerRowIndex" @change="updateFilePreview(file.id)" 
                                    class="w-full rounded-lg border-gray-200 bg-white py-1.5 pl-2 text-xs focus:ring-primary focus:border-primary">
                                    <option v-for="(rowContent, idx) in file.rawTopRows" :key="idx" :value="idx + 1">
                                        Dòng {{ idx + 1 }}: {{ rowContent.join(' | ').substring(0, 30) }}...
                                    </option>
                             </select>
                      </div>
                  </div>
              </div>
            </div>
            
            <div v-else class="flex-1 flex items-center justify-center text-center opacity-40">
                <div>
                     <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-folder-4064366-3363927.png" alt="Empty" class="w-32 mx-auto grayscale opacity-50 mb-3" />
                     <p>Chưa có file nào...</p>
                </div>
            </div>
          </div>

          <!-- Column 2: Settings & Preview (8 cols) -->
          <div class="lg:col-span-8 flex flex-col h-full gap-6">
              
              <!-- Config Panel -->
              <div v-if="mainFile" class="bg-white rounded-2xl border border-gray-100 shadow-soft p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <!-- Key Column -->
                  <div class="md:col-span-1">
                      <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <span class="material-symbols-outlined text-primary text-lg">vpn_key</span>
                          Cột So Sánh (Key)
                      </label>
                      <select v-model="options.keyColumn" class="w-full border-gray-200 bg-gray-50 rounded-xl shadow-sm text-sm focus:ring-primary focus:border-primary p-2.5 outline-none transition-all">
                        <option v-for="header in availableHeaders" :key="header" :value="header">
                            {{ header }}
                        </option>
                      </select>
                      <p class="text-xs text-gray-400 mt-2 ml-1">Cột dùng để đối chiếu dữ liệu giữa các file.</p>
                  </div>

                  <!-- Fuzzy Match -->
                  <div class="md:col-span-2 bg-yellow-50/50 rounded-xl p-4 border border-yellow-100 flex flex-col justify-center">
                       <div class="flex items-center justify-between mb-2">
                           <div class="flex items-center gap-2">
                                <label class="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" v-model="options.matchType" true-value="fuzzy" false-value="exact" class="sr-only peer">
                                  <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                  <span class="ml-3 text-sm font-bold text-gray-700">Tìm kiếm gần đúng (Fuzzy Match)</span>
                                </label>
                           </div>
                           <span v-if="options.matchType === 'fuzzy'" class="text-xs font-bold text-primary bg-white px-2 py-1 rounded shadow-sm border border-primary/20">
                               {{ Math.round(options.fuzzyThreshold * 100) }}% Lỏng lẻo
                           </span>
                       </div>
                       
                       <div v-if="options.matchType === 'fuzzy'">
                           <input v-model.number="options.fuzzyThreshold" type="range" min="0" max="0.8" step="0.1" 
                                  class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                           <div class="flex justify-between text-[10px] text-gray-400 mt-1 font-medium uppercase">
                               <span>Chính xác cao</span>
                               <span>Chính xác thấp</span>
                           </div>
                       </div>
                       <div v-else class="text-xs text-gray-400 italic pl-12">
                           Chế độ "Chính xác tuyệt đối". Dữ liệu phải giống hệt nhau 100%.
                       </div>
                  </div>
              </div>

              <!-- Preview Table -->
              <div class="bg-white rounded-2xl border border-gray-200 flex flex-col flex-1 overflow-hidden shadow-sm">
                  <div class="px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase flex justify-between items-center">
                      <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-lg">table_view</span>
                          {{ result?.success ? 'Preview: KẾT QUẢ SAU KHI GHÉP' : `Preview: ${mainFile?.name || 'Vui lòng chọn file'}` }}
                      </div>
                      <span v-if="mainFile || result?.success" class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px]">
                          {{ result?.success ? 'Hiển thị kết quả' : 'Hiển thị file gốc' }}
                      </span>
                  </div>
                  <!-- V16: Fixed height ~300px for 5-6 rows visibility, scroll for more -->
                  <div class="flex-1 overflow-auto relative bg-gray-50/30 max-h-[300px]">
                      <table v-if="mainFile" class="w-full text-sm text-left text-gray-600">
                          <thead class="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th v-for="(header, idx) in (result?.success ? result.mergedHeaders : mainFile.headers)" :key="idx" 
                                      class="px-4 py-3 border-b border-r last:border-r-0 whitespace-nowrap bg-gray-100 font-bold tracking-wider"
                                      :class="header === options.keyColumn ? 'bg-blue-50 text-primary border-blue-100' : 'border-gray-200'">
                                      <div class="flex items-center gap-1">
                                          {{ header }}
                                          <span v-if="header === options.keyColumn" class="material-symbols-outlined text-sm">vpn_key</span>
                                      </div>
                                  </th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr v-for="(row, rIdx) in (result?.success ? result.mergedRows : mainFile.previewRows)" :key="rIdx" class="bg-white border-b hover:bg-blue-50/30 transition-colors last:border-b-0">
                                  <th v-for="(cell, cIdx) in row" :key="cIdx" class="px-4 py-3 border-r last:border-r-0 whitespace-nowrap font-normal border-gray-100">
                                      {{ cell }}
                                  </th>
                              </tr>
                          </tbody>
                      </table>
                      <div v-else class="h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                          <span class="material-symbols-outlined text-8xl opacity-20">dataset</span>
                          <span class="text-sm font-medium">Chọn một file làm gốc (Main File) để xem trước dữ liệu</span>
                      </div>
                  </div>
              </div>

              <!-- Logs (Collapsed style) -->
              <div class="bg-gray-900 rounded-xl text-green-400 font-mono text-[11px] p-3 max-h-32 overflow-hidden flex flex-col border border-gray-800 shadow-inner">
                 <div class="flex justify-between items-center mb-1 text-gray-500 text-[10px] uppercase font-bold tracking-widest border-b border-gray-800 pb-1">
                   <span>Console Output</span>
                   <span v-if="isProcessing" class="flex items-center gap-1 text-yellow-400"><span class="animate-spin material-symbols-outlined text-xs">sync</span> Processing...</span>
                 </div>
                 <div class="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
                   <div v-if="!result?.logs && !isProcessing" class="text-gray-600 italic">Waiting to start...</div>
                   <div v-for="(log, i) in result?.logs || []" :key="i" class="border-l-2 border-green-800 pl-2">> {{ log }}</div>
                 </div>
              </div>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div class="px-8 py-5 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-20">
        <div class="text-xs text-gray-400 font-medium">
            <p>💡 Tip: Chọn đúng dòng tiêu đề để cột hiển thị chính xác.</p>
        </div>
        <div class="flex space-x-4">
            <button @click="closeModal" class="px-6 py-3 text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 font-bold transition-all">Huỷ bỏ</button>
            
            <button v-if="result?.success" @click="downloadResult" class="btn-primary bg-green-500 shadow-green-200 px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 hover:bg-green-600 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <span class="material-symbols-outlined">download</span>
            Tải về ngay
            </button>
            
            <button v-if="result?.success" @click="resetTool" class="px-6 py-3 bg-white text-primary border-2 border-primary/20 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/5 transition-all">
            <span class="material-symbols-outlined">restart_alt</span>
            Ghép tiếp (Reset)
            </button>

            <button @click="runMerge" :disabled="!mainFileId || isProcessing || files.length < 2 || !options.keyColumn" 
                    v-if="!result?.success"
                    class="bg-primary text-white shadow-lg shadow-primary/30 px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-dark hover:shadow-primary/50 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
            <span class="material-symbols-outlined">bolt</span>
            {{ isProcessing ? 'Đang xử lý...' : 'Bắt đầu phép thuật' }}
            </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for better blend */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent; 
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8; 
}

/* Reusing global classes concepts directly for scoped component isolation */
.bg-soft-pink { background-color: #ffe4e6; }
.border-soft-pink { border-color: #fce7f3; }
.bg-cute-peach { background-color: #ffedd5; }
.text-primary { color: #db2777; }
.bg-primary { background-color: #db2777; }
.shadow-soft { box-shadow: 0 4px 20px -2px rgba(219, 39, 119, 0.1); }
</style>
