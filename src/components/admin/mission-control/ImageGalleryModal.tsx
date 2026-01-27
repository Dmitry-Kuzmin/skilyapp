import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, Image as ImageIcon, Folder } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageGalleryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    questionId: string;
    onImageSelected: () => void;
}

interface GalleryImage {
    uuid: string;
    filename: string;
    testId: string;
    url: string;
    size: number;
    modified: string;
    text?: string;
}

interface Gallery {
    [topic: string]: {
        tests: {
            [testId: string]: GalleryImage[];
        };
    };
}

// Sub-component to handle per-test grid performance separately
const TestGrid = ({
    testId,
    images,
    selectedImage,
    onSelect
}: {
    testId: string,
    images: GalleryImage[],
    selectedImage: GalleryImage | null,
    onSelect: (img: GalleryImage) => void
}) => {
    // Smart Loading: Show 12 initially to prevent freeze, allow "Show All" on demand
    const [limit, setLimit] = useState(12);

    const displayImages = images.slice(0, limit);
    const hasMore = limit < images.length;

    return (
        <div className="space-y-3 pb-6 border-b border-zinc-800/50 last:border-0">
            <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-md">
                <h4 className="text-xs font-mono text-zinc-400 flex items-center gap-2 font-bold">
                    {testId}
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-zinc-800 text-zinc-500">{images.length}</Badge>
                </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                {displayImages.map(img => (
                    <button
                        key={img.filename}
                        onClick={() => onSelect(img)}
                        className={cn(
                            "relative aspect-video w-full rounded-lg overflow-hidden border-2 transition-all group bg-zinc-950 flex items-center justify-center",
                            selectedImage?.filename === img.filename
                                ? "border-indigo-500 ring-2 ring-indigo-500/50"
                                : "border-zinc-800 hover:border-zinc-600"
                        )}
                        title={img.text ? img.text.substring(0, 100) : img.uuid}
                    >
                        <img
                            src={`http://localhost:3030${img.url.replace('/candidates/', '/generated-images/')}?width=400`}
                            alt={img.uuid}
                            className="w-full h-full object-contain block"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src.includes('/generated-images/')) {
                                    // Fallback to original full size if thumbnail missing
                                    target.src = target.src.replace('/generated-images/', '/candidates/');
                                }
                            }}
                        />

                        {/* Selection Indicator */}
                        {selectedImage?.filename === img.filename && (
                            <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center pointer-events-none">
                                <div className="bg-indigo-500 rounded-full p-1.5 shadow-lg animate-in zoom-in-50 duration-200">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        )}

                        {/* Hover UUID Info */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/90 text-[9px] text-zinc-400 px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity text-center">
                            {img.uuid.split('-')[0]}
                        </div>
                    </button>
                ))}
            </div>

            {hasMore && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full py-6 text-xs text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900/50 border border-dashed border-zinc-800 transition-all"
                    onClick={() => setLimit(prev => prev + 1000)}
                >
                    Show remaining {images.length - limit} images...
                </Button>
            )}
        </div>
    );
};

