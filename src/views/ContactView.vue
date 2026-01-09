<script setup lang="ts">
import { ref } from 'vue';
import { contentStore } from '../stores/content';
import { ContentService } from '../services/ContentService';

const name = ref('');
const email = ref('');
const message = ref('');
const isSubmitting = ref(false);
const sentSuccess = ref(false);

// Custom SVG icons for brands (same as AdminView)
const customIcons: Record<string, string> = {
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z"/></svg>'
};

const getIconHtml = (iconName: string) => {
    return customIcons[iconName] || null;
};

const sendMessage = async () => {
    isSubmitting.value = true;
    
    // Send to Supabase
    const msg = {
        name: name.value,
        email: email.value,
        content: message.value,
        date: new Date().toISOString()
    };

    const success = await ContentService.sendMessage(msg);
    
    if (success) {
        // Update local store immediately for UI feedback
        // We'll trust Supabase ID generation or refresh, but for now just pushing to list
        // Ideally we should reload messages or get the returned ID
        contentStore.messages.unshift({ ...msg, id: Date.now() }); // Temporary ID until reload
        
        name.value = '';
        email.value = '';
        message.value = '';
        sentSuccess.value = true;
        setTimeout(() => sentSuccess.value = false, 5000);
    } else {
        alert('Failed to send message. Please try again.');
    }
    isSubmitting.value = false;
};
</script>

<template>
    <div class="min-h-screen font-display text-[#1b0d11] dark:text-[#fcf8f9] pt-10">
        <main class="flex-1 flex flex-col max-w-[1000px] mx-auto px-4 md:px-10 py-16 items-center">
            <div class="text-center mb-12">
                <h1 class="text-4xl md:text-5xl font-bold text-primary mb-4">Gửi lời nhắn cho mình nhé!</h1>
                <p class="text-lg text-[#1b0d11]/70 font-medium mb-6">I'd love to hear from you and start something magical together ✨</p>
                
                <!-- Explicit Contact Info -->
                 <div class="inline-flex flex-col items-center gap-2 bg-white/50 p-4 rounded-2xl border border-white backdrop-blur-sm">
                    <p class="text-sm font-bold text-primary/60">CONTACT DIRECTLY</p>
                    <p class="text-lg font-bold text-primary select-all">{{ contentStore.about.email }}</p>
                </div>
            </div>
            
            <div class="relative w-full max-w-2xl bg-white rounded-2xl p-8 md:p-12 love-letter-shadow border-t-[12px] border-pastel-pink transition-all">
                <div class="absolute -top-7 left-1/2 -translate-x-1/2 heart-seal size-14 rounded-full flex items-center justify-center text-white z-10">
                    <span class="material-symbols-outlined text-3xl">favorite</span>
                </div>
                
                <div v-if="sentSuccess" class="text-center py-10 animate-fade-in">
                    <div class="size-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="material-symbols-outlined text-4xl">check_circle</span>
                    </div>
                    <h3 class="text-2xl font-bold text-primary">Tin nhắn đã được gửi!</h3>
                    <p class="mt-2 opacity-60">Cảm ơn bạn đã liên hệ, mình sẽ trả lời sớm nhất nha.</p>
                     <button @click="sentSuccess = false" class="mt-6 text-sm font-bold text-primary underline">Gửi tin nhắn khác</button>
                </div>

                <form v-else @submit.prevent="sendMessage" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="block text-sm font-bold text-primary px-2">Tên của bạn</label>
                            <input v-model="name" class="w-full bg-pastel-peach/30 border-2 border-pastel-pink focus:border-primary focus:ring-0 rounded-2xl px-5 py-4 font-body placeholder:text-pink-300 transition-all outline-none" placeholder="Your sweet name" type="text" required/>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-sm font-bold text-primary px-2">Email</label>
                            <input v-model="email" class="w-full bg-pastel-peach/30 border-2 border-pastel-pink focus:border-primary focus:ring-0 rounded-2xl px-5 py-4 font-body placeholder:text-pink-300 transition-all outline-none" placeholder="your@email.com" type="email" required/>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-sm font-bold text-primary px-2">Lời nhắn</label>
                        <textarea v-model="message" class="w-full bg-pastel-peach/30 border-2 border-pastel-pink focus:border-primary focus:ring-0 rounded-2xl px-5 py-4 font-body placeholder:text-pink-300 transition-all resize-none outline-none" placeholder="Write your magic letter here..." rows="5" required></textarea>
                    </div>
                    <button :disabled="isSubmitting" class="w-full py-5 bg-primary text-white font-bold text-xl rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed" type="submit">
                        <span v-if="isSubmitting">Đang gửi... 🚀</span>
                        <span v-else>Gửi đi nè! <span class="material-symbols-outlined">send</span></span>
                    </button>
                </form>
            </div>

             <div class="mt-20 text-center">
                <h3 class="text-2xl font-bold text-primary/80 mb-8">Follow my adventures</h3>
                <div class="flex flex-wrap justify-center gap-8">
                     <!-- Social links from store -->
                     <a v-for="(item, idx) in contentStore.about.social" :key="idx" :href="item.url" target="_blank" class="group relative">
                        <div class="size-20 bg-pastel-peach rounded-full flex items-center justify-center text-primary group-hover:scale-125 transition-all duration-300 shadow-lg border-4 border-white capitalize">
                            <span v-if="getIconHtml(item.icon)" v-html="getIconHtml(item.icon)" class="w-10 h-10"></span>
                            <span v-else class="material-symbols-outlined text-4xl">{{ item.icon }}</span>
                        </div>
                    </a>
                </div>
            </div>
        </main>
    </div>
</template>
