<script setup lang="ts">
import { ref } from 'vue';
import FormatConverter from '../components/tools/FormatConverter.vue';
import MergeExcelModal from '../tools/merge-excel/MergeExcelModal.vue';

const showMergeModal = ref(false);
</script>

<template>
  <main class="flex-1 max-w-[1200px] mx-auto px-6 py-12 w-full">
    <!-- Header Section -->
    <section class="text-center mb-16 relative">
      <div class="absolute -top-10 left-1/2 -translate-x-1/2 text-primary/10 select-none pointer-events-none">
        <span class="material-symbols-outlined text-[120px]">cloud</span>
      </div>
      <h2 class="text-4xl md:text-5xl font-display font-bold mb-4 relative z-10">Làm việc thật vui! ✨</h2>
      <p class="text-lg font-medium opacity-80 max-w-lg mx-auto">Chọn một công cụ nhỏ để giúp cậu xử lý công việc nhanh hơn nhé!</p>
    </section>

    <!-- Tools Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      
      <!-- Tool 1: Format Converter (Active) -->
      <FormatConverter />

      <!-- Tool 2: Merge Excel (New) -->
      <div class="bg-white rounded-cloud p-8 shadow-xl shadow-primary/5 border-2 border-soft-pink flex flex-col gap-6 relative overflow-hidden h-full group transition-all hover:-translate-y-1 hover:shadow-primary/20">
        <div class="absolute -right-4 -top-4 opacity-10 text-primary">
          <span class="material-symbols-outlined text-9xl">library_add</span>
        </div>
        
        <div class="flex items-center gap-4 relative z-10">
          <div class="size-16 bg-cute-peach rounded-puffy flex items-center justify-center text-primary shadow-inner">
            <span class="material-symbols-outlined text-4xl">merge_type</span>
          </div>
          <div>
            <h3 class="text-xl font-display font-bold text-gray-800 group-hover:text-primary transition-colors">Ghép File Excel</h3>
            <p class="text-sm opacity-60">Gộp dữ liệu từ nhiều file vào một file gốc</p>
          </div>
        </div>
        
        <div class="flex-1 space-y-4">
          <div class="bg-yellow-50 rounded-2xl p-4 text-sm font-medium border border-yellow-200/50 text-gray-600">
            <p>✨ Giữ nguyên định dạng file gốc</p>
            <p>✨ Tự động nhận diện lỗi gõ sai</p>
            <p>✨ Copy cả màu sắc và style</p>
          </div>
          <div class="text-sm text-gray-500 line-clamp-2">
            Giúp cậu tổng hợp báo cáo chỉ trong 30 giây. Không cần copy paste thủ công nữa!
          </div>
        </div>

        <button @click="showMergeModal = true" class="puffy-button py-4 w-full bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex items-center justify-center gap-2">
          <span>Bắt đầu ngay</span>
          <span class="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>

    </div>

    <!-- Features Info Footer -->
    <div class="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="flex flex-col items-center text-center gap-3">
        <div class="size-12 bg-white rounded-full flex items-center justify-center text-primary shadow-soft border border-soft-pink">
          <span class="material-symbols-outlined">security</span>
        </div>
        <h4 class="font-bold text-primary">An toàn tuyệt đối</h4>
        <p class="text-xs opacity-60">Dữ liệu được xử lý tại thiết bị của cậu, không tải lên máy chủ.</p>
      </div>
      <div class="flex flex-col items-center text-center gap-3">
        <div class="size-12 bg-white rounded-full flex items-center justify-center text-primary shadow-soft border border-soft-pink">
          <span class="material-symbols-outlined">bolt</span>
        </div>
        <h4 class="font-bold text-primary">Nhanh & Mượt</h4>
        <p class="text-xs opacity-60">Sử dụng ExcelJS mạnh mẽ để xử lý hàng ngàn dòng dữ liệu trong nháy mắt.</p>
      </div>
      <div class="flex flex-col items-center text-center gap-3">
        <div class="size-12 bg-white rounded-full flex items-center justify-center text-primary shadow-soft border border-soft-pink">
          <span class="material-symbols-outlined">coffee</span>
        </div>
        <h4 class="font-bold text-primary">Hoàn toàn miễn phí</h4>
        <p class="text-xs opacity-60">Món quà từ Ánh giúp công việc của cậu trở nên thư thái hơn.</p>
      </div>
    </div>

    <!-- Modals -->
    <MergeExcelModal :isOpen="showMergeModal" @close="showMergeModal = false" />
  </main>
</template>
