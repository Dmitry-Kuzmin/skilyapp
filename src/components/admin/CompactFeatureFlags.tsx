import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface AppConfig {
    key: string;
    value: boolean | string | { enabled: boolean };
}

export function CompactFeatureFlags() {
    const queryClient = useQueryClient();

    const { data: flags, isLoading } = useQuery({
        queryKey: ['app-config'],
        queryFn: async () => {
            const { data } = await supabase.from('app_config').select('key, value').order('key');
            return data as AppConfig[];
        },
    });

    const toggleFlag = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
            const { error } = await supabase.rpc('update_app_config', { config_key: key, config_value: value as any });
            if (error) throw error;
        },
        onSuccess: (_, { key, value }) => {
            queryClient.invalidateQueries({ queryKey: ['app-config'] });
            // Broadcast for immediate UI update across tabs/components
            window.dispatchEvent(new CustomEvent('feature-flag-updated', { detail: { key, value } }));
            toast.success(`${key} ${value ? 'enabled' : 'disabled'}`);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const getValue = (f: AppConfig) => {
        if (typeof f.value === 'boolean') return f.value;
        if (typeof f.value === 'object' && 'enabled' in f.value) return f.value.enabled;
        return f.value === 'true';
    };

    if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="rounded-xl border border-white/5 bg-zinc-900/30 overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">System Flags</span>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">LIVE</div>
            </div>
            <div className="divide-y divide-white/5">
                {flags?.map((flag) => {
                    const isOn = getValue(flag);
                    return (
                        <div key={flag.key} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors group">
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-xs font-mono font-medium transition-colors",
                                    isOn ? "text-zinc-300" : "text-zinc-500"
                                )}>
                                    {flag.key}
                                </span>
                            </div>
                            <Switch
                                checked={isOn}
                                onCheckedChange={(c) => toggleFlag.mutate({ key: flag.key, value: c })}
                                disabled={toggleFlag.isPending}
                                className={cn(
                                    "scale-75 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-zinc-700",
                                    "transition-all duration-300"
                                )}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
