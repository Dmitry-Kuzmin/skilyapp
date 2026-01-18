import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Languages, Rocket, Image as ImageIcon, FileText, CheckCircle2, AlertTriangle, Play, Eye, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActivityLog } from "@/contexts/ActivityLogContext";

interface MissionTestDashboardProps {
    testId: string;
    serverOnline: boolean;
    stats?: {
        total: number;
        generated: number;
        published: number;
    };
    onStartReview?: () => void;
    isEnriched?: boolean;
}

export function MissionTestDashboard({ testId, serverOnline, stats = { total: 0, generated: 0, published: 0 }, onStartReview, isEnriched = true }: MissionTestDashboardProps) {
    const { addLog, setIsProcessing, isProcessing } = useActivityLog(); // Global log
    const [localProcessing, setLocalProcessing] = useState(false); // Local lock

    const handleBatchGenerate = async () => {
        if (!serverOnline) {
            addLog("Validator server is offline", 'error');
            return toast.error("Validator server is offline");
        }

        setLocalProcessing(true);
        // We still set global isProcessing for top-bar indication, but we won't disable buttons purely on it if we want concurrency.
        // But for clarity, let's keep global synced but use local for disabling.
        setIsProcessing(true);

        addLog(`Starting batch generation for test: ${testId}`, 'info');

        try {
            await fetch('http://localhost:3030/api/generate/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: testId.split('_')[0], testId: testId })
            });

            addLog(`Batch generation triggered for ${stats.total} items. Watching for updates...`, 'success');
            setTimeout(() => {
                addLog(`Batch Process: ~5% complete (Simulated)`, 'loading');
                setLocalProcessing(false); // Unlock local after trigger
                setIsProcessing(false);
            }, 3000);

        } catch (e) {
            addLog(`Failed to start generation: ${e}`, 'error');
            setLocalProcessing(false);
            setIsProcessing(false);
        }
    };

    const handleBatchEnrich = async () => {
        if (!serverOnline) return toast.error("Validator server is offline");

        setLocalProcessing(true);
        addLog("Starting text enrichment task...", 'info');

        try {
            await fetch('http://localhost:3030/api/enrich/all', { method: 'POST' });
            addLog("Enrichment task started successfully", 'success');
        } catch (e) {
            addLog("Enrichment failed to start", 'error');
        } finally {
            setLocalProcessing(false);
        }
    };

    const handleDeploy = async () => {
        if (!serverOnline) return toast.error("Validator server is offline");
        if (stats.generated === 0) return toast.error("No generated images to deploy");

        setLocalProcessing(true);
        addLog(`Starting deployment of ${stats.generated} questions to Supabase...`, 'info');

        try {
            const res = await fetch('http://localhost:3030/api/db/deploy-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testId })
            });

            if (res.ok) {
                const data = await res.json();
                addLog(`✅ Deployed ${data.deployed || 0} questions successfully!`, 'success');
                toast.success(`Deployed ${data.deployed || 0} questions to production`);
            } else {
                throw new Error('Deploy failed');
            }
        } catch (e) {
            addLog(`Deploy error: ${e}`, 'error');
            toast.error("Failed to deploy questions");
        } finally {
            setLocalProcessing(false);
        }
    };

    const handleSyncImages = async () => {
        if (!serverOnline) return toast.error("Validator server is offline");

        setLocalProcessing(true);
        addLog("Syncing duplicates from other tests...", 'info');

        try {
            const res = await fetch(`http://localhost:3030/api/test/${testId}/sync-images`, { method: 'POST' });
            const data = await res.json();

            if (data.synced > 0) {
                addLog(`✅ Synced ${data.synced} images from other tests!`, 'success');
                toast.success(`Restored ${data.synced} images`);
                // Trigger refresh if possible (parent usually handles polling or we can force reload logic)
            } else {
                addLog("No duplicates found to sync.", 'info');
                toast.info("No duplicates found");
            }
        } catch (e) {
            addLog("Sync failed", 'error');
        } finally {
            setLocalProcessing(false);
        }
    };

    return (
        <div className="h-full bg-zinc-950 p-8 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header with Review Action */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-blue-400 border-blue-400/30 uppercase tracking-widest text-[10px]">Test Control Panel</Badge>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">{testId.toUpperCase()}</h1>
                        <p className="text-zinc-400 mt-1">Manage generation, enrichment, and deployment for this test module.</p>
                    </div>

                    {/* Primary Action */}
                    <div className="flex items-center gap-4">
                        <Button
                            size="lg"
                            className="h-12 px-8 rounded-full bg-white text-black hover:bg-zinc-200 font-bold shadow-2xl shadow-white/10"
                            onClick={onStartReview}
                        >
                            <Eye className="w-5 h-5 mr-2" /> Start Review
                        </Button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Total Questions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500">AI Candidates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-emerald-400 flex items-center gap-2">
                                {stats.generated}
                                <span className="text-sm font-normal text-zinc-600">items</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 mt-3 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(stats.generated / (stats.total || 1)) * 100}%` }} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Ready to Deploy</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-400">{stats.published}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions Section Title */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Batch Operations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Batch Generation & Sync */}
                        <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/50 transition-all p-6 hover:bg-zinc-900/60">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Sparkles className="w-32 h-32 text-indigo-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/20">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-semibold text-white mb-1">Generate Images</h3>
                                <p className="text-sm text-zinc-400 mb-6 flex-1">
                                    Run AI generation or sync existing duplicates.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        onClick={handleSyncImages}
                                        disabled={localProcessing}
                                        variant="outline"
                                        className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" /> Sync Duplicates
                                    </Button>
                                    <Button
                                        onClick={handleBatchGenerate}
                                        disabled={localProcessing}
                                        variant="secondary"
                                        className={cn(
                                            "w-full bg-zinc-800 transition-colors border border-zinc-700",
                                            isProcessing ? "border-indigo-500/50 text-indigo-400" : "hover:bg-indigo-600 hover:text-white hover:border-indigo-500"
                                        )}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Batch Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 mr-2 fill-current" /> Run Batch AI
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Text Enrichment */}
                        <div className={cn(
                            "group relative overflow-hidden rounded-2xl border transition-all p-6",
                            !isEnriched
                                ? "bg-amber-950/20 border-amber-500/50 hover:bg-amber-900/30"
                                : "bg-zinc-900/40 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/60"
                        )}>
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FileText className="w-32 h-32 text-amber-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 text-amber-400 border border-amber-500/20">
                                    <Languages className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-semibold text-white mb-1">
                                    {!isEnriched ? "⚠️ Enrichement Required" : "Enrich Texts"}
                                </h3>
                                <p className="text-sm text-zinc-400 mb-6 flex-1">
                                    {!isEnriched
                                        ? "This test has not been enriched yet. Run this process first to prepare data."
                                        : "Translate and optimize text without generating images."
                                    }
                                </p>
                                <Button
                                    onClick={handleBatchEnrich}
                                    variant={!isEnriched ? "default" : "secondary"}
                                    className={cn(
                                        "w-full transition-colors border",
                                        !isEnriched
                                            ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-500"
                                            : "bg-zinc-800 hover:bg-amber-600 hover:text-white border-zinc-700 hover:border-amber-500"
                                    )}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" /> Start Enrichment
                                </Button>
                            </div>
                        </div>

                        {/* Deploy */}
                        <div className="group relative overflow-hidden rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/50 transition-all p-6 hover:bg-zinc-900/60">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Rocket className="w-32 h-32 text-emerald-500" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-semibold text-white mb-1">Deploy to Supabase</h3>
                                <p className="text-sm text-zinc-400 mb-6 flex-1">
                                    Publish {stats.generated} approved items to live production.
                                </p>
                                <Button
                                    onClick={handleDeploy}
                                    disabled={stats.generated === 0 || localProcessing}
                                    variant="secondary"
                                    className="w-full bg-zinc-800 hover:bg-emerald-600 hover:text-white transition-colors border border-zinc-700 hover:border-emerald-500 disabled:opacity-50"
                                >
                                    {localProcessing ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</>
                                    ) : (
                                        <><Rocket className="w-4 h-4 mr-2" /> Deploy All</>
                                    )}
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
