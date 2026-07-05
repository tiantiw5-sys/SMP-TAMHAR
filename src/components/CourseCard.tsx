/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, Calendar, User, ArrowRight, Heart } from 'lucide-react';
import { Article } from '../types';
import { motion } from 'motion/react';

interface CourseCardProps {
  key?: any;
  course: any; // using any to stay compatible with App.tsx or we can type as Article
  isLoggedIn: boolean;
  isEnrolled: boolean;
  onEnroll?: (id: string) => void;
  onSelect: (id: string) => void;
}

export default function CourseCard({
  course: articleRaw,
  onSelect
}: CourseCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const article = articleRaw as Article;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Berita':
        return 'bg-blue-600 text-white';
      case 'Kegiatan':
        return 'bg-emerald-600 text-white';
      case 'Prestasi':
        return 'bg-amber-500 text-slate-900';
      case 'OSIS':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full text-left"
      id={`article-card-${article.id}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 shrink-0">
        <img
          src={article.image || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600'}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          referrerPolicy="no-referrer"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${getCategoryColor(article.category)} shadow-md`}>
            {article.category}
          </span>
        </div>

        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className={`absolute top-4 right-4 p-2 rounded-xl backdrop-blur-md transition-all duration-200 cursor-pointer ${
            isLiked 
              ? 'bg-rose-500 text-white shadow-lg' 
              : 'bg-slate-900/40 text-white hover:bg-slate-950/60'
          }`}
          aria-label="Toggle Like"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col flex-grow space-y-4">
        
        {/* Date and Views */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{article.date}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>{article.viewsCount} x dibaca</span>
          </div>
        </div>

        {/* Title and Excerpt */}
        <div className="space-y-2">
          <h3 
            onClick={() => onSelect(article.id)}
            className="text-base font-extrabold text-slate-900 leading-snug tracking-tight hover:text-amber-500 transition-colors cursor-pointer line-clamp-2"
          >
            {article.title}
          </h3>
          
          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-sans">
            {article.excerpt}
          </p>
        </div>

        {/* Author */}
        <div className="flex items-center space-x-3 pt-4 border-t border-slate-100 mt-auto">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-xs font-bold text-slate-800 leading-none truncate">{article.author}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">Kontributor Sekolah</p>
          </div>
          
          <button
            onClick={() => onSelect(article.id)}
            className="flex items-center space-x-1 text-xs font-extrabold text-amber-500 hover:text-amber-400 cursor-pointer shrink-0"
          >
            <span>Baca</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </motion.div>
  );
}
