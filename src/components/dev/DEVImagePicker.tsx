/**
 * DEV-only image picker drawer.
 * Opens from lesson player when clicking image placeholder on a theory step.
 * Tabs: Gallery (existing 3000 images) | Generate (AI from PDF screenshot)
 * On select → calls onSaved(url); actual DB save is done by the parent.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Images, Wand2, Upload, RefreshCw, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const V = "http://localhost:3030";

type Tab = "gallery" | "generated" | "generate";

interface ExistingImage { name: string; testId: string; url: string; }
interface CourseImage { name: string; url: string; created_at?: string; }

interface Props {
  onSaved: (url: string) => void;
  onClose: () => void;
}

export function DEVImagePicker({ onSaved, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("gallery");

  // Gallery
  const [images, setImages] = useState<ExistingImage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selected, setSelected] = useState<ExistingImage | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Generated (course-images bucket)
  const [courseImages, setCourseImages] = useState<CourseImage[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseImage | null>(null);

  // Generate
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [refMime, setRefMime] = useState("image/png");
  const [instruction, setInstruction] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genUrl, setGenUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadGallery = useCallback(async (p = 0, q = "") => {
    setGalleryLoading(true);
    try {
      const res = await fetch(`${V}/api/course/existing-images?page=${p}&limit=30&search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setImages(prev => p === 0 ? (data.images || []) : [...prev, ...(data.images || [])]);
      setTotal(data.total || 0);
      setPage(p);
    } catch { /* server offline */ }
    setGalleryLoading(false);
  }, []);

  useEffect(() => { loadGallery(0, ""); }, []);

  const loadCourseImages = useCallback(async () => {
    setCourseLoading(true);
    try {
      const res = await fetch(`${V}/api/course/gallery`);
      const data = await res.json();
      setCourseImages(data.images || []);
    } catch { /* server offline */ }
    setCourseLoading(false);
  }, []);

  useEffect(() => { if (tab === "generated") loadCourseImages(); }, [tab]);

  const onSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadGallery(0, v), 350);
  };

  // File loading for generate tab
  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Resize to max 1200px on longest side to avoid 413 errors
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const resized = canvas.toDataURL("image/jpeg", 0.85);
        setRefPreview(resized);
        setRefBase64(resized.split(",")[1]);
        setRefMime("image/jpeg");
        setGenUrl(null);
        setGenError(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const generate = async () => {
    if (!refBase64) return;
    setGenLoading(true); setGenError(null); setGenUrl(null);
    try {
      const res = await fetch(`${V}/api/course/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenceImageBase64: refBase64, mimeType: refMime, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGenUrl(data.imageUrl);
    } catch (e: any) {
      setGenError(e.message);
    }
    setGenLoading(false);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[8000]"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="fixed bottom-0 left-0 right-0 z-[8001] bg-zinc-900 rounded-t-3xl text-white max-h-[85vh] flex flex-col"
        onPaste={(e) => {
          const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
          if (item) { loadFile(item.getAsFile()!); setTab("generate"); }
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="font-bold text-violet-400 text-sm">Добавить картинку</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">DEV</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-zinc-800 flex-shrink-0">
          <button onClick={() => setTab("gallery")}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === "gallery" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>
            <Images className="w-3.5 h-3.5" />Галерея ({total})
          </button>
          <button onClick={() => setTab("generated")}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === "generated" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>
            <Sparkles className="w-3.5 h-3.5" />ИИ ({courseImages.length})
          </button>
          <button onClick={() => setTab("generate")}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === "generate" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800")}>
            <Wand2 className="w-3.5 h-3.5" />Генерация
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── GALLERY ── */}
          {tab === "gallery" && (
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <input value={search} onChange={e => onSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="flex-1 rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500" />
                <button onClick={() => loadGallery(0, search)} className="text-zinc-400 hover:text-white px-2">
                  <RefreshCw className={cn("w-3.5 h-3.5", galleryLoading && "animate-spin")} />
                </button>
              </div>

              {galleryLoading && images.length === 0 && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                {images.map(img => (
                  <button key={`${img.testId}/${img.name}`}
                    onClick={() => setSelected(selected?.name === img.name ? null : img)}
                    className={cn("relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                      selected?.name === img.name ? "border-violet-500 ring-2 ring-violet-500/40" : "border-zinc-700 hover:border-zinc-500")}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {selected?.name === img.name && (
                      <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                        <div className="bg-violet-500 rounded-full p-1"><Check className="w-3 h-3 text-white" /></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {images.length < total && (
                <button onClick={() => loadGallery(page + 1, search)} disabled={galleryLoading}
                  className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 rounded-lg">
                  {galleryLoading ? "Загружаю..." : `Ещё (${total - images.length})`}
                </button>
              )}

              {selected && (
                <div className="space-y-2 border-t border-zinc-700 pt-3 sticky bottom-0 bg-zinc-900 pb-2">
                  <img src={selected.url} className="w-full rounded-xl object-contain max-h-40 border border-zinc-700" />
                  <button onClick={() => { onSaved(selected.url); onClose(); }}
                    className="w-full rounded-xl py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Check className="w-4 h-4" />Вставить в урок
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── GENERATED (course-images) ── */}
          {tab === "generated" && (
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">Сгенерированные для курса изображения</p>
                <button onClick={loadCourseImages} className="text-zinc-400 hover:text-white px-2">
                  <RefreshCw className={cn("w-3.5 h-3.5", courseLoading && "animate-spin")} />
                </button>
              </div>

              {courseLoading && courseImages.length === 0 && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
              )}

              {!courseLoading && courseImages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-500 text-xs gap-2">
                  <Sparkles className="w-6 h-6" />
                  <span>Нет сгенерированных изображений</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5">
                {courseImages.map(img => (
                  <button key={img.name}
                    onClick={() => setSelectedCourse(selectedCourse?.name === img.name ? null : img)}
                    className={cn("relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                      selectedCourse?.name === img.name ? "border-emerald-500 ring-2 ring-emerald-500/40" : "border-zinc-700 hover:border-zinc-500")}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    {selectedCourse?.name === img.name && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="bg-emerald-500 rounded-full p-1"><Check className="w-3 h-3 text-white" /></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {selectedCourse && (
                <div className="space-y-2 border-t border-zinc-700 pt-3 sticky bottom-0 bg-zinc-900 pb-2">
                  <img src={selectedCourse.url} className="w-full rounded-xl object-contain max-h-40 border border-zinc-700" />
                  <button onClick={() => { onSaved(selectedCourse.url); onClose(); }}
                    className="w-full rounded-xl py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Check className="w-4 h-4" />Вставить в урок
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── GENERATE ── */}
          {tab === "generate" && (
            <div className="p-4 space-y-3">
              {/* Drop zone */}
              <div
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) loadFile(f); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={cn("relative rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden",
                  dragOver ? "border-violet-500 bg-violet-500/10" : "border-zinc-600 hover:border-zinc-500",
                  refPreview ? "h-36" : "h-20 flex items-center justify-center")}>
                {refPreview
                  ? <img src={refPreview} alt="" className="w-full h-full object-contain" />
                  : <div className="text-center space-y-1">
                      <Upload className="w-5 h-5 mx-auto text-zinc-500" />
                      <p className="text-xs text-zinc-500">Перетащи, вставь (Ctrl+V) или кликни</p>
                    </div>}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </div>

              <textarea value={instruction} onChange={e => setInstruction(e.target.value)}
                placeholder="Инструкция (опционально)..."
                rows={2}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500" />

              <button onClick={generate} disabled={genLoading || !refBase64}
                className={cn("w-full rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all",
                  genLoading || !refBase64 ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-500 text-white active:scale-[0.98]")}>
                {genLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Генерирую...</> : <><Wand2 className="w-4 h-4" />Сгенерировать</>}
              </button>

              {genError && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">❌ {genError}</div>}

              {genUrl && (
                <div className="space-y-2">
                  <img src={genUrl} className="w-full rounded-xl object-contain max-h-48 border border-zinc-700" />
                  <button onClick={() => { onSaved(genUrl!); onClose(); }}
                    className="w-full rounded-xl py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
                    <Check className="w-4 h-4" />Вставить в урок
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
