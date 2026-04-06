import { useState, useEffect, useRef, useCallback } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Badge } from "@/components/ui/badge";
import { Maximize2, Minimize2, ChevronRight, TestTube2, AlertCircle, Command, Power, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { MissionSidebar } from "@/components/admin/mission-control/MissionSidebar";
import { MissionImageControl, MissionImageControlHandle } from "@/components/admin/mission-control/MissionImageControl";
import { MissionTestDashboard } from "@/components/admin/mission-control/MissionTestDashboard";
import { FloatingDock } from "@/components/admin/mission-control/FloatingDock";
import { ActivityBar } from "@/components/admin/mission-control/ActivityBar";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const AdminMissionControl = () => {
    return (
        <ActivityLogProvider>
            <div className="h-[calc(100vh-4rem)] bg-[#050505] text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">
                <AdminMissionControlContent />
            </div>
        </ActivityLogProvider>
    );
};

const AdminMissionControlContent = () => {
    // State
    const navigate = useNavigate();
    const [selectedCountry, setSelectedCountry] = useState<'spain' | 'russia'>('spain');
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [isValidatorServerOnline, setIsValidatorServerOnline] = useState<boolean>(false);
    const [questions, setQuestions] = useState<any[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [generatingQuestionId, setGeneratingQuestionId] = useState<string | null>(null);
    const [isTestEnriched, setIsTestEnriched] = useState<boolean>(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const imageControlRef = useRef<MissionImageControlHandle>(null);

    // Stats calculation
    const stats = {
        total: questions.length,
        generated: questions.filter(q => q.is_generated).length,
        published: questions.filter(q => q.is_published).length
    };

    // Initialization
    useEffect(() => {
        checkServerStatus();
        const interval = setInterval(checkServerStatus, 5000); // Poll status faster (5s) for responsiveness
        return () => clearInterval(interval);
    }, []);

    // Load Data
    useEffect(() => {
        if (selectedTestId && isValidatorServerOnline) {
            loadQuestions(selectedTestId, selectedCountry);
        } else {
            setQuestions([]);
        }
    }, [selectedTestId, isValidatorServerOnline, selectedCountry]);

    const loadQuestions = async (testId: string, country: string = 'spain') => {
        try {
            const res = await fetch(`http://localhost:3030/api/test/${testId}/questions?country=${country}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();
            setQuestions(data.questions || []);
            setIsTestEnriched(data.is_enriched ?? true);
        } catch (e) {
            console.error("[MissionControl] Fetch error:", e);
            setQuestions([]);
            setIsTestEnriched(false);
        }
    };

    const checkServerStatus = async () => {
        try {
            const res = await fetch('http://localhost:3030/api/generate/status');
            setIsValidatorServerOnline(res.ok);
        } catch (e) {
            setIsValidatorServerOnline(false);
        }
    };

    // Actions
    const composeId = (tId: string | null, q: any) => {
        if (!tId || !q) return null;
        const extId = q.external_id || q.id;
        if (extId.startsWith(tId)) return extId;
        return `${tId}_${extId}`;
    }

    const currentIndex = questions.findIndex(q => composeId(selectedTestId, q) === selectedQuestionId);

    const handleNext = useCallback(() => {
        if (currentIndex === -1 || currentIndex >= questions.length - 1) return;
        const nextQ = questions[currentIndex + 1];
        setSelectedQuestionId(composeId(selectedTestId, nextQ));
    }, [currentIndex, questions, selectedTestId]);

    const handlePrev = useCallback(() => {
        if (currentIndex <= 0) return;
        const prevQ = questions[currentIndex - 1];
        setSelectedQuestionId(composeId(selectedTestId, prevQ));
    }, [currentIndex, questions, selectedTestId]);

    const handleApprove = async () => {
        if (imageControlRef.current) {
            const success = await imageControlRef.current.approve();
            if (success) {
                if (selectedTestId) loadQuestions(selectedTestId);
                // Slight delay to allow state update?
                setTimeout(() => handleNext(), 100);
            }
        }
    };

    const handleReject = async () => {
        if (imageControlRef.current) await imageControlRef.current.reject();
    };

    const handleRegenerate = async () => {
        if (imageControlRef.current) await imageControlRef.current.regenerate();
    };

    const handleArchive = async () => {
        if (imageControlRef.current && imageControlRef.current.archive) await imageControlRef.current.archive();
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const startReview = () => {
        if (questions.length > 0) {
            const firstPending = questions.find(q => !q.is_published) || questions[0];
            setSelectedQuestionId(composeId(selectedTestId, firstPending));
            toast.info("Starting Review Sequence");
        } else {
            toast.error("No data loaded");
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
            if (!selectedQuestionId) return;

            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Enter') handleApprove();
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (e.key === 'Backspace') e.preventDefault();
                handleReject();
            }
            if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) handleRegenerate();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedQuestionId, handleNext, handlePrev]);


    return (
        <>
            {/* Status Bar */}
            <div className="h-10 border-b border-white/5 bg-[#080808] flex items-center justify-between px-4 select-none backdrop-blur-sm z-50">
                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors cursor-pointer" onClick={() => navigate('/admin')}>
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span className="font-mono tracking-wider">ADMIN</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-zinc-800" />

                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 group hover:bg-white/5 px-2 py-0.5 rounded transition-colors"
                    >
                        <Command className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" />
                        <span className="font-mono tracking-wider text-zinc-500 group-hover:text-white transition-colors">SEARCH</span>
                        <span className="text-[9px] bg-white/5 text-zinc-600 px-1 rounded border border-white/5 opacity-50 group-hover:opacity-100 transition-opacity">⌘K</span>
                    </button>

                    <ChevronRight className="w-3 h-3 text-zinc-800" />

                    <div className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors cursor-pointer" onClick={() => setSelectedTestId(null)}>
                        <TestTube2 className="w-3.5 h-3.5" />
                        <span className="font-mono tracking-wider">TESTS</span>
                    </div>
                    {selectedTestId && (
                        <>
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                            <span className={cn("font-medium transition-colors cursor-pointer", !selectedQuestionId ? "text-blue-400" : "text-zinc-400 hover:text-white")} onClick={() => setSelectedQuestionId(null)}>
                                {selectedTestId}
                            </span>
                        </>
                    )}
                    {selectedQuestionId && (
                        <>
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                            <Badge variant="outline" className="h-5 bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[10px] px-1.5">
                                INDEX {currentIndex + 1}/{questions.length}
                            </Badge>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Country Switcher */}
                    <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5">
                        <button
                            onClick={() => { setSelectedCountry('spain'); setSelectedTestId(null); }}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-[10px] font-bold tracking-wider",
                                selectedCountry === 'spain' ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <span className="text-xs">🇪🇸</span>
                            SPAIN
                        </button>
                        <button
                            onClick={() => { setSelectedCountry('russia'); setSelectedTestId(null); }}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-[10px] font-bold tracking-wider",
                                selectedCountry === 'russia' ? "bg-white/10 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <span className="text-xs">🇷🇺</span>
                            RUSSIA
                        </button>
                    </div>

                    <div className={cn("flex items-center gap-2 text-[10px] font-mono tracking-wider uppercase transition-colors", isValidatorServerOnline ? "text-emerald-500" : "text-rose-500")}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isValidatorServerOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]")} />
                        {isValidatorServerOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                    </div>

                    {!isValidatorServerOnline && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400 bg-transparent"
                            onClick={() => {
                                toast("Initializing System...", { description: "Please ensure 'npm run validator' is running in terminal." });
                                // In a real scenario, this might trigger a server restart endpoint if reachable
                                checkServerStatus();
                            }}
                        >
                            <Power className="w-3 h-3 mr-1.5" />
                            IGNITION
                        </Button>
                    )}

                    <button onClick={toggleFullscreen} className="text-zinc-600 hover:text-white transition-colors">
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Layout */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Sidebar */}
                <ResizablePanel defaultSize={18} minSize={15} maxSize={25} className="border-r border-white/5 bg-[#050505]">
                    <MissionSidebar
                        onSelectTest={setSelectedTestId}
                        onSelectQuestion={(id) => setSelectedQuestionId(id)}
                        selectedTestId={selectedTestId}
                        selectedQuestionId={selectedQuestionId}
                        selectedCountry={selectedCountry}
                        serverOnline={isValidatorServerOnline}
                        questions={questions}
                        generatingQuestionId={generatingQuestionId}
                        isSearchOpen={isSearchOpen}
                        onSearchOpenChange={setIsSearchOpen}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-transparent hover:bg-white/10 w-1 transition-colors" />

                {/* Main Viewport */}
                <ResizablePanel defaultSize={82} className="relative bg-[#09090b]">
                    {!selectedTestId ? (
                        /* IDLE STATE: SYSTEM OVERVIEW */
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <div
                                className="absolute inset-0 opacity-[0.03]"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                                    backgroundSize: "36px 36px",
                                }}
                            />
                            <div className="text-center space-y-6 relative z-10 p-8">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8 }}
                                    className="p-8 rounded-full bg-blue-500/5 border border-blue-500/10 inline-flex items-center justify-center mb-4"
                                >
                                    <TestTube2 className="w-16 h-16 text-blue-500/50" />
                                </motion.div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white tracking-widest uppercase mb-2">System Idle</h2>
                                    <p className="text-zinc-500 max-w-md mx-auto">Select a test module from the sidebar to initialize Mission Control sequence.</p>
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900/50 border border-white/5 text-xs font-mono text-zinc-500">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>Waiting for user input...</span>
                                </div>
                            </div>
                        </div>
                    ) : !selectedQuestionId ? (
                        /* TEST DASHBOARD */
                        <MissionTestDashboard
                            testId={selectedTestId}
                            serverOnline={isValidatorServerOnline}
                            stats={stats}
                            onStartReview={startReview}
                            isEnriched={isTestEnriched}
                        />
                    ) : (
                        /* REVIEW VIEW */
                        <div className="bg-[#050505] relative h-full">
                            <MissionImageControl
                                ref={imageControlRef}
                                questionId={selectedQuestionId}
                                serverOnline={isValidatorServerOnline}
                                onGenerationStart={() => setGeneratingQuestionId(selectedQuestionId)}
                                onGenerationEnd={() => setGeneratingQuestionId(null)}
                            />
                        </div>
                    )}

                    {/* Floating Dock Overlay */}
                    {selectedQuestionId && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
                            <FloatingDock
                                hasSelection={!!selectedQuestionId}
                                onNext={handleNext}
                                onPrev={handlePrev}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onArchive={handleArchive}
                                onRegenerate={handleRegenerate}
                            />
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
            <ActivityBar />
        </>
    );
};
