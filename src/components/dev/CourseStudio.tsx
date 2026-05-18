/**
 * CourseStudio — DEV-only floating panel for building course content.
 * Tabs: Gallery (3000+ existing images) | Generate (AI from PDF) | Editor (create lesson steps)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Upload, Wand2, Copy, Check, Loader2, Images, RefreshCw, BookOpen, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const V = 'http://localhost:3030';

type Lang = 'es' | 'ru';
type Tab = 'gallery' | 'generate' | 'editor';
type StepType = 'theory' | 'quiz' | 'flashcard';

interface ExistingImage { name: string; testId: string; url: string; }
interface GeneratedResult { imageUrl: string; analysis: { description?: string } }
interface Module { id: string; number: number; emoji: string; title_es: string; title_ru: string; }
interface Lesson { id: string; module_id: string; title_es: string; title_ru: string; order_index: number; }

function CopyBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="w-full rounded-xl py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
    >
      {copied
        ? <><Check className="w-4 h-4 text-green-400" /><span className="text-green-400">Скопировано!</span></>
        : <><Copy className="w-4 h-4" />Копировать URL</>}
    </button>
  );
}

export function CourseStudio() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('gallery');

  // Picked image shared across tabs
  const [pickedUrl, setPickedUrl] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);

  // ── Gallery ──
  const [galleryImages, setGalleryImages] = useState<ExistingImage[]>([]);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [galleryPage, setGalleryPage] = useState(0);
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [selectedGallery, setSelectedGallery] = useState<ExistingImage | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const loadGallery = useCallback(async (page = 0, search = '') => {
    setGalleryLoading(true);
    try {
      const res = await fetch(`${V}/api/course/existing-images?page=${page}&limit=48&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (page === 0) setGalleryImages(data.images || []);
      else setGalleryImages(prev => [...prev, ...(data.images || [])]);
      setGalleryTotal(data.total || 0);
      setGalleryPage(page);
    } catch { /* server not running */ }
    finally { setGalleryLoading(false); }
  }, []);

  const onSearchChange = (v: string) => {
    setGallerySearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadGallery(0, v), 400);
  };

  const pickFromGallery = (img: ExistingImage) => {
    setPickedUrl(img.url);
    setPickedName(img.name);
    setTab('editor');
  };

  // ── Generate ──
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [refMime, setRefMime] = useState('image/png');
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [genInstruction, setGenInstruction] = useState('');
  const [genLang, setGenLang] = useState<Lang>('es');
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<GeneratedResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale); const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const resized = canvas.toDataURL("image/jpeg", 0.85);
        setRefPreview(resized);
        setRefBase64(resized.split(",")[1]);
        setRefMime("image/jpeg");
        setGenResult(null);
        setGenError(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('image/')) loadFile(f);
  }, [loadFile]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile()!);
  }, [loadFile]);

  const generate = async () => {
    if (!refBase64) { setGenError('Сначала загрузи референс'); return; }
    setGenLoading(true); setGenError(null); setGenResult(null);
    try {
      const res = await fetch(`${V}/api/course/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceImageBase64: refBase64, mimeType: refMime, instruction: genInstruction, language: genLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGenResult(data);
      setPickedUrl(data.imageUrl);
      setPickedName('generated');
    } catch (e: any) { setGenError(e.message); }
    finally { setGenLoading(false); }
  };

  // ── Editor ──
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selModuleId, setSelModuleId] = useState('');
  const [selLessonId, setSelLessonId] = useState(''); // '' = create new
  const [newLessonEs, setNewLessonEs] = useState('');
  const [newLessonRu, setNewLessonRu] = useState('');
  const [stepType, setStepType] = useState<StepType>('theory');
  const [stepTextEs, setStepTextEs] = useState('');
  const [stepTextRu, setStepTextRu] = useState('');
  const [editorLang, setEditorLang] = useState<Lang>('es');
  const [saving, setSaving] = useState(false);
  const [savedStep, setSavedStep] = useState<string | null>(null);

  const loadModules = async () => {
    try {
      const res = await fetch(`${V}/api/course/modules`);
      const data = await res.json();
      setModules(data.modules || []);
      setLessons(data.lessons || []);
    } catch { /* server offline */ }
  };

  const moduleLessons = lessons.filter(l => l.module_id === selModuleId);

  const saveStep = async () => {
    if (!selModuleId) return;
    setSaving(true); setSavedStep(null);
    try {
      let lessonId = selLessonId;

      // Create lesson if needed
      if (!lessonId) {
        if (!newLessonEs) { setSaving(false); return; }
        const orderIdx = moduleLessons.length + 1;
        const res = await fetch(`${V}/api/course/lesson/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ module_id: selModuleId, title_es: newLessonEs, title_ru: newLessonRu || newLessonEs, order_index: orderIdx }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        lessonId = data.lesson.id;
        setLessons(prev => [...prev, data.lesson]);
        setSelLessonId(lessonId);
        setNewLessonEs(''); setNewLessonRu('');
      }

      // Get existing step count for order
      const stepsRes = await fetch(`${V}/api/course/lesson/${lessonId}/steps`);
      const stepsData = await stepsRes.json();
      const orderIndex = (stepsData.steps?.length || 0) + 1;

      const content_es: Record<string, string> = { text: stepTextEs };
      const content_ru: Record<string, string> = { text: stepTextRu };
      if (pickedUrl) { content_es.image_url = pickedUrl; content_ru.image_url = pickedUrl; }

      const res = await fetch(`${V}/api/course/step/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: lessonId, order_index: orderIndex, type: stepType, content_es, content_ru }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedStep(data.step.id);
      setStepTextEs(''); setStepTextRu('');
      setPickedUrl(null); setPickedName(null);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  useEffect(() => { if (open) { loadGallery(0, ''); loadModules(); } }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[9000] flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-violet-700 active:scale-95 transition-all"
      >
        <BookOpen className="w-4 h-4" />
        Course Studio
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-[9000] w-full sm:w-[520px] max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl sm:bottom-4 sm:right-4 bg-zinc-900 border border-zinc-700 shadow-2xl text-white text-sm"
      onPaste={onPaste}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="font-bold text-violet-400">Course Studio</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">DEV</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-zinc-800 flex-shrink-0">
        {([['gallery', <Images className="w-3.5 h-3.5" />, `Галерея (${galleryTotal})`],
           ['generate', <Wand2 className="w-3.5 h-3.5" />, 'Генерация'],
           ['editor', <BookOpen className="w-3.5 h-3.5" />, 'Редактор']] as const).map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t as Tab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === t ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Picked image pill */}
      {pickedUrl && (
        <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 flex-shrink-0">
          <img src={pickedUrl} className="w-8 h-8 rounded object-cover flex-shrink-0" />
          <span className="text-[10px] text-violet-300 truncate flex-1">{pickedName}</span>
          {tab !== 'editor' && (
            <button onClick={() => setTab('editor')} className="text-[10px] text-violet-400 hover:text-white flex items-center gap-0.5 flex-shrink-0">
              В редактор <ChevronRight className="w-3 h-3" />
            </button>
          )}
          <button onClick={() => { setPickedUrl(null); setPickedName(null); }} className="text-zinc-500 hover:text-white flex-shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ─── GALLERY TAB ─── */}
        {tab === 'gallery' && (
          <div className="p-3 space-y-3">
            <div className="flex gap-2">
              <input
                value={gallerySearch}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Поиск по имени или тесту..."
                className="flex-1 rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
              <button onClick={() => loadGallery(0, gallerySearch)} disabled={galleryLoading}
                className="text-zinc-400 hover:text-white px-2">
                <RefreshCw className={cn("w-3.5 h-3.5", galleryLoading && "animate-spin")} />
              </button>
            </div>

            {galleryLoading && galleryImages.length === 0 && (
              <div className="flex items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /><span className="text-xs">Загружаю...</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-1.5">
              {galleryImages.map((img) => (
                <div key={`${img.testId}/${img.name}`} className="group relative">
                  <button
                    onClick={() => setSelectedGallery(selectedGallery?.name === img.name ? null : img)}
                    className={cn(
                      "w-full aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      selectedGallery?.name === img.name
                        ? "border-violet-500 ring-2 ring-violet-500/40"
                        : "border-zinc-700 hover:border-zinc-500"
                    )}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                    {selectedGallery?.name === img.name && (
                      <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center pointer-events-none">
                        <div className="bg-violet-500 rounded-full p-1"><Check className="w-3 h-3 text-white" /></div>
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {galleryImages.length < galleryTotal && (
              <button onClick={() => loadGallery(galleryPage + 1, gallerySearch)} disabled={galleryLoading}
                className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 rounded-lg transition-colors">
                {galleryLoading ? 'Загружаю...' : `Ещё (${galleryTotal - galleryImages.length} осталось)`}
              </button>
            )}

            {/* Selected image actions */}
            {selectedGallery && (
              <div className="space-y-2 border-t border-zinc-700 pt-3">
                <img src={selectedGallery.url} className="w-full rounded-xl object-contain max-h-48 border border-zinc-700" />
                <p className="text-[10px] text-zinc-500 font-mono truncate">{selectedGallery.testId} / {selectedGallery.name}</p>
                <button
                  onClick={() => pickFromGallery(selectedGallery)}
                  className="w-full rounded-xl py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <BookOpen className="w-4 h-4" />
                  Использовать в уроке →
                </button>
                <CopyBtn url={selectedGallery.url} />
              </div>
            )}
          </div>
        )}

        {/* ─── GENERATE TAB ─── */}
        {tab === 'generate' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
              {(['es', 'ru'] as Lang[]).map(l => (
                <button key={l} onClick={() => setGenLang(l)}
                  className={cn("flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors",
                    genLang === l ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white")}>
                  {l === 'es' ? '🇪🇸 Español' : '🇷🇺 Русский'}
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs text-zinc-400 mb-2 font-medium">Референс из PDF</p>
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "relative rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden",
                  dragOver ? "border-violet-500 bg-violet-500/10" : "border-zinc-600 hover:border-zinc-500",
                  refPreview ? "h-40" : "h-24 flex items-center justify-center"
                )}
              >
                {refPreview
                  ? <img src={refPreview} alt="ref" className="w-full h-full object-contain" />
                  : <div className="text-center space-y-1">
                      <Upload className="w-5 h-5 mx-auto text-zinc-500" />
                      <p className="text-xs text-zinc-500">Перетащи, вставь (Ctrl+V) или кликни</p>
                    </div>
                }
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && loadFile(e.target.files[0])} />
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-400 mb-2 font-medium">Инструкция (опционально)</p>
              <textarea value={genInstruction} onChange={e => setGenInstruction(e.target.value)}
                placeholder="Например: добавь разметку, сделай ночную сцену..."
                rows={2}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500" />
            </div>

            <button onClick={generate} disabled={genLoading || !refBase64}
              className={cn("w-full rounded-xl py-3 font-bold text-sm transition-all flex items-center justify-center gap-2",
                genLoading || !refBase64 ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-500 text-white active:scale-[0.98]")}>
              {genLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Генерирую...</> : <><Wand2 className="w-4 h-4" />Сгенерировать</>}
            </button>

            {genError && <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">❌ {genError}</div>}

            {genResult && (
              <div className="space-y-2">
                <img src={genResult.imageUrl} className="w-full rounded-xl object-contain max-h-64 border border-zinc-700" />
                {genResult.analysis?.description && <p className="text-[11px] text-zinc-500 italic">{genResult.analysis.description}</p>}
                <button onClick={() => setTab('editor')}
                  className="w-full rounded-xl py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98]">
                  <BookOpen className="w-4 h-4" />Добавить в урок →
                </button>
                <CopyBtn url={genResult.imageUrl} />
              </div>
            )}
          </div>
        )}

        {/* ─── EDITOR TAB ─── */}
        {tab === 'editor' && (
          <div className="p-4 space-y-4">
            {/* Picked image preview */}
            {pickedUrl ? (
              <div className="rounded-xl overflow-hidden border border-violet-500/40 bg-violet-500/5">
                <img src={pickedUrl} className="w-full object-contain max-h-36" />
                <p className="text-[10px] text-zinc-500 px-2 py-1 truncate">{pickedName}</p>
              </div>
            ) : (
              <button onClick={() => setTab('gallery')}
                className="w-full rounded-xl border-2 border-dashed border-zinc-700 py-6 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2">
                <Images className="w-4 h-4" />Выбрать картинку из галереи
              </button>
            )}

            {/* Module picker */}
            <div>
              <p className="text-xs text-zinc-400 mb-1.5 font-medium">Модуль</p>
              <select value={selModuleId} onChange={e => { setSelModuleId(e.target.value); setSelLessonId(''); }}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500">
                <option value="">— выберите модуль —</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>{m.emoji} {m.number}. {m.title_es}</option>
                ))}
              </select>
            </div>

            {/* Lesson picker */}
            {selModuleId && (
              <div>
                <p className="text-xs text-zinc-400 mb-1.5 font-medium">Урок</p>
                <select value={selLessonId} onChange={e => setSelLessonId(e.target.value)}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500">
                  <option value="">+ Новый урок</option>
                  {moduleLessons.map(l => (
                    <option key={l.id} value={l.id}>📖 {l.title_es}</option>
                  ))}
                </select>

                {/* New lesson inputs */}
                {!selLessonId && (
                  <div className="mt-2 space-y-2">
                    <input value={newLessonEs} onChange={e => setNewLessonEs(e.target.value)}
                      placeholder="Título del lección (ES) *"
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500" />
                    <input value={newLessonRu} onChange={e => setNewLessonRu(e.target.value)}
                      placeholder="Название урока (RU)"
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500" />
                  </div>
                )}
              </div>
            )}

            {/* Step type */}
            {selModuleId && (
              <>
                <div>
                  <p className="text-xs text-zinc-400 mb-1.5 font-medium">Тип шага</p>
                  <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
                    {(['theory', 'quiz', 'flashcard'] as StepType[]).map(t => (
                      <button key={t} onClick={() => setStepType(t)}
                        className={cn("flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors",
                          stepType === t ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white")}>
                        {t === 'theory' ? '📖 Теория' : t === 'quiz' ? '❓ Квиз' : '🃏 Флэш'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content lang tabs */}
                <div>
                  <div className="flex gap-1 rounded-lg bg-zinc-800 p-1 mb-2">
                    {(['es', 'ru'] as Lang[]).map(l => (
                      <button key={l} onClick={() => setEditorLang(l)}
                        className={cn("flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors",
                          editorLang === l ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white")}>
                        {l === 'es' ? '🇪🇸 ES' : '🇷🇺 RU'}
                      </button>
                    ))}
                  </div>
                  {editorLang === 'es'
                    ? <textarea value={stepTextEs} onChange={e => setStepTextEs(e.target.value)}
                        placeholder="Texto del paso en español..."
                        rows={4}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500" />
                    : <textarea value={stepTextRu} onChange={e => setStepTextRu(e.target.value)}
                        placeholder="Текст шага на русском..."
                        rows={4}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-xs text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500" />
                  }
                </div>

                {/* Save */}
                <button onClick={saveStep} disabled={saving || !selModuleId || (!selLessonId && !newLessonEs)}
                  className={cn("w-full rounded-xl py-3 font-bold text-sm transition-all flex items-center justify-center gap-2",
                    saving || !selModuleId ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-500 text-white active:scale-[0.98]")}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Сохраняю...</> : <><Plus className="w-4 h-4" />Сохранить шаг в БД</>}
                </button>

                {savedStep && (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-xs text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Шаг создан! ID: <span className="font-mono text-[10px]">{savedStep}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