export function ImageGalleryModal({ open, onOpenChange, questionId, onImageSelected }: ImageGalleryModalProps) {
    const [gallery, setGallery] = useState<Gallery>({});
    const [loading, setLoading] = useState(false);
    const [copying, setCopying] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [maxVisibleTests, setMaxVisibleTests] = useState(5); // Pagination Limit

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchInput);
            setMaxVisibleTests(5); // Reset pagination on new search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        if (open) {
            loadGallery();
        }
    }, [open]);

    const loadGallery = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3030/api/gallery/images?relatedTo=${questionId}`);
            if (res.ok) {
                const data = await res.json();
                setGallery(data);

                // Auto-expand Smart Recs or first topic
                const smartRecsTopic = Object.keys(data).find(t => t.includes('✨'));
                if (smartRecsTopic) {
                    setExpandedTopics(new Set([smartRecsTopic]));
                } else {
                    const firstTopic = Object.keys(data)[0];
                    if (firstTopic) {
                        setExpandedTopics(new Set([firstTopic]));
                    }
                }
            }
        } catch (e) {
            toast.error("Failed to load image gallery");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyImage = async () => {
        if (!selectedImage) return;

        setCopying(true);
        try {
            const parts = questionId.split('_');
            const targetUuid = parts[parts.length - 1];
            const targetTestId = parts.slice(0, -1).join('_');

            const res = await fetch('http://localhost:3030/api/gallery/copy-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceTestId: selectedImage.testId,
                    sourceFilename: selectedImage.filename,
                    targetTestId,
                    targetUuid
                })
            });

            if (res.ok) {
                toast.success("Image copied successfully!");
                onImageSelected();
                onOpenChange(false);
            } else {
                throw new Error("Copy failed");
            }
        } catch (e) {
            toast.error("Failed to copy image");
        } finally {
            setCopying(false);
        }
    };

    const toggleTopic = (topic: string) => {
        setExpandedTopics(prev => {
            const next = new Set(prev);
            if (next.has(topic)) {
                next.delete(topic);
            } else {
                next.add(topic);
            }
            return next;
        });
    };

    // Memoize filtering to prevent freeze on render
    const filteredGallery = useMemo(() => {
        if (!debouncedSearchQuery) return gallery;

        const query = debouncedSearchQuery.toLowerCase();
        const result: Gallery = {};

        // Helper to check image
        const matchesQuery = (img: GalleryImage) =>
            img.uuid.toLowerCase().includes(query) ||
            img.testId.toLowerCase().includes(query) ||
            (img.text && img.text.toLowerCase().includes(query));

        Object.keys(gallery).forEach(topic => {
            const topicTests = gallery[topic].tests;
            const matchingTests: Record<string, GalleryImage[]> = {};
            let hasMatches = false;

            Object.keys(topicTests).forEach(testId => {
                const images = topicTests[testId];
                const matchingImages = images.filter(matchesQuery);

                if (matchingImages.length > 0) {
                    matchingTests[testId] = matchingImages;
                    hasMatches = true;
                }
            });

            if (hasMatches) {
                result[topic] = { tests: matchingTests };
            }
        });

        return result;
    }, [gallery, debouncedSearchQuery]);

    // Calculate count efficiently from memoized result
    const filteredCount = useMemo(() => {
        return Object.values(filteredGallery).reduce((count, topic) =>
            count + Object.values(topic.tests).reduce((testCount, images) =>
                testCount + images.length, 0
            ), 0
        );
    }, [filteredGallery]);

    const activeTopics = useMemo(() => {
        return Object.keys(filteredGallery).sort((a, b) => {
            if (a.includes('✨')) return -1;
            if (b.includes('✨')) return 1;
            const isRejA = a.includes('Rejected') || a.includes('Prior') || a.includes('🗑️');
            const isRejB = b.includes('Rejected') || b.includes('Prior') || b.includes('🗑️');
            if (isRejA && !isRejB) return -1;
            if (!isRejA && isRejB) return 1;
            return a.localeCompare(b);
        });
    }, [filteredGallery]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-full h-[95vh] flex flex-col bg-[#09090b] border-zinc-800 p-0 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#09090b]">
                    <DialogHeader className="p-0 space-y-0">
                        <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-indigo-400" />
                            Image Gallery
                            <Badge variant="outline" className="ml-2 text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                {filteredCount} available
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Search in Header */}
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <Input
                            placeholder="Search images..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-10 h-9 bg-zinc-900 border-zinc-700 focus:border-indigo-500/50"
                        />
                        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />}
                    </div>
                </div>

                {loading && !gallery ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                ) : (
                    <div className="flex-1 flex min-h-0 bg-black/20">
                        {/* Sidebar: topics */}
                        <div className="w-72 border-r border-zinc-800 bg-[#09090b] flex flex-col">
                            {/* Sidebar Header with Actions */}
                            <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Folders</span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
                                        onClick={() => setExpandedTopics(new Set())}
                                        title="Collapse All"
                                    >
                                        <div className="w-3 h-0.5 bg-current" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
                                        onClick={() => setExpandedTopics(new Set(Object.keys(filteredGallery)))}
                                        title="Expand All"
                                    >
                                        <div className="w-3 h-3 border-2 border-current rounded-sm" />
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-1">
                                    {activeTopics.map(topic => {
                                        const topicTests = filteredGallery[topic].tests;
                                        const topicImageCount = Object.values(topicTests).reduce((count, images) => count + images.length, 0);
                                        // If searching, always expand valid results
                                        const isExpanded = debouncedSearchQuery ? true : expandedTopics.has(topic);
                                        const isSpecial = topic.includes('✨') || topic.includes('rejected');

                                        return (
                                            <div key={topic} className="mb-1">
                                                <button
                                                    onClick={() => toggleTopic(topic)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all",
                                                        isExpanded
                                                            ? isSpecial ? "bg-indigo-900/30 text-indigo-300" : "bg-zinc-800 text-zinc-100"
                                                            : isSpecial ? "text-indigo-400 hover:bg-indigo-900/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Folder className={cn("w-4 h-4 shrink-0", isSpecial ? "text-indigo-400" : (isExpanded ? "text-zinc-300" : "text-zinc-600"))} />
                                                        <span className="truncate">{topic}</span>
                                                    </div>
                                                    <Badge variant="secondary" className="text-[10px] min-w-[2rem] justify-center bg-transparent border border-zinc-800 text-zinc-500">
                                                        {topicImageCount}
                                                    </Badge>
                                                </button>

                                                {isExpanded && (
                                                    <div className="ml-4 pl-3 mt-1 border-l border-zinc-800 space-y-0.5 animate-in slide-in-from-left-2 duration-200">
                                                        {Object.keys(topicTests).sort().slice(0, 50).map(testId => ( // Verify limit
                                                            <div key={testId} className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-900/50 rounded cursor-default group">
                                                                <span className="truncate pr-2">{testId.replace(topic + '_', '')}</span>
                                                                <span className="text-zinc-700 group-hover:text-zinc-500">{filteredGallery[topic].tests[testId].length}</span>
                                                            </div>
                                                        ))}
                                                        {Object.keys(topicTests).length > 50 && (
                                                            <div className="px-3 py-1.5 text-xs text-zinc-600 italic">
                                                                +{Object.keys(topicTests).length - 50} more...
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Main area: image grid */}
                        <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0e]">
                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">
                                    {(() => {
                                        let renderedCount = 0;
                                        let hasMore = false;

                                        // Prioritize Smart Recs
                                        const smartRecsTopic = activeTopics.find(t => t.includes('✨'));
                                        const otherTopics = activeTopics.filter(t => !t.includes('✨'));

                                        const sortedTopics = smartRecsTopic ? [smartRecsTopic, ...otherTopics] : otherTopics;

                                        return (
                                            <>
                                                {sortedTopics.map(topic => {
                                                    // If searching, we show all matching topics. If not searching, we respect expansion state.
                                                    if (!debouncedSearchQuery && !expandedTopics.has(topic)) return null;

                                                    const topicTests = filteredGallery[topic].tests;
                                                    const allTestKeys = Object.keys(topicTests).sort();

                                                    // ALWAYS show Smart Recommendations fully
                                                    const isSmartRecs = topic.includes('✨');

                                                    let visibleTests = allTestKeys;

                                                    if (!isSmartRecs) {
                                                        // Calculate how many tests from this topic we can show
                                                        const remainingSlots = maxVisibleTests - renderedCount;

                                                        if (remainingSlots <= 0) {
                                                            hasMore = true;
                                                            return null;
                                                        }

                                                        visibleTests = allTestKeys.slice(0, remainingSlots);
                                                        if (visibleTests.length < allTestKeys.length) {
                                                            hasMore = true;
                                                        }
                                                        renderedCount += visibleTests.length;
                                                    }

                                                    return (
                                                        <div key={topic} className="space-y-4">
                                                            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                                                                <h3 className={`text-sm font-bold uppercase tracking-wider ${isSmartRecs ? 'text-indigo-400' : 'text-zinc-300'}`}>
                                                                    {topic}
                                                                </h3>
                                                                <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20">
                                                                    {allTestKeys.length} tests
                                                                </Badge>
                                                            </div>

                                                            {visibleTests.map(testId => (
                                                                <TestGrid
                                                                    key={testId}
                                                                    testId={testId}
                                                                    images={filteredGallery[topic].tests[testId]}
                                                                    selectedImage={selectedImage}
                                                                    onSelect={setSelectedImage}
                                                                />
                                                            ))}
                                                        </div>
                                                    );
                                                })}

                                                {hasMore && (
                                                    <div className="pt-4 flex justify-center">
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => setMaxVisibleTests(prev => prev + 10)}
                                                            className="w-full max-w-sm"
                                                        >
                                                            Show More Results
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </ScrollArea>

                            {/* Footer with selected image info and copy button */}
                            {selectedImage && (
                                <div className="border-t border-zinc-800 p-4 flex items-center justify-between bg-[#09090b] shadow-2xl z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-20 bg-zinc-900 rounded border border-zinc-800 overflow-hidden relative">
                                            <img
                                                src={`http://localhost:3030${selectedImage.url.replace('/candidates/', '/generated-images/')}?width=400`}
                                                className="w-full h-full object-cover"
                                                alt=""
                                            />
                                        </div>
                                        <div className="text-sm">
                                            <div className="text-zinc-500 text-xs uppercase tracking-wider mb-0.5">Selected Image</div>
                                            <div className="font-mono text-xs text-white font-medium flex items-center gap-2">
                                                {selectedImage.testId}
                                                <span className="text-zinc-600">/</span>
                                                {selectedImage.uuid}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleCopyImage}
                                        disabled={copying}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]"
                                    >
                                        {copying ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Copying...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Use Image
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
