/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { PenTool, ClipboardList, X, Trash2, Copy, Check, RotateCcw, Undo2, Eraser, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { AnnotationItem } from '../lib/portalDb';
import { getSupabase } from '../lib/supabase';

// Screenshot annotation dulu disimpan sebagai base64 LANGSUNG di JSON
// (imageDataUrl) — ~80KB/item, gampang bikin blob koleksi 'annotations'
// membengkak ratusan KB dan ikut ter-broadcast utuh lewat Realtime tiap ada
// 1 perubahan. Sekarang gambarnya diupload ke Supabase Storage (bucket
// "annotations"), JSON cuma nyimpen URL publiknya — blob jadi kecil lagi.
const ANNOTATIONS_BUCKET = 'annotations';

const uploadAnnotationImage = async (id: string, blob: Blob): Promise<string | null> => {
  const supabase = getSupabase();
  if (!supabase) return null;
  const path = `${id}.jpg`;
  const { error } = await supabase.storage
    .from(ANNOTATIONS_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) {
    console.error('[AnnotationMode] Gagal upload screenshot:', error.message);
    return null;
  }
  const { data } = supabase.storage.from(ANNOTATIONS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

interface AnnotationModeProps {
  enabled: boolean;
  authorName: string;
  annotations: AnnotationItem[];
  setAnnotations: React.Dispatch<React.SetStateAction<AnnotationItem[]>>;
}

type MarkerColor = 'red' | 'yellow';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  color: MarkerColor;
  points: Point[];
}

const STROKE_STYLE: Record<MarkerColor, { stroke: string; width: number }> = {
  red: { stroke: 'rgba(239, 68, 68, 0.85)', width: 8 },
  yellow: { stroke: 'rgba(250, 204, 21, 0.5)', width: 24 },
};

const getCurrentSectionLabel = (): string => {
  const idEls = Array.from(document.querySelectorAll('[id]'));
  for (const el of idEls) {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      return `#${el.id}`;
    }
  }
  return document.title || 'Halaman';
};

const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
  if (stroke.points.length < 2) return;
  const style = STROKE_STYLE[stroke.color];
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  ctx.stroke();
};

