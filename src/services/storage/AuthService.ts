import { supabase } from '../../supabase';

export interface User {
    username: string;
    role: 'admin';
}

export class AuthService {
    async login(username: string, password: string): Promise<{ success: boolean; isFirstLogin?: boolean }> {
        const { data, error } = await supabase.from('content').select('settings').eq('id', 'main').single();

        if (error || !data?.settings) return { success: false };

        const settings = data.settings;
        if (username === settings.username && password === settings.password) {
            return { success: true, isFirstLogin: settings.is_first };
        }
        return { success: false };
    }

    async changePassword(newPassword: string): Promise<boolean> {
        const { data: current, error: fetchError } = await supabase.from('content').select('settings').eq('id', 'main').single();
        if (fetchError || !current?.settings) return false;

        const newSettings = {
            ...current.settings,
            password: newPassword,
            is_first: false
        };

        const { error } = await supabase
            .from('content')
            .update({ settings: newSettings })
            .eq('id', 'main');

        return !error;
    }

    async isAuthenticated(): Promise<boolean> {
        // Simplified for this demo - in a real app, use Supabase Auth session
        return true;
    }
}

export const authService = new AuthService();
