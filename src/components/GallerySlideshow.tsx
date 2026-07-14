/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { GalleryItem } from '../types';

interface GallerySlideshowProps {
  items: GalleryItem[];
}

const AUTOPLAY_MS = 5000;

export default function GallerySlideshow({ items }: GallerySlideshowProps) {
  const slides = items.filter((item) => item.type === 'Photo').slice(0, 8);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused]);

  if (slides.length === 0) return null;

  const goTo = (i: number) => setIndex((i + slides.length) % slides.length);

  return (
    <section
      className="relative bg-[#071324] py-5 sm:py-6 border-b border-slate-800 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-1 max-w-xl mx-auto mb-3">
          <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-[10px] uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
            <Images className="w-3 h-3" />
            <span>SMP TAMAN HARAPAN</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            ANNOUNCEMENT
          </h2>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-video bg-slate-900">
          <AnimatePresence mode="wait">
            <motion.div
              key={slides[index].id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img
                src={slides[index].url}
                alt={slides[index].caption}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-5 sm:p-6">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">{slides[index].album}</p>
                <p className="text-sm sm:text-base text-white font-semibold">{slides[index].caption}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {slides.length > 1 && (
            <>
              <button
                onClick={() => goTo(index - 1)}
                aria-label="Sebelumnya"
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-slate-950/60 hover:bg-slate-950/90 text-white rounded-full p-2 cursor-pointer transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => goTo(index + 1)}
                aria-label="Berikutnya"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-950/60 hover:bg-slate-950/90 text-white rounded-full p-2 cursor-pointer transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === index ? 'w-6 bg-amber-400' : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
