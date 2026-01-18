
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Sparkles,
    Image as ImageIcon,
    Edit2,
    X,
    Maximize2,
    Trash2,
    Check,
    UploadCloud,
    Plus
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useActivityLog } from "@/contexts/ActivityLogContext";
import { cn } from "@/lib/utils";
import { useDropzone } from "react-dropzone";

interface MissionImageControlProps {
    questionId: string;
    serverOnline: boolean;
    onImageReady?: () => void;
}

export interface MissionImageControlHandle {
    approve: () => Promise<boolean>;
    regenerate: () => Promise<void>;
    reject: () => Promise<void>;
}

interface Candidate {
    filename: string;
    path: string;
    url: string;
    timestamp: number;
    isMain: boolean;
}

export const MissionImageControl = forwardRef<MissionImageControlHandle, MissionImageControlProps>(
    ({ questionId, serverOnline, onImageReady }, ref) => {
        const { addLog } = useActivityLog();
        const [originalUrl, setOriginalUrl] = useState<string | null>(null);

        // Candidates State
        const [candidates, setCandidates] = useState<Candidate[]>([]);
        const [selectedFilename, setSelectedFilename] = useState<string | null>(null);

        // Derived state
        const selectedCandidate = candidates.find(c => c.filename === selectedFilename) || candidates[0] || null;

        // Internal state
        const [prompt, setPrompt] = useState("");
        const [userInstruction, setUserInstruction] = useState("");
        const [showRawPrompt, setShowRawPrompt] = useState(false);
        const [isPromptOpen, setIsPromptOpen] = useState(false);
        const [loading, setLoading] = useState(false);
        const [uploading, setUploading] = useState(false);
        const [questionData, setQuestionData] = useState<any>(null);
        const [zoomedImage, setZoomedImage] = useState<string | null>(null);

        // ----------------------------------------------------
        // FETCH DATA & CANDIDATES
        // ----------------------------------------------------
        const fetchData = useCallback(async () => {
            setLoading(true);
            try {
                // 1. Fetch Question Data
                const res = await fetch(`http://localhost:3030/api/question/${questionId}/full`);
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                const { question } = await res.json();

                if (question) {
                    setQuestionData(question);
                    setOriginalUrl(question.image_url || null);

                    // 2. Fetch Candidates
                    const parts = questionId.split('_');
                    const uuid = parts[parts.length - 1];
                    const testId = parts.slice(0, -1).join('_');

                    const cRes = await fetch(`http://localhost:3030/api/candidates/${testId}/${uuid}`);
                    if (cRes.ok) {
                        const { candidates } = await cRes.json();
                        setCandidates(candidates);

                        // Auto-select logic
                        if (candidates.length > 0) {
                            // PRIORITY: Select the APPROVED (Main) image if it exists
                            const approved = candidates.find(c => c.isMain);

                            // If we have a currently selected filename, verify it still exists
                            const currentExists = selectedFilename && candidates.find(c => c.filename === selectedFilename);

                            if (approved && !currentExists) {
                                // If current selection is invalid or null, defaulting to APPROVED is safest
                                setSelectedFilename(approved.filename);
                            } else if (!currentExists) {
                                // Fallback to newest if no approved image and no valid selection
                                setSelectedFilename(candidates[0].filename);
                            }

                            if (onImageReady) onImageReady();
                        } else {
                            // FALLBACK: Try fetching the standard file directly
                            const genPath = `http://localhost:3030/data/generated-images/${testId}/${uuid}.png`;
                            try {
                                const head = await fetch(genPath, { method: 'HEAD' });
                                if (head.ok) {
                                    const legacyCandidate = {
                                        filename: `${uuid}.png`,
                                        path: `data/generated-images/${testId}/${uuid}.png`,
                                        url: genPath,
                                        timestamp: Date.now(),
                                        isMain: true
                                    };
                                    setCandidates([legacyCandidate]);
                                    setSelectedFilename(legacyCandidate.filename);
                                    if (onImageReady) onImageReady();
                                } else {
                                    setSelectedFilename(null);
                                }
                            } catch {
                                setSelectedFilename(null);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, [questionId, onImageReady, selectedFilename]);

        useEffect(() => {
            if (questionId) fetchData();
        }, [questionId]);


        // Load prompt when selected candidate changes
        useEffect(() => {
            if (!selectedCandidate) return;

            const loadPromptForCandidate = async () => {
                try {
                    const promptUrl = selectedCandidate.url.replace('.png', '.prompt.txt');
                    const pRes = await fetch(promptUrl);
                    if (pRes.ok) {
                        setPrompt(await pRes.text());
                    }
                } catch (e) {
                    if (questionData) {
                        setPrompt(questionData.question?.ru || questionData.question_ru || "");
                    }
                }
            };

            loadPromptForCandidate();
        }, [selectedCandidate?.filename, questionData]);

        // ----------------------------------------------------
        // DRAG & DROP LOGIC
        // ----------------------------------------------------
        const onDrop = useCallback(async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;
            const file = acceptedFiles[0];

            setUploading(true);
            addLog(`Uploading custom candidate: ${file.name}...`, 'loading');

            const parts = questionId.split('_');
            const uuid = parts[parts.length - 1];
            const testId = parts.slice(0, -1).join('_');

            try {
                const res = await fetch(`http://localhost:3030/api/candidates/upload?testId=${testId}&uuid=${uuid}&filename=${encodeURIComponent(file.name)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': file.type },
                    body: file
                });

                if (res.ok) {
                    const data = await res.json();
                    addLog("Upload successful!", 'success');
                    await fetchData();
                    if (data.candidate) {
                        setSelectedFilename(data.candidate.filename);
                    }
                } else {
                    throw new Error("Upload failed");
                }
            } catch (e) {
                addLog(`Upload error: ${e}`, 'error');
            } finally {
                setUploading(false);
            }
        }, [questionId, fetchData, addLog]);

        const { getRootProps, getInputProps, isDragActive } = useDropzone({
            onDrop,
            accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
            multiple: false
        });

        // ----------------------------------------------------
        // ACTIONS (DELETE with NO CONFIRM)
        // ----------------------------------------------------
        const deleteCandidate = async (candidate: Candidate) => {
            console.log("Starting delete process for:", candidate.filename);

            const parts = questionId.split('_');
            const testId = parts.slice(0, -1).join('_');

            addLog(`Deleting ${candidate.filename}...`, 'loading');

            try {
                const url = `http://localhost:3030/api/candidates/${testId}/${encodeURIComponent(candidate.filename)}`;
                console.log("Delete URL:", url);

                const res = await fetch(url, { method: 'DELETE' });

                if (res.ok) {
                    addLog("Candidate deleted", 'info');
                    toast.success("Image deleted");
                    console.log("Delete success");

                    setCandidates(prev => prev.filter(c => c.filename !== candidate.filename));

                    if (selectedFilename === candidate.filename) {
                        const remaining = candidates.filter(c => c.filename !== candidate.filename);
                        const main = remaining.find(c => c.isMain);
                        if (main) setSelectedFilename(main.filename);
                        else if (remaining.length > 0) setSelectedFilename(remaining[0].filename);
                        else setSelectedFilename(null);
                    }

                    setTimeout(fetchData, 200);
                } else {
                    const err = await res.json().catch(() => ({}));
                    console.error("Delete server error:", err);
                    throw new Error(err.error || `Server returned ${res.status}`);
                }
            } catch (e: any) {
                console.error("Delete exception:", e);
                addLog(`Delete failed: ${e.message}`, 'error');
                toast.error(`Delete failed: ${e.message}`);
            }
        };

        useImperativeHandle(ref, () => ({
            approve: async () => {
                if (!selectedCandidate || !questionData) {
                    addLog("No image selected to publish", 'error');
                    return false;
                }

                if (selectedCandidate.isMain) {
                    toast.info("This is already the approved production image!");
                }

                addLog(`Publishing version: ${selectedCandidate.filename}...`, 'loading');
                try {
                    const parts = questionId.split('_');
                    const uuid = parts[parts.length - 1];
                    const testId = parts.slice(0, -1).join('_');

                    const res = await fetch('http://localhost:3030/api/db/upload-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: uuid,
                            generatedPath: selectedCandidate.path,
                            table: 'questions_new',
                            questionData: questionData,
                            testId: testId
                        })
                    });

                    if (res.ok) {
                        addLog(`Published successfully!`, 'success');
                        toast.success("Image Deployed to Production!");
                        fetchData();
                        return true;
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || "Upload failed");
                    }
                } catch (e: any) {
                    addLog(`Publish failed: ${e.message}`, 'error');
                    toast.error(`Approve Failed: ${e.message}`);
                    return false;
                }
            },
            regenerate: async () => {
                if (!serverOnline) return addLog("Server offline", 'error');
                addLog(`Generating new candidate...`, 'loading');

                const parts = questionId.split('_');
                const category = parts[0];
                const testId = parts.slice(0, -1).join('_');

                try {
                    toast.info("Sending request to Gemini Director... (takes ~30-60s)", { duration: 5000 });
                    await fetch('http://localhost:3030/api/generate/single', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            questionId,
                            category,
                            testId,
                            customPrompt: prompt,
                            userInstruction: userInstruction
                        })
                    });

                    setUserInstruction("");
                    setIsPromptOpen(false);

                    let attempts = 0;
                    const interval = setInterval(async () => {
                        attempts++;

                        // Progress heartbeat & Quota info
                        if (attempts % 10 === 0) {
                            addLog(`Still working... (${attempts * 2}s). Note: Daily Quota resets ~09:00 Madrid.`, 'loading');
                        }

                        const parts = questionId.split('_');
                        const uuid = parts[parts.length - 1];
                        const testId = parts.slice(0, -1).join('_');

                        try {
                            const cRes = await fetch(`http://localhost:3030/api/candidates/${testId}/${uuid}`);
                            if (cRes.ok) {
                                const { candidates: newCandidates } = await cRes.json();
                                if (newCandidates.length > candidates.length || (newCandidates[0] && candidates[0] && newCandidates[0].timestamp > candidates[0].timestamp)) {
                                    clearInterval(interval);
                                    setCandidates(newCandidates);
                                    if (newCandidates[0]) setSelectedFilename(newCandidates[0].filename);
                                    addLog("New candidate arrived!", 'success');
                                }
                            }
                        } catch (e) { console.error(e); }

                        if (attempts > 150) {
                            clearInterval(interval);
                            addLog("Generation timeout (5m limit reached)", 'error');
                        }
                    }, 2000);

                } catch (e) {
                    addLog(`Generation failed: ${e}`, 'error');
                }
            },
            reject: async () => {
                if (selectedCandidate) {
                    await deleteCandidate(selectedCandidate);
                }
            }
        }), [prompt, userInstruction, selectedCandidate, questionId, candidates, questionData, serverOnline]);


        return (
            <div className="flex flex-col h-full bg-[#09090b] relative group overflow-hidden">

                {/* VISUAL AREA: TOP (ORIGINAL) & BOTTOM (PREVIEW) */}
                <div className="flex-1 relative w-full flex flex-col p-2 gap-2 min-h-0">

                    {/* ORIGINAL (30% Height) */}
                    <div className="h-[30%] bg-black/40 rounded-lg overflow-hidden relative border border-zinc-800/50 group/item min-h-[100px]">
                        {originalUrl ? (
                            <>
                                <Badge variant="outline" className="absolute top-2 left-2 z-10 bg-black/50 text-[10px]">ORIGINAL</Badge>
                                <img
                                    src={originalUrl}
                                    className="w-full h-full object-contain cursor-zoom-in"
                                    onClick={() => setZoomedImage(originalUrl)}
                                />
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-700 text-xs">No Original</div>
                        )}
                    </div>

                    {/* MAIN STAGE (Selected Candidate) */}
                    <div className="flex-1 bg-black/40 rounded-lg overflow-hidden relative border group/item flex flex-col transition-all duration-300"
                        style={{ borderColor: selectedCandidate?.isMain ? '#10b981' : 'rgba(39, 39, 42, 0.5)' }}
                    >
                        {selectedCandidate ? (
                            <>
                                <div className="absolute top-2 left-2 z-10 flex gap-2">
                                    <Badge className={cn("shadow-lg text-[10px] items-center gap-1", selectedCandidate.isMain ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-500")}>
                                        {selectedCandidate.isMain ? <><Check className="w-3 h-3" /> PUBLIC (APPROVED)</> : 'DRAFT CANDIDATE'}
                                    </Badge>
                                </div>
                                <img
                                    src={selectedCandidate.url}
                                    className="flex-1 w-full h-full object-contain cursor-zoom-in bg-zinc-900/50"
                                    onClick={() => setZoomedImage(selectedCandidate.url)}
                                />

                                {/* Prompt & Info Overlay */}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <Button size="sm" variant="secondary" className="h-7 text-[10px]" onClick={() => setIsPromptOpen(true)}>
                                        <Edit2 className="w-3 h-3 mr-1" /> Prompt
                                    </Button>
                                    <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => deleteCandidate(selectedCandidate)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-zinc-700">
                                {loading ? <Loader2 className="animate-spin mb-2" /> : <Sparkles className="mb-2 opacity-20" />}
                                <span className="text-xs">{loading ? "Loading..." : "No candidates generated yet"}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* THE FILMSTRIP (Director's Cut) */}
                <div className="h-24 bg-[#0c0c0e] border-t border-white/5 flex items-center px-4 gap-3 overflow-x-auto shrink-0 custom-scrollbar">

                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={cn(
                            "min-w-[70px] h-[70px] rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors shrink-0",
                            isDragActive && "border-indigo-500 bg-indigo-500/20",
                            uploading && "opacity-50 pointer-events-none"
                        )}
                    >
                        <input {...getInputProps()} />
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> : <Plus className="w-6 h-6 text-zinc-500" />}
                        <span className="text-[9px] text-zinc-500 mt-1">{uploading ? '...' : 'Add'}</span>
                    </div>

                    {/* Candidate List */}
                    {candidates.map((cand) => (
                        <div
                            key={cand.filename}
                            onClick={() => setSelectedFilename(cand.filename)}
                            className={cn(
                                "relative group/thumb w-[70px] h-[70px] rounded-lg overflow-hidden border-2 cursor-pointer transition-all shrink-0",
                                selectedFilename === cand.filename
                                    ? (cand.isMain ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] opacity-100 ring-1 ring-emerald-500" : "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] opacity-100")
                                    : (cand.isMain ? "border-emerald-500/50 opacity-80" : "border-transparent opacity-60 hover:opacity-100")
                            )}
                        >
                            <img src={cand.url} className="w-full h-full object-cover" loading="lazy" />

                            <div className="absolute bottom-0 right-0 left-0 bg-black/60 text-[8px] text-white px-1 truncate text-center backdrop-blur-sm">
                                {new Date(cand.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    console.log("Delete clicked for:", cand.filename);
                                    deleteCandidate(cand);
                                }}
                                className="absolute top-0.5 right-0.5 p-1 bg-red-500/90 text-white rounded hover:bg-red-600 opacity-70 hover:opacity-100 transition-opacity z-20"
                                title="Delete Image"
                            >
                                <X className="w-3 h-3" />
                            </button>

                            {cand.isMain && (
                                <div className="absolute top-0.5 left-0.5 text-green-400 bg-black/50 rounded-full p-0.5">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ZOOM & PROMPT OVERLAYS */}
                {zoomedImage && (
                    <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in" onClick={() => setZoomedImage(null)}>
                        <img src={zoomedImage} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" onClick={e => e.stopPropagation()} />
                        <Button className="absolute top-4 right-4 rounded-full w-12 h-12 bg-zinc-800/50" onClick={() => setZoomedImage(null)}>
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                )}

                {isPromptOpen && (
                    <div className="absolute top-16 right-6 w-[450px] bg-[#18181b]/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl p-5 z-30 animate-in slide-in-from-top-2 fade-in flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-500" />
                                AI Director
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsPromptOpen(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] text-zinc-400 font-medium">Your Wish / Instruction:</label>
                            <Textarea
                                value={userInstruction}
                                onChange={(e) => setUserInstruction(e.target.value)}
                                className="text-sm bg-zinc-950 border-zinc-800 focus:border-purple-500/50 min-h-[80px] resize-none text-white placeholder:text-zinc-600"
                                placeholder="e.g., 'Make the blue car a red van', 'Add construction cones on the right'..."
                                autoFocus
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setShowRawPrompt(!showRawPrompt)}
                                className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
                            >
                                {showRawPrompt ? "Hide Technical Prompt ▴" : "Show Technical Prompt ▾"}
                            </button>

                            {showRawPrompt && (
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="text-[10px] bg-zinc-900/50 border-zinc-800 focus:border-zinc-700 min-h-[150px] text-zinc-400 font-mono leading-relaxed"
                                    placeholder="Full technical prompt..."
                                />
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-white/5">
                            <Button
                                size="sm"
                                className="h-8 bg-purple-600 hover:bg-purple-500 text-white gap-2 px-4"
                                onClick={() => { if (ref && 'current' in ref && ref.current) ref.current.regenerate(); }}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {userInstruction ? "Apply Magic & Generate" : "Regenerate"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);
MissionImageControl.displayName = "MissionImageControl";