export default function AnnotationMode({ enabled, authorName, annotations, setAnnotations }: AnnotationModeProps) {
  const [mode, setMode] = useState<'idle' | 'draw'>('idle');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState<MarkerColor>('red');
  const [noteText, setNoteText] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);

  useEffect(() => {
    if (!enabled) {
      setMode('idle');
      setIsPanelOpen(false);
    }
  }, [enabled]);

  const redrawAll = (list: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    list.filter(Boolean).forEach((s) => drawStroke(ctx, s));
  };

  useEffect(() => {
    if (mode === 'draw') redrawAll(strokes);
  }, [mode, strokes]);

  const startCapture = async () => {
    setIsCapturing(true);
    try {
      const canvas = await html2canvas(document.body, {
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        scale: 1,
        useCORS: true,
        backgroundColor: '#0b1a30',
        ignoreElements: (el) => Boolean((el as Element).closest?.('[data-annotation-ui]')),
      });
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
      setViewportSize({ w: canvas.width, h: canvas.height });
      setStrokes([]);
      setNoteText('');
      setMode('draw');
    } catch (err) {
      console.error('[AnnotationMode] Gagal mengambil screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const cancelDraw = () => {
    setMode('idle');
    setCapturedImage(null);
    setStrokes([]);
    setNoteText('');
  };

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    currentStrokeRef.current = { color, points: [getPoint(e)] };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const point = getPoint(e);
    const stroke = currentStrokeRef.current;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && stroke.points.length > 0) {
      const last = stroke.points[stroke.points.length - 1];
      const style = STROKE_STYLE[stroke.color];
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    stroke.points.push(point);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const finished = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (finished) {
      setStrokes((prev) => [...prev, finished]);
    }
  };

  const undoStroke = () => setStrokes((prev) => prev.slice(0, -1));
  const clearStrokes = () => setStrokes([]);

  const saveAnnotation = () => {
    if (!capturedImage || strokes.length === 0) return;
    const bg = new Image();
    bg.onload = () => {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = viewportSize.w;
      finalCanvas.height = viewportSize.h;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(bg, 0, 0, finalCanvas.width, finalCanvas.height);
      if (canvasRef.current) ctx.drawImage(canvasRef.current, 0, 0);

      const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setIsSaving(true);

      // Upload sebagai file ke Storage (bukan base64 di JSON) — lihat
      // uploadAnnotationImage di atas untuk alasannya.
      finalCanvas.toBlob(
        async (blob) => {
          const publicUrl = blob ? await uploadAnnotationImage(id, blob) : null;
          const item: AnnotationItem = {
            id,
            note: noteText.trim(),
            pageLabel: getCurrentSectionLabel(),
            elementLabel: `scrollY:${Math.round(window.scrollY)}px`,
            imageDataUrl: publicUrl ?? undefined,
            createdAt: new Date().toISOString(),
            status: 'open',
            authorName,
          };
          setAnnotations((prev) => [item, ...prev]);
          setIsSaving(false);
          cancelDraw();
        },
        'image/jpeg',
        0.75
      );
    };
    bg.src = capturedImage;
  };

  const toggleStatus = (id: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === 'open' ? 'done' : 'open' } : a))
    );
  };

  const removeNote = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    const supabase = getSupabase();
    if (supabase) {
      void supabase.storage.from(ANNOTATIONS_BUCKET).remove([`${id}.jpg`]);
    }
  };

  const copyAll = async () => {
    const openNotes = annotations.filter((a) => a.status === 'open');
    const text = openNotes
      .map((a, i) => `${i + 1}. [${a.pageLabel}] ${a.note || '(tanpa catatan teks, lihat gambar)'}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text || 'Belum ada catatan.');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — no-op.
    }
  };

  if (!enabled) return null;

  const openCount = annotations.filter((a) => a.status === 'open').length;

  return (
    <div data-annotation-ui className="font-sans">
      {/* Floating toggle buttons (hidden while actively drawing) */}
      {mode === 'idle' && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
          {openCount > 0 && (
            <button
              onClick={() => setIsPanelOpen(true)}
              className="relative bg-slate-900 border border-slate-700 hover:border-amber-400 text-white rounded-full p-3.5 shadow-xl cursor-pointer transition-colors"
              title="Daftar Catatan"
            >
              <ClipboardList className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                {openCount}
              </span>
            </button>
          )}
          <button
            onClick={startCapture}
            disabled={isCapturing}
            className="rounded-full p-3.5 shadow-xl cursor-pointer transition-colors flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 disabled:opacity-60"
            title="Tandai dengan Spidol"
          >
            {isCapturing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
          </button>
        </div>
      )}

      {/* Full-screen marker drawing overlay */}
      {mode === 'draw' && capturedImage && (
        <div className="fixed inset-0 z-[120] bg-slate-950 overflow-auto">
          <div className="relative" style={{ width: viewportSize.w, height: viewportSize.h }}>
            <img
              src={capturedImage}
              alt="Tangkapan layar"
              className="absolute top-0 left-0 pointer-events-none select-none"
              style={{ width: viewportSize.w, height: viewportSize.h }}
            />
            <canvas
              ref={canvasRef}
              width={viewportSize.w}
              height={viewportSize.h}
              className="absolute top-0 left-0 touch-none"
              style={{ width: viewportSize.w, height: viewportSize.h, cursor: 'crosshair' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          {/* Toolbar */}
          <div data-annotation-ui className="fixed bottom-0 inset-x-0 bg-[#0b1d33] border-t border-slate-800 p-4 shadow-2xl">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setColor('red')}
                  className={`w-8 h-8 rounded-full border-2 cursor-pointer ${color === 'red' ? 'border-white scale-110' : 'border-transparent'} transition-transform`}
                  style={{ backgroundColor: 'rgba(239,68,68,0.9)' }}
                  title="Spidol Merah"
                />
                <button
                  onClick={() => setColor('yellow')}
                  className={`w-8 h-8 rounded-full border-2 cursor-pointer ${color === 'yellow' ? 'border-white scale-110' : 'border-transparent'} transition-transform`}
                  style={{ backgroundColor: 'rgba(250,204,21,0.9)' }}
                  title="Highlighter Kuning"
                />
                <button onClick={undoStroke} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer" title="Undo">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={clearStrokes} className="p-2 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-slate-800 cursor-pointer" title="Hapus Semua Coretan">
                  <Eraser className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Catatan singkat (opsional): 'ganti foto ini', 'tulisan kurang jelas'..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />

              <div className="flex items-center gap-2 shrink-0">
                <button onClick={cancelDraw} className="px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={saveAnnotation}
                  disabled={strokes.length === 0 || isSaving}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Coretan'}
                </button>
              </div>
            </div>
            {strokes.length === 0 && (
              <p className="text-center text-[10px] text-slate-500 mt-2">Coret dulu bagian yang ingin ditandai sebelum menyimpan.</p>
            )}
          </div>
        </div>
      )}

      {/* Notes list panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <div data-annotation-ui className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-white">Daftar Catatan ({annotations.length})</h3>
                <button onClick={() => setIsPanelOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={copyAll}
                className="mb-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-xl text-xs font-bold text-slate-300 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Semua Catatan Terbuka sebagai Teks'}</span>
              </button>

              <div className="overflow-y-auto space-y-2 flex-1">
                {annotations.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8">Belum ada catatan.</p>
                )}
                {annotations.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl border flex gap-3 ${a.status === 'done' ? 'border-slate-800 bg-slate-900/40 opacity-60' : 'border-slate-800 bg-slate-900/80'}`}
                  >
                    {a.imageDataUrl && (
                      <img
                        src={a.imageDataUrl}
                        alt="Coretan"
                        onClick={() => setLightbox(a.imageDataUrl!)}
                        className="w-20 h-14 object-cover rounded-lg border border-slate-800 cursor-zoom-in shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">{a.pageLabel}</p>
                          <p className={`text-xs text-white mt-0.5 ${a.status === 'done' ? 'line-through' : ''}`}>
                            {a.note || '(tanpa catatan teks)'}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1 truncate">
                            {new Date(a.createdAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleStatus(a.id)}
                            title={a.status === 'open' ? 'Tandai Selesai' : 'Buka Lagi'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 cursor-pointer"
                          >
                            {a.status === 'open' ? <Check className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => removeNote(a.id)}
                            title="Hapus"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image lightbox */}
      <AnimatePresence>
        {lightbox && (
          <div
            data-annotation-ui
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/90"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              src={lightbox}
              alt="Coretan penuh"
              className="max-w-full max-h-full rounded-lg shadow-2xl"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
