import { useState, useEffect, useRef, useCallback } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Maximize2, Minimize2, Rocket, Sparkles, ChevronRight, TestTube2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MissionSidebar } from "@/components/admin/mission-control/MissionSidebar";
import { MissionEditor } from "@/components/admin/mission-control/MissionEditor";
import { MissionImageControl, MissionImageControlHandle } from "@/components/admin/mission-control/MissionImageControl";
import { MissionTestDashboard } from "@/components/admin/mission-control/MissionTestDashboard";
import { FloatingDock } from "@/components/admin/mission-control/FloatingDock";
import { ActivityBar } from "@/components/admin/mission-control/ActivityBar";
import { ActivityLogProvider } from "@/contexts/ActivityLogContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const AdminMissionControl = () => {
    return (
        <ActivityLogProvider>
            <AdminMissionControlContent />
        </ActivityLogProvider>
    );
};

const AdminMissionControlContent = () => {
    // State
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    // ... rest of state (keep existing)
    const [isValidatorServerOnline, setIsValidatorServerOnline] = useState<boolean>(false);
    const [questions, setQuestions] = useState<any[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const imageControlRef = useRef<MissionImageControlHandle>(null);
    // ...


    // Derived stats
    const stats = {
        total: questions.length,
        generated: questions.filter(q => q.is_generated).length,
        published: questions.filter(q => q.is_published).length
    };

    // Check validation server on mount
    useEffect(() => {
        checkServerStatus();
    }, []);

    // Load questions when test changes
    useEffect(() => {
        if (selectedTestId && isValidatorServerOnline) {
            loadQuestions(selectedTestId);
        }
    }, [selectedTestId, isValidatorServerOnline]);

    const [isTestEnriched, setIsTestEnriched] = useState<boolean>(true);

    const loadQuestions = async (testId: string) => {
        try {
            console.log(`[Admin] Fetching questions for test: ${testId}`);
            const res = await fetch(`http://localhost:3030/api/test/${testId}/questions`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();
            setQuestions(data.questions || []);
            setIsTestEnriched(data.is_enriched ?? true);
        } catch (e) {
            console.error("[Admin] Error loading questions:", e);
            setQuestions([]);
            setIsTestEnriched(false);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const checkServerStatus = async () => {
        try {
            const res = await fetch('http://localhost:3030/api/generate/status');
            if (res.ok) {
                setIsValidatorServerOnline(true);
            } else {
                setIsValidatorServerOnline(false);
            }
        } catch (e) {
            setIsValidatorServerOnline(false);
        }
    };

    // Navigation Logic
    const currentIndex = questions.findIndex(q => `${selectedTestId}_${q.external_id}` === selectedQuestionId);

    // Auto-Scroll Sidebar to selected item
    useEffect(() => {
        if (selectedQuestionId && !isSidebarCollapsed) {
            // We could dispatch event or use context, but for now sidebar handles its own scrolling if we passed the ID down
        }
        // Force focus mode logic: 
        // If question selected -> maybe collapse sidebar?
        // User requested: "Step 3: Validation Mode... hide sidebar"
        if (selectedQuestionId && !isSidebarCollapsed) {
            // Optional: setIsSidebarCollapsed(true);
        }
    }, [selectedQuestionId]);


    const handleNext = useCallback(() => {
        if (currentIndex === -1 || currentIndex >= questions.length - 1) return;
        const nextQ = questions[currentIndex + 1];
        setSelectedQuestionId(`${selectedTestId}_${nextQ.external_id}`);
    }, [currentIndex, questions, selectedTestId]);

    const handlePrev = useCallback(() => {
        if (currentIndex <= 0) return;
        const prevQ = questions[currentIndex - 1];
        setSelectedQuestionId(`${selectedTestId}_${prevQ.external_id}`);
    }, [currentIndex, questions, selectedTestId]);

    const handleApprove = async () => {
        if (imageControlRef.current) {
            const success = await imageControlRef.current.approve();
            if (success) {
                if (selectedTestId) loadQuestions(selectedTestId); // Refresh data
                handleNext();
            }
        }
    };

    const handleReject = async () => {
        if (imageControlRef.current) {
            await imageControlRef.current.reject();
        }
    };

    const handleRegenerate = async () => {
        if (imageControlRef.current) {
            await imageControlRef.current.regenerate();
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only if no input focused (except body)
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (!selectedQuestionId) return;

            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Enter') handleApprove();
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Prevent back navigation on Backspace
                if (e.key === 'Backspace') e.preventDefault();
                handleReject();
            }
            if (e.key === 'r' || e.key === 'R') {
                if (!e.metaKey && !e.ctrlKey) handleRegenerate();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedQuestionId, handleNext, handlePrev]);


    const startReview = () => {
        if (questions.length > 0) {
            // Find first starting point (e.g. not published?)
            const firstPending = questions.find(q => !q.is_published) || questions[0];
            setSelectedQuestionId(`${selectedTestId}_${firstPending.external_id}`);
            setIsSidebarCollapsed(true); // Enter focus mode
            toast.info("Starting Review Mode", { description: "Sidebar collapsed for focus" });
        } else {
            toast.error("No questions loaded");
        }
    };

    return (
        <div className={isFullscreen ? "fixed inset-0 z-10 bg-[#09090b] flex flex-col" : "h-[calc(100vh-4rem)] flex flex-col bg-[#09090b]"}>
            {/* Header / Sub-nav - Minimalist */}
            <div className="flex-shrink-0 border-b border-zinc-800 px-6 py-2 flex justify-between items-center bg-[#09090b]">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm select-none">
                    <div className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer" onClick={() => setSelectedTestId(null)}>
                        <TestTube2 className="w-4 h-4" />
                        <span className="font-medium">Tests</span>
                    </div>
                    {selectedTestId && (
                        <>
                            <ChevronRight className="w-4 h-4 text-zinc-800" />
                            <span
                                className={cn("font-medium cursor-pointer hover:text-white transition-colors", !selectedQuestionId ? "text-white" : "text-zinc-500")}
                                onClick={() => setSelectedQuestionId(null)}
                            >
                                {selectedTestId}
                            </span>
                        </>
                    )}
                    {selectedQuestionId && (
                        <>
                            <ChevronRight className="w-4 h-4 text-zinc-800" />
                            <Badge variant="outline" className="text-blue-400 border-blue-900/50 bg-blue-900/10 font-mono">
                                {currentIndex + 1} / {questions.length}
                            </Badge>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className={cn(
                        "flex items-center gap-2 text-[10px] font-medium transition-colors",
                        isValidatorServerOnline ? "text-emerald-500" : "text-rose-500"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isValidatorServerOnline ? "bg-emerald-500" : "bg-rose-500")} />
                        {isValidatorServerOnline ? 'API Connected' : 'API Offline'}
                    </div>

                    <button
                        onClick={() => toggleFullscreen()}
                        className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                        title="Focus Mode"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <ResizablePanelGroup direction="horizontal" className="flex-1 relative">

                {/* Sidebar - Always Visible */}
                <ResizablePanel
                    defaultSize={20}
                    minSize={15}
                    maxSize={25}
                    className="border-r border-zinc-800 bg-zinc-950/30"
                >
                    <MissionSidebar
                        onSelectTest={setSelectedTestId}
                        onSelectQuestion={(id) => setSelectedQuestionId(id)}
                        selectedTestId={selectedTestId}
                        selectedQuestionId={selectedQuestionId}
                        serverOnline={isValidatorServerOnline}
                        questions={questions}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle className="bg-zinc-800" />

                {/* Content Area */}
                <ResizablePanel defaultSize={80}>
                    {selectedTestId && !selectedQuestionId ? (
                        // Show Test Dashboard
                        <MissionTestDashboard
                            testId={selectedTestId}
                            serverOnline={isValidatorServerOnline}
                            stats={stats}
                            onStartReview={startReview}
                            isEnriched={isTestEnriched}
                        />
                    ) : (
                        // Split View (Image | Editor)
                        <ResizablePanelGroup direction="horizontal">

                            {/* Left: Visuals (Image) */}
                            <ResizablePanel defaultSize={50} minSize={30} className="bg-[#09090b] relative border-r border-zinc-900">
                                {selectedQuestionId ? (
                                    <MissionImageControl
                                        ref={imageControlRef}
                                        questionId={selectedQuestionId}
                                        serverOnline={isValidatorServerOnline}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-zinc-700 font-mono text-sm">
                                        SELECT A QUESTION
                                    </div>
                                )}
                            </ResizablePanel>

                            <ResizableHandle withHandle className="bg-zinc-800" />

                            {/* Right: Content (Editor) */}
                            <ResizablePanel defaultSize={50} minSize={30} className="bg-[#09090b]">
                                {selectedQuestionId ? (
                                    <MissionEditor
                                        questionId={selectedQuestionId}
                                        serverOnline={isValidatorServerOnline}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center border-l border-zinc-800">
                                        <span className="text-zinc-700 font-mono text-sm">EDITOR STANDBY</span>
                                    </div>
                                )}
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    )}

                    {/* FLOATING DOCK - Bottom Center */}
                    {selectedQuestionId && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
                            <FloatingDock
                                hasSelection={!!selectedQuestionId}
                                onNext={handleNext}
                                onPrev={handlePrev}
                                onApprove={handleApprove}
                                onReject={handleReject}
                                onRegenerate={handleRegenerate}
                            />
                        </div>
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>

            <ActivityBar />
        </div>
    );
};
