import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Languages, Rocket, Image as ImageIcon, FileText, CheckCircle2, Play, Eye, Loader2, RefreshCw, Cpu, Database, Activity, Zap, Layers, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface MissionTestDashboardProps {
    testId: string;
    serverOnline: boolean;
    stats: {
        total: number;
        generated: number;
        published: number;
    };
    onStartReview: () => void;
    isEnriched?: boolean;
}

export const MissionTestDashboard = ({ testId, serverOnline, stats, onStartReview, isEnriched = true }: MissionTestDashboardProps) => {
    const { addLog } = useActivityLog();
    const [isProcessing, setIsProcessing] = useState(false);
    const [localProcessing, setLocalProcessing] = useState(false);
    const [activeTaskType, setActiveTaskType] = useState<'generate' | 'enrich' | null>(null);
    const [processLog, setProcessLog] = useState<string | null>(null);

    // Poll for STATUS (Enrichment only for now)
    useEffect(() => {
        const checkStatus = async () => {
            if (!serverOnline) return;
            try {
                // Poll correct endpoint based on task
                const endpoint = activeTaskType === 'generate'
                    ? 'http://localhost:3030/api/generate/status'
                    : 'http://localhost:3030/api/enrich/status';

                const res = await fetch(endpoint);
                const data = await res.json();

                if (data.isRunning) {
                    if (!localProcessing) setLocalProcessing(true);

                    // Auto-detect task type if we just refreshed page
                    if (!activeTaskType) {
                        setActiveTaskType(endpoint.includes('generate') ? 'generate' : 'enrich');
                    }

                    setProcessLog(typeof data.latestLog === 'string' ? data.latestLog : JSON.stringify(data.latestLog));
                } else {
                    // If we were processing but now stopped
                    if ((activeTaskType === 'generate' && endpoint.includes('generate')) ||
                        (activeTaskType === 'enrich' && endpoint.includes('enrich'))) {

                        setLocalProcessing(false);
                        setActiveTaskType(null);
                        setProcessLog(typeof data.latestLog === 'string' ? data.latestLog : JSON.stringify(data.latestLog)); // Final message

                        toast.info("Process Finished");
                        // Optionally reload
                        // window.location.reload(); 
                    }
                }
            } catch (e) {
                console.error("Status poll error:", e);
            }
        };

        const interval = setInterval(checkStatus, 1000);
        checkStatus(); // Initial check
        return () => clearInterval(interval);
    }, [serverOnline, activeTaskType, localProcessing]);

    // BATCH GENERATE (with AUTO-SYNC)
    const handleBatchGenerate = async () => {
        if (!serverOnline) {
            toast.error("Validator Server Offline. Run 'npm run validator'");
            return;
        }

        setIsProcessing(true);
        setLocalProcessing(true);
        setActiveTaskType('generate');

        // АРХИТЕКТУРА: Auto-sync duplicates BEFORE generating to avoid waste
        addLog(`🔄 Pre-flight sync: checking for duplicate images...`, 'info');
        toast.info("Syncing existing images first...", { duration: 2000 });

        try {
            const syncRes = await fetch(`http://localhost:3030/api/test/${testId}/sync-images`, { method: 'POST' });
            if (syncRes.ok) {
                const syncData = await syncRes.json();
                addLog(`✅ Synced ${syncData.copied} images from other tests`, 'success');
                if (syncData.copied > 0) {
                    toast.success(`Found ${syncData.copied} existing images!`);
                }
            }
        } catch (e) {
            addLog(`⚠️ Sync failed, continuing with generation: ${e}`, 'warn');
        }

        addLog(`Starting batch generation for ${testId}...`, 'info');

        try {
            toast.info("Mission Start: Batch Generation Init...");

            // Extract category from testId (e.g. topic-02 from topic-02_test-006)
            const category = testId.split('_')[0];

            await fetch('http://localhost:3030/api/generate/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testId,
                    category,
                    forceRegenerate: false
                })
            });

            addLog("Batch command sent to server.", 'success');
            toast.success("Batch Generation Started (Server-Side)");

            // Polling will take over
        } catch (e) {
            console.error(e);
            addLog(`Batch start failed: ${e}`, 'error');
            setLocalProcessing(false);
            setIsProcessing(false);
            setActiveTaskType(null);
        }
    };

    // BATCH ENRICH
    const handleBatchEnrich = async () => {
        if (!serverOnline) {
            toast.error("Validator Server Offline");
            return;
        }

        setLocalProcessing(true);
        setActiveTaskType('enrich');
        addLog(`Igniting Enrichment Sequence for ${testId}...`, 'info');

        try {
            const res = await fetch(`http://localhost:3030/api/enrich/all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filter: testId })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                addLog(`Enrichment Initiated. Check logs.`, 'success');
                toast.success("Enrichment Background Process Started");
                // The polling effect will take over updating state
            } else {
                throw new Error(data.error || "Unknown server error");
            }
        } catch (e: any) {
            addLog(`Enrichment failed: ${e.message}`, 'error');
            toast.error(`Enrichment Error: ${e.message}`);
            setLocalProcessing(false);
            setActiveTaskType(null);
        }
    };

    // DEPLOY
    const handleDeploy = async () => {
        if (!serverOnline) return toast.error("Server Offline");

        setLocalProcessing(true);
        addLog(`Deploying test ${testId} to Production...`, 'warn');

        try {
            const res = await fetch(`http://localhost:3030/api/db/deploy-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testId })
            });
            const data = await res.json();

            if (res.ok) {
                addLog(`Deployment Successful: ${data.deployed} questions live.`, 'success');
                toast.success("Rocket Launched! Test is live on Supabase.");
                setTimeout(() => window.location.reload(), 2000);
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            addLog(`Deploy failed: ${e.message}`, 'error');
            toast.error(`Deploy Failed: ${e.message}`);
        } finally {
            setLocalProcessing(false);
        }
    };

    // SYNC
    const handleSyncImages = async () => {
        if (!serverOnline) return;
        setLocalProcessing(true);
        addLog("Syncing duplicates...", 'info');
        try {
            const res = await fetch(`http://localhost:3030/api/test/${testId}/sync-images`, { method: 'POST' });
            const data = await res.json();
            toast.success(`Synced ${data.copied} images from other tests`);
            setTimeout(() => window.location.reload(), 1000);
        } catch (e) {
            toast.error("Sync failed");
        } finally {
            setLocalProcessing(false);
        }
    };

    const handleStopProcess = () => {
        setLocalProcessing(false);
        setIsProcessing(false);
        setActiveTaskType(null);
        addLog("Process interrupted by user.", 'warn');
    };

    const handleStopEnrichment = async () => {
        try {
            await fetch('http://localhost:3030/api/enrich/stop', { method: 'POST' });
            toast.info("Stop signal sent.");
            setLocalProcessing(false);
            setActiveTaskType(null);
        } catch (e) {
            console.error(e);
        }
    };

    // UI Metrics
    // Fallback if image_ready is not yet passed (during transition)
    const generatedCount = (stats as any).image_ready ?? stats.generated;

    const completionRate = stats.total > 0 ? (generatedCount / stats.total) * 100 : 0;
    const deploymentRate = stats.total > 0 ? (stats.published / stats.total) * 100 : 0;
    const isReadyForDeploy = generatedCount >= stats.total;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { y: 10, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="h-full bg-[#050505] p-6 overflow-y-auto custom-scrollbar relative">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-[#050505] to-[#050505] pointer-events-none" />

            <div className="max-w-6xl mx-auto space-y-6 relative z-10">

                {/* Compact Header */}
                <div className="flex items-end justify-between border-b border-white/5 pb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                                Unit {testId.split('_')[1] || '00'}
                            </Badge>
                            {!serverOnline && <Badge variant="destructive" className="h-4 text-[9px] px-1">OFFLINE</Badge>}
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight leading-none">
                            {testId.replace(/_/g, ' ').toUpperCase()}
                        </h1>
                    </div>
                </div>

                {/* Metrics Row (Compact) */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    {/* Dataset */}
                    <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total Items</div>
                                <div className="text-2xl font-mono text-white">{stats.total}</div>
                            </div>
                        </div>
                    </div>

                    {/* Coverage */}
                    <div className="bg-zinc-900/40 border border-blue-500/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 h-1 bg-blue-500/20 w-full">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${completionRate}%` }} />
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-blue-400/60 font-bold">Image Ready</div>
                                <div className="text-2xl font-mono text-white">
                                    {generatedCount} <span className="text-sm text-zinc-600">/ {stats.total}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-blue-500">{completionRate.toFixed(0)}%</div>
                        </div>
                    </div>

                    {/* Production */}
                    <div className="bg-zinc-900/40 border border-emerald-500/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/20 w-full">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${deploymentRate}%` }} />
                        </div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                <Rocket className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase tracking-wider text-emerald-400/60 font-bold">In Production</div>
                                <div className="text-2xl font-mono text-white">
                                    {stats.published} <span className="text-sm text-zinc-600">live</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-emerald-500">{deploymentRate.toFixed(0)}%</div>
                        </div>
                    </div>
                </motion.div>

                {/* Command Deck (Modern Horizontal List) */}
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Command Operations</h3>
                    </div>

                    {/* 1. Generator Module */}
                    <motion.div variants={item} className="group relative bg-[#09090b] border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-1 transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-lg bg-zinc-900/30">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">Image Synthesis</h4>
                                    <p className="text-sm text-zinc-400">
                                        {activeTaskType === 'generate' && processLog ? (
                                            <span className="text-indigo-400 font-mono animate-pulse">{processLog}</span>
                                        ) : "Gen-2.0 Neural Engine"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    onClick={handleSyncImages}
                                    variant="outline"
                                    className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white h-10 px-4"
                                    disabled={localProcessing}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" /> Sync
                                </Button>
                                <Button
                                    onClick={handleBatchGenerate}
                                    disabled={localProcessing}
                                    className={cn(
                                        "h-10 px-6 font-bold shadow-[0_0_20px_rgba(79,70,229,0.1)] transition-all hover:scale-105 active:scale-95",
                                        isProcessing
                                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/50"
                                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                    )}
                                >
                                    {isProcessing ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> PROCESSING ({activeTaskType})</>
                                    ) : (
                                        <><Play className="w-4 h-4 mr-2 fill-current" /> GENERATE BATCH</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                    {/* 2. Enrichment Module */}
                    <motion.div variants={item} className="group relative bg-[#09090b] border border-zinc-800 hover:border-amber-500/50 rounded-xl p-1 transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-lg bg-zinc-900/30">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                    <Languages className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-2">Neural Translation</h4>
                                    <p className="text-sm text-zinc-400 leading-relaxed min-h-[40px]">
                                        {activeTaskType === 'enrich' && processLog ? (
                                            <span className="font-mono text-xs text-amber-400 block p-2 bg-black/50 rounded border border-amber-500/20">
                                                <Loader2 className="w-3 h-3 inline mr-2 animate-spin" />
                                                {processLog}
                                            </span>
                                        ) : !isEnriched
                                            ? "Required: Translate and enrich raw data structures."
                                            : "All data is enriched and ready for production."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {activeTaskType === 'enrich' && (
                                    <Button
                                        onClick={handleStopEnrichment}
                                        variant="destructive"
                                        className="h-10 px-4 font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                                    >
                                        <AlertCircle className="w-4 h-4 mr-2" /> STOP
                                    </Button>
                                )}
                                <Button
                                    onClick={handleBatchEnrich}
                                    disabled={activeTaskType === 'enrich'}
                                    className={cn(
                                        "h-10 px-6 font-bold transition-all hover:scale-105 active:scale-95",
                                        !isEnriched && activeTaskType !== 'enrich'
                                            ? "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                                    )}
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    {activeTaskType === 'enrich' ? "PROCESSING..." : !isEnriched ? "START ENRICHMENT" : "RE-ENRICH DATA"}
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3. Deployment Module */}
                    <motion.div variants={item} className={cn(
                        "group relative bg-[#09090b] border rounded-xl p-1 transition-all duration-300",
                        !isReadyForDeploy ? "border-zinc-800 opacity-80" : "border-emerald-900/50 hover:border-emerald-500/50"
                    )}>
                        <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-lg bg-zinc-900/30">
                            <div className="flex items-center gap-4 flex-1">
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                                    isReadyForDeploy ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-600"
                                )}>
                                    <Rocket className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className={cn("text-base font-bold transition-colors", isReadyForDeploy ? "text-white group-hover:text-emerald-500" : "text-zinc-500")}>
                                        Production Deploy
                                    </h4>
                                    <p className="text-sm text-zinc-400">
                                        {!isReadyForDeploy ? `${stats.total - generatedCount} images missing` : "Ready for launch"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    onClick={handleDeploy}
                                    disabled={!isReadyForDeploy || localProcessing}
                                    className={cn(
                                        "h-10 px-8 font-bold transition-all hover:scale-105 active:scale-95 shadow-lg",
                                        !isReadyForDeploy
                                            ? "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed"
                                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20"
                                    )}
                                >
                                    {localProcessing ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> DEPLOYING...</>
                                    ) : !isReadyForDeploy ? (
                                        <><AlertCircle className="w-4 h-4 mr-2" /> NOT READY</>
                                    ) : (
                                        <><Rocket className="w-4 h-4 mr-2" /> LAUNCH TO PROD</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                </motion.div>

                <div className="flex justify-center pt-8 opacity-30 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-4 text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
                        <span>System v2.5</span>
                        <span>•</span>
                        <span>Secure Connection</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
