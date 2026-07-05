/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, Check, Star, BookOpen, Heart, 
  Sparkles, Mail, Lock, X, CheckCircle2, ChevronRight, 
  Eye, Calendar, Users, Award, Shield, FileText, Download, Bell, 
  LayoutDashboard, LogOut, Compass, MapPin, Phone, Globe, Play,
  Send, User, LockKeyhole, FileImage
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  INITIAL_ARTICLES, INITIAL_GALLERY, INITIAL_TEACHERS, 
  INITIAL_UNIFORMS, INITIAL_CASH_TRANSACTIONS, INITIAL_FINE_TRANSACTIONS, 
  INITIAL_NOTIFICATIONS, INITIAL_LOGS, INITIAL_SETTINGS, 
  INITIAL_USERS, TESTIMONIALS, INITIAL_VISION_MISSION 
} from './data';
import { 
  Article, GalleryItem, Teacher, Uniform, CashTransaction, 
  FineTransaction, NotificationItem, ActivityLog, SystemSettings, User as UserType 
} from './types';
import Navbar from './components/Navbar';
import SchoolLogo from './components/SchoolLogo';
import Hero from './components/Hero';
import FeaturesBar from './components/FeaturesBar';
import CourseCard from './components/CourseCard';
import StudentDashboard from './components/StudentDashboard';

export default function App() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('smptamhar_isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('smptamhar_currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'ppdb_interest'>('login');
  
  // Login input states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // PPDB Interest Form states
  const [ppdbStudentName, setPpdbStudentName] = useState('');
  const [ppdbParentPhone, setPpdbParentPhone] = useState('');
  const [ppdbGrade, setPpdbGrade] = useState('7');

  // Password change modal state for first login
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeUser, setPasswordChangeUser] = useState<UserType | null>(null);

  // Navigation active state
  const [activeTab, setActiveTab] = useState('home');
  const [isDashboardOpen, setIsDashboardOpen] = useState(() => {
    return localStorage.getItem('smptamhar_isDashboardOpen') === 'true';
  });

  // School Portal State with Local Storage Persistance
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem('smptamhar_articles');
    return saved ? JSON.parse(saved) : INITIAL_ARTICLES;
  });
  const [gallery, setGallery] = useState<GalleryItem[]>(() => {
    const saved = localStorage.getItem('smptamhar_gallery');
    return saved ? JSON.parse(saved) : INITIAL_GALLERY;
  });
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('smptamhar_teachers');
    return saved ? JSON.parse(saved) : INITIAL_TEACHERS;
  });
  const [uniforms, setUniforms] = useState<Uniform[]>(() => {
    const saved = localStorage.getItem('smptamhar_uniforms');
    return saved ? JSON.parse(saved) : INITIAL_UNIFORMS;
  });
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    const saved = localStorage.getItem('smptamhar_cash');
    return saved ? JSON.parse(saved) : INITIAL_CASH_TRANSACTIONS;
  });
  const [fineTransactions, setFineTransactions] = useState<FineTransaction[]>(() => {
    const saved = localStorage.getItem('smptamhar_fines');
    return saved ? JSON.parse(saved) : INITIAL_FINE_TRANSACTIONS;
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('smptamhar_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });
  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('smptamhar_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('smptamhar_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });
  const [users, setUsers] = useState<UserType[]>(() => {
    const saved = localStorage.getItem('smptamhar_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Active document download simulation target
  const [activeStructureTab, setActiveStructureTab] = useState<'school' | 'osis'>('school');

  // Search query on Landing Page for articles/teachers
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticleCategory, setSelectedArticleCategory] = useState('All');

  // Notifications alerts
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Sync state to local storage on change
  useEffect(() => {
    localStorage.setItem('smptamhar_isLoggedIn', isLoggedIn ? 'true' : 'false');
    localStorage.setItem('smptamhar_currentUser', currentUser ? JSON.stringify(currentUser) : '');
    localStorage.setItem('smptamhar_isDashboardOpen', isDashboardOpen ? 'true' : 'false');
    localStorage.setItem('smptamhar_articles', JSON.stringify(articles));
    localStorage.setItem('smptamhar_gallery', JSON.stringify(gallery));
    localStorage.setItem('smptamhar_teachers', JSON.stringify(teachers));
    localStorage.setItem('smptamhar_uniforms', JSON.stringify(uniforms));
    localStorage.setItem('smptamhar_cash', JSON.stringify(cashTransactions));
    localStorage.setItem('smptamhar_fines', JSON.stringify(fineTransactions));
    localStorage.setItem('smptamhar_notifications', JSON.stringify(notifications));
    localStorage.setItem('smptamhar_logs', JSON.stringify(logs));
    localStorage.setItem('smptamhar_settings', JSON.stringify(settings));
    localStorage.setItem('smptamhar_users', JSON.stringify(users));
  }, [isLoggedIn, currentUser, isDashboardOpen, articles, gallery, teachers, uniforms, cashTransactions, fineTransactions, notifications, logs, settings, users]);

  // Auto-clear alert notices after timeout
  useEffect(() => {
    if (alertMsg) {
      const timer = setTimeout(() => setAlertMsg(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [alertMsg]);

  // Activity logger
  const addActivityLog = (user: string, role: string, action: 'Login' | 'Logout' | 'Tambah' | 'Edit' | 'Hapus' | 'Export', details: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      user,
      role,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Auth Handlers
  const handleLoginClick = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Manual login verification
    const matchedUser = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    
    if (!matchedUser) {
      setAlertMsg({ type: 'error', text: 'ID Pengguna tidak terdaftar! Hubungi Super Admin untuk membuat akun.' });
      return;
    }

    // New user must change password constraint
    if (matchedUser.mustChangePassword) {
      setPasswordChangeUser(matchedUser);
      setIsAuthModalOpen(false);
      setIsPasswordChangeModalOpen(true);
      return;
    }

    // Success login
    setIsLoggedIn(true);
    setCurrentUser(matchedUser);
    setIsAuthModalOpen(false);
    setIsDashboardOpen(true);
    addActivityLog(matchedUser.name, matchedUser.role, 'Login', 'Berhasil masuk ke portal ERP.');
    setAlertMsg({ 
      type: 'success', 
      text: `Selamat datang kembali, ${matchedUser.name}! Membuka Dashboard ERP OSIS (${matchedUser.role}).` 
    });
  };

  // First Password Change Submit
  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAlertMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
      return;
    }
    if (newPassword.length < 6) {
      setAlertMsg({ type: 'error', text: 'Password minimal terdiri dari 6 karakter!' });
      return;
    }

    if (passwordChangeUser) {
      // Update user state to remove mustChangePassword
      const updatedUsers = users.map(u => {
        if (u.id === passwordChangeUser.id) {
          return { ...u, mustChangePassword: false };
        }
        return u;
      });
      setUsers(updatedUsers);

      const loggedUser = { ...passwordChangeUser, mustChangePassword: false };
      setIsLoggedIn(true);
      setCurrentUser(loggedUser);
      setIsPasswordChangeModalOpen(false);
      setIsDashboardOpen(true);
      addActivityLog(loggedUser.name, loggedUser.role, 'Login', 'Ganti password pertama sukses dan masuk dashboard.');
      
      // Post notification
      const newNotif: NotificationItem = {
        id: `n-${Date.now()}`,
        type: 'Reset Password',
        title: 'Ganti Password Pertama Sukses',
        message: `Akun ${loggedUser.name} telah merubah password pertamanya dan aktif secara penuh.`,
        date: new Date().toLocaleString('id-ID'),
        read: false
      };
      setNotifications(prev => [newNotif, ...prev]);

      setAlertMsg({
        type: 'success',
        text: `Password berhasil dirubah! Selamat datang di Portal Login, ${loggedUser.name}.`
      });
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      addActivityLog(currentUser.name, currentUser.role, 'Logout', 'Keluar dari sesi portal ERP.');
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setIsDashboardOpen(false);
    setAlertMsg({ type: 'info', text: 'Anda telah keluar dari sistem secara aman. Terima kasih!' });
  };

  // PPDB Interest Submit
  const handlePpdbInterestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg({
      type: 'success',
      text: `Pernyataan minat untuk calon siswa "${ppdbStudentName}" berhasil dikirim! Panitia PPDB akan segera menghubungi Anda ke nomor ${ppdbParentPhone}.`
    });
    setPpdbStudentName('');
    setPpdbParentPhone('');
    setIsAuthModalOpen(false);
  };

  // Quick login bypass helper
  const handleQuickBypassLogin = (userEmail: string) => {
    const target = users.find(u => u.email === userEmail);
    if (target) {
      if (target.mustChangePassword) {
        setPasswordChangeUser(target);
        setIsAuthModalOpen(false);
        setIsPasswordChangeModalOpen(true);
        return;
      }
      setIsLoggedIn(true);
      setCurrentUser(target);
      setIsAuthModalOpen(false);
      setIsDashboardOpen(true);
      addActivityLog(target.name, target.role, 'Login', `Bypass login sebagai ${target.role}.`);
      setAlertMsg({
        type: 'success',
        text: `Bypass masuk sukses! Selamat datang, ${target.name} (${target.role}).`
      });
    }
  };

  // Filtered Landing Page articles
  const filteredArticles = articles.filter(art => {
    const matchesCategory = selectedArticleCategory === 'All' || art.category === selectedArticleCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-[#070f1e] font-sans selection:bg-amber-400 selection:text-slate-900 text-slate-100">
      
      {/* Interactive Global Alerts */}
      <AnimatePresence>
        {alertMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className={`p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-left ${
              alertMsg.type === 'success' 
                ? 'bg-slate-900 border-amber-400 text-white shadow-amber-400/10' 
                : alertMsg.type === 'error'
                ? 'bg-slate-900 border-rose-500 text-white shadow-rose-500/10'
                : 'bg-slate-900 border-slate-700 text-slate-200'
            }`}>
              <div className={`p-1.5 rounded-lg shrink-0 ${
                alertMsg.type === 'success' ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-amber-400'
              }`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold leading-relaxed flex-grow pr-4">{alertMsg.text}</p>
              <button 
                onClick={() => setAlertMsg(null)}
                className="text-slate-400 hover:text-white shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Navigation Menu */}
      <Navbar 
        isLoggedIn={isLoggedIn}
        onLogin={handleLoginClick}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDashboardToggle={() => setIsDashboardOpen(!isDashboardOpen)}
        isDashboardOpen={isDashboardOpen}
        userName={currentUser ? currentUser.name : ''}
      />

      <AnimatePresence mode="wait">
        {isDashboardOpen && currentUser ? (
          
          /* VIEW 1: IMMERSIVE STUDENT/ADMIN ERP WORKSPACE PORTAL */
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.3 }}
          >
            <StudentDashboard 
              articles={articles}
              setArticles={setArticles}
              gallery={gallery}
              setGallery={setGallery}
              teachers={teachers}
              setTeachers={setTeachers}
              uniforms={uniforms}
              setUniforms={setUniforms}
              cashTransactions={cashTransactions}
              setCashTransactions={setCashTransactions}
              fineTransactions={fineTransactions}
              setFineTransactions={setFineTransactions}
              notifications={notifications}
              setNotifications={setNotifications}
              logs={logs}
              setLogs={setLogs}
              settings={settings}
              setSettings={setSettings}
              users={users}
              setUsers={setUsers}
              currentUser={currentUser}
              onLogout={handleLogout}
              addActivityLog={addActivityLog}
            />
          </motion.div>

        ) : (

          /* VIEW 2: PUBLIC OFFICIAL SCHOOL PORTAL LANDING PAGE */
          <motion.div
            key="landing-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#071324]"
          >
            {/* Hero Banner with overlap indicators */}
            <Hero 
              onExploreCourses={() => {
                const coursesEl = document.getElementById('courses');
                if (coursesEl) coursesEl.scrollIntoView({ behavior: 'smooth' });
              }}
              onHowItWorks={() => {
                const aboutEl = document.getElementById('about');
                if (aboutEl) aboutEl.scrollIntoView({ behavior: 'smooth' });
              }}
              onPlayDemo={() => {
                handleLoginClick();
              }}
            />

            {/* Dark Blue Features Banner */}
            <FeaturesBar />

            {/* TENTANG & PROFIL SEKOLAH (Sejarah, Visi, Misi) */}
            <section id="profil-sekolah" className="py-12 bg-[#091629] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                
                {/* Header */}
                <div className="text-center space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Profil Sekolah</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Mengenal Kami Lebih Dekat
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    SMP Taman Harapan Bekasi berfokus pada pendidikan bermoral, mandiri, berkarakter, dan beriman.
                  </p>
                </div>

                {/* Profile Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  
                  {/* Left Column: Sejarah & Pengantar replaced by the custom image */}
                  <div className="lg:col-span-7 overflow-hidden rounded-3xl border border-slate-800 bg-[#0b203a] flex items-center justify-center">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1eKLOgwJwwB9u1qYf-XfRR3ttsO2pRsIH" 
                      alt="SMP Taman Harapan Bekasi Sejarah" 
                      className="w-full h-full object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Right Column: Visi & Misi (5 cols) */}
                  <div className="lg:col-span-5 bg-[#0e2746] border border-slate-800 p-8 rounded-3xl space-y-6 text-left flex flex-col justify-between">
                    <div className="space-y-4">
                      <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">Arah & Landasan</span>
                      <h3 className="text-2xl font-bold text-white tracking-tight">Visi & Misi Utama</h3>
                      <div className="p-4 bg-[#0b203a]/80 border border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 text-amber-400">Visi:</p>
                        <p className="text-sm text-white font-extrabold tracking-tight leading-relaxed">
                          "{INITIAL_VISION_MISSION.vision}"
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-amber-400">Misi Kami:</p>
                      <ul className="space-y-2.5 text-xs text-slate-300">
                        {INITIAL_VISION_MISSION.mission.slice(0, 4).map((m, i) => (
                          <li key={i} className="flex items-start space-x-2.5">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* UNIFORMS SECTION */}
            <section id="uniforms" className="py-24 bg-[#071324] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                
                {/* Header */}
                <div className="text-center space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <Users className="w-3.5 h-3.5" />
                    <span>Identitas Siswa</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Seragam Resmi Sekolah
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Ketentuan pakaian harian siswa SMP Taman Harapan Bekasi untuk menegakkan disiplin dan kerapihan.
                  </p>
                </div>

                {/* Uniform Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {uniforms.map((un) => (
                    <div key={un.id} className="bg-[#0e223b] border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between text-left hover:border-slate-700 transition-colors">
                      <div className="relative aspect-[4/3] bg-slate-900">
                        <img 
                          src={un.image} 
                          alt={un.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-2 left-2 bg-amber-400 text-slate-900 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {un.days}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-extrabold text-white leading-tight">{un.name}</h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans line-clamp-3">
                            {un.description}
                          </p>
                        </div>
                        <span className="text-[9px] text-amber-400 uppercase font-extrabold tracking-widest mt-2 block">
                          Disiplin Pakaian
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </section>

            {/* STRUKTUR ORGANISASI SEKOLAH & OSIS (Tabbed visual tree) */}
            <section id="struktur-organisasi" className="py-24 bg-[#091629] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
                
                {/* Header */}
                <div className="text-center space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Struktur Organisasi</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Tata Kepengurusan Organisasi
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Hierarki resmi kepengurusan komite sekolah dan fungsionaris pengurus OSIS.
                  </p>
                </div>

                {/* Structure Tab Selector */}
                <div className="flex justify-center">
                  <div className="bg-[#0b1d33] border border-slate-800 p-1.5 rounded-2xl flex space-x-2">
                    <button
                      onClick={() => setActiveStructureTab('school')}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeStructureTab === 'school' 
                          ? 'bg-amber-400 text-slate-900 shadow-md' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Struktur Organisasi Sekolah
                    </button>
                    <button
                      onClick={() => setActiveStructureTab('osis')}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeStructureTab === 'osis' 
                          ? 'bg-amber-400 text-slate-900 shadow-md' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Struktur Organisasi OSIS
                    </button>
                  </div>
                </div>

                {/* Render Selected Structure Tree */}
                <div className="max-w-4xl mx-auto bg-[#0b203a] border border-slate-800 rounded-3xl p-6 sm:p-10 relative">
                  {activeStructureTab === 'school' ? (
                    /* SCHOOL STRUCURE TREE */
                    <div className="space-y-8">
                      {/* Top Node */}
                      <div className="flex justify-center">
                        <div className="bg-[#0f2a4c] border-2 border-amber-400 p-4 rounded-2xl text-center w-72 shadow-lg">
                          <span className="text-[9px] text-amber-400 uppercase tracking-widest font-black block mb-0.5">Kepala Sekolah</span>
                          <h4 className="text-sm font-bold text-white">Heri Kiswanto, M.Pd</h4>
                          <p className="text-[10px] text-slate-400 font-medium">Penanggung Jawab Utama</p>
                        </div>
                      </div>

                      {/* Connection Line */}
                      <div className="h-6 w-0.5 bg-amber-400/30 mx-auto" />

                      {/* Second Tier */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="bg-[#0f2a4c] border border-slate-700 p-4 rounded-2xl text-center shadow">
                          <span className="text-[9px] text-blue-400 uppercase tracking-widest font-black block mb-0.5">Komite Sekolah</span>
                          <h4 className="text-sm font-bold text-white">H. M. Yusuf, M.Si</h4>
                          <p className="text-[10px] text-slate-400">Wakil Orang Tua & Tokoh Masyarakat</p>
                        </div>
                        <div className="bg-[#0f2a4c] border border-slate-700 p-4 rounded-2xl text-center shadow">
                          <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black block mb-0.5">Wakil Kepala Sekolah</span>
                          <h4 className="text-sm font-bold text-white">Dra. Endang Lestari</h4>
                          <p className="text-[10px] text-slate-400">Kurikulum & Humas Sekolah</p>
                        </div>
                      </div>

                      {/* Connection Line */}
                      <div className="h-6 w-0.5 bg-amber-400/30 mx-auto" />

                      {/* Third Tier */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#071930] border border-slate-800 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Tata Usaha</span>
                          <h5 className="text-xs font-bold text-white">Rina Susanti, A.Md</h5>
                        </div>
                        <div className="bg-[#071930] border border-slate-800 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Pembina OSIS</span>
                          <h5 className="text-xs font-bold text-white">Budi Hermawan, S.Kom</h5>
                        </div>
                        <div className="bg-[#071930] border border-slate-800 p-3.5 rounded-xl text-center">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Kesiswaan</span>
                          <h5 className="text-xs font-bold text-white">Ratna Sari, S.Pd</h5>
                        </div>
                      </div>

                      {/* Simulated Download button */}
                      <div className="pt-6 border-t border-slate-800/60 flex justify-center">
                        <button 
                          onClick={() => setAlertMsg({ type: 'success', text: 'Mengunduh Dokumen Struktur Organisasi Sekolah (PDF)... 📄' })}
                          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Download Struktur Sekolah (PDF)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* OSIS STRUCTURE TREE */
                    <div className="space-y-8">
                      {/* Top Node */}
                      <div className="flex justify-center">
                        <div className="bg-[#0f2a4c] border-2 border-amber-400 p-4 rounded-2xl text-center w-72 shadow-lg">
                          <span className="text-[9px] text-amber-400 uppercase tracking-widest font-black block mb-0.5">Ketua OSIS</span>
                          <h4 className="text-sm font-bold text-white">Aditya Pratama</h4>
                          <p className="text-[10px] text-slate-400 font-medium">Periode Bhakti 2026/2027</p>
                        </div>
                      </div>

                      {/* Connection Line */}
                      <div className="h-6 w-0.5 bg-amber-400/30 mx-auto" />

                      {/* Second Tier */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="bg-[#0f2a4c] border border-slate-700 p-4 rounded-2xl text-center shadow">
                          <span className="text-[9px] text-blue-400 uppercase tracking-widest font-black block mb-0.5">Sekretaris OSIS</span>
                          <h4 className="text-sm font-bold text-white">Fajar Hidayat</h4>
                          <p className="text-[10px] text-slate-400">Koordinator Administrasi Surat</p>
                        </div>
                        <div className="bg-[#0f2a4c] border border-slate-700 p-4 rounded-2xl text-center shadow">
                          <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-black block mb-0.5">Bendahara OSIS</span>
                          <h4 className="text-sm font-bold text-white">Siti Rahmawati</h4>
                          <p className="text-[10px] text-slate-400">Pengelola & Penanggung Jawab Kas</p>
                        </div>
                      </div>

                      {/* Connection Line */}
                      <div className="h-6 w-0.5 bg-amber-400/30 mx-auto" />

                      {/* Third Tier: Sekbid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-[#071930] border border-slate-800 p-3 rounded-xl text-center">
                          <span className="text-[8px] text-slate-400 uppercase font-bold block mb-0.5">Sekbid I</span>
                          <h5 className="text-[11px] font-bold text-white">Iman & Taqwa</h5>
                        </div>
                        <div className="bg-[#071930] border border-slate-800 p-3 rounded-xl text-center">
                          <span className="text-[8px] text-slate-400 uppercase font-bold block mb-0.5">Sekbid II</span>
                          <h5 className="text-[11px] font-bold text-white">Budi Pekerti</h5>
                        </div>
                        <div className="bg-[#071930] border border-slate-800 p-3 rounded-xl text-center">
                          <span className="text-[8px] text-slate-400 uppercase font-bold block mb-0.5">Sekbid III</span>
                          <h5 className="text-[11px] font-bold text-white">Pramuka & Bela Negara</h5>
                        </div>
                        <div className="bg-[#071930] border border-slate-800 p-3 rounded-xl text-center">
                          <span className="text-[8px] text-slate-400 uppercase font-bold block mb-0.5">Sekbid IV</span>
                          <h5 className="text-[11px] font-bold text-white">Kesenian & Olahraga</h5>
                        </div>
                      </div>

                      {/* Simulated Download button */}
                      <div className="pt-6 border-t border-slate-800/60 flex justify-center">
                        <button 
                          onClick={() => setAlertMsg({ type: 'success', text: 'Mengunduh Dokumen AD/ART & Struktur OSIS (PDF)... 📄' })}
                          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Download AD/ART OSIS (PDF)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* ARTIKEL & KEGIATAN SEKOLAH (Courses block) */}
            <section id="courses" className="py-24 bg-[#071324] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
                
                {/* Section Header */}
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="inline-flex items-center space-x-1.5 text-amber-400 font-extrabold text-xs uppercase tracking-widest bg-amber-400/10 px-3.5 py-1.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Kabar Sekolah</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Berita & Kegiatan Terbaru
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Ikuti artikel seputar program OSIS, agenda kegiatan P5, serta prestasi membanggakan SMP Taman Harapan Bekasi.
                  </p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto bg-[#0b1d33] border border-slate-800 p-4 rounded-2xl">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Berita', 'Kegiatan', 'Prestasi', 'OSIS'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedArticleCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedArticleCategory === cat 
                            ? 'bg-amber-400 text-slate-900 shadow' 
                            : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Text Search input */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Cari berita..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                    />
                  </div>
                </div>

                {/* Articles Grid */}
                {filteredArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {filteredArticles.map((art) => (
                      <CourseCard 
                        key={art.id}
                        course={art}
                        isLoggedIn={isLoggedIn}
                        isEnrolled={false}
                        onSelect={(id) => {
                          // Preview complete article content by toggling login
                          const matched = articles.find(a => a.id === id);
                          if (matched) {
                            setAlertMsg({
                              type: 'info',
                              text: `Membuka artikel: "${matched.title}". Portal Login untuk mengelola kontribusi penulisan.`
                            });
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-slate-500 text-sm">
                    Tidak ada berita atau artikel yang cocok dengan pencarian Anda.
                  </div>
                )}

              </div>
            </section>

            {/* GURU & STAFF PENGAJAR + VISI MISI (#about Section wrapper) */}
            <section id="about" className="py-24 bg-[#091629] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
                
                {/* Section Header */}
                <div className="space-y-4 max-w-xl mx-auto">
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest">
                    Staf Pengajar
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight">Dewan Guru & Pembina</h2>
                  <p className="text-sm text-slate-400 font-medium">
                    Didukung oleh pendidik profesional yang berdedikasi membangun akhlak dan mengarahkan potensi murid.
                  </p>
                </div>

                {/* Teachers Grid Layout */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-5xl mx-auto text-left">
                  {teachers.map((teach) => (
                    <div key={teach.id} className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-colors">
                      <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-900 border border-slate-800">
                        <img 
                          src={teach.image} 
                          alt={teach.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="bg-amber-400/10 text-amber-300 text-[9px] font-extrabold uppercase px-2 py-1 rounded-md">
                        {teach.position}
                      </span>
                      <h4 className="text-sm font-extrabold text-white tracking-tight mt-2.5">{teach.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{teach.subject}</p>
                    </div>
                  ))}
                </div>

                {/* Testimonial Sub-block (What Our Students/Parents Say) */}
                <div className="space-y-12 max-w-4xl mx-auto pt-16 border-t border-slate-800/80">
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Aspirasi Wali Murid & Alumni</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    {TESTIMONIALS.map((t, idx) => (
                      <div key={idx} className="bg-[#0b203a] border border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 relative">
                        <div className="absolute top-6 right-6 text-amber-400/20 text-5xl font-serif leading-none">“</div>
                        <p className="text-xs text-slate-300 leading-relaxed italic pr-8">
                          {t.quote}
                        </p>
                        <div className="flex items-center space-x-3 pt-4 border-t border-slate-800">
                          <img 
                            src={t.image} 
                            alt={t.name} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{t.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{t.role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </section>

            {/* PPDB & REGISTER INTEREST (Pricing section) */}
            <section id="pricing" className="py-24 bg-[#071324] border-b border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-16">
                
                {/* Header */}
                <div className="space-y-4 max-w-xl mx-auto">
                  <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-3.5 py-1.5 rounded-full uppercase tracking-widest">PPDB TP 2026/2027</span>
                  <h2 className="text-3xl font-black text-white tracking-tight">Registrasi Calon Siswa Baru</h2>
                  <p className="text-sm text-slate-400 font-medium">Beban biaya masuk reguler transparan terperinci guna menjamin kenyamanan belajar.</p>
                </div>

                {/* Pricing layout adapted to School PPDB package */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch max-w-4xl mx-auto">
                  
                  {/* Left Column: Form Minat (7 cols) */}
                  <div className="md:col-span-6 bg-[#0b203a] border border-slate-800 p-8 rounded-3xl text-left flex flex-col justify-between">
                    <div className="space-y-4">
                      <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wide">Peminat Online</span>
                      <h3 className="text-lg font-extrabold text-white tracking-tight">Formulir Kirim Minat PPDB</h3>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        Silakan isikan data awal putra-putri Anda. Panitia PPDB akan segera menghubungi Anda melalui WhatsApp untuk kelengkapan berkas fisik.
                      </p>
                    </div>

                    <form onSubmit={handlePpdbInterestSubmit} className="space-y-3.5 mt-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nama Lengkap Anak</label>
                        <input
                          type="text"
                          required
                          value={ppdbStudentName}
                          onChange={(e) => setPpdbStudentName(e.target.value)}
                          placeholder="e.g. Ahmad Syuhada"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor WhatsApp Wali</label>
                        <input
                          type="text"
                          required
                          value={ppdbParentPhone}
                          onChange={(e) => setPpdbParentPhone(e.target.value)}
                          placeholder="e.g. 0812XXXXXXXX"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rencana Masuk Kelas</label>
                        <select
                          value={ppdbGrade}
                          onChange={(e) => setPpdbGrade(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-medium"
                        >
                          <option value="7">Kelas VII (7) SMP</option>
                          <option value="8">Pindahan Kelas VIII (8)</option>
                          <option value="9">Pindahan Kelas IX (9)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3 rounded-xl text-xs tracking-wide cursor-pointer transition-colors"
                      >
                        Kirim Pernyataan Minat PPDB
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Rincian Biaya (6 cols) */}
                  <div className="md:col-span-6 bg-[#0e2746] text-white p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6 text-left relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl" />
                    
                    <div className="space-y-4">
                      <span className="bg-amber-400 text-slate-900 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wide">Paket Registrasi</span>
                      <h3 className="text-xl font-black tracking-tight">Biaya Formulir PPDB</h3>
                      <p className="text-xs text-slate-400">Pendaftaran formulir seleksi, berkas fisik, dan tes pemetaan minat kepemimpinan Bermata Hati.</p>
                    </div>

                    <div className="flex items-baseline space-x-2">
                      <span className="text-4xl font-black text-white font-display">Rp 150.000</span>
                      <span className="text-[10px] text-slate-400 font-semibold">Sekali Pembayaran</span>
                    </div>

                    <ul className="space-y-3 text-xs font-semibold text-slate-300">
                      {[
                        'Formulir pendaftaran fisik & online',
                        'Materi tes pemetaan akademik kepemimpinan',
                        'Akses Akun sistem ERP OSIS (Mandiri)',
                        'Merchandise pin logo Bermata Hati'
                      ].map((feat, i) => (
                        <li key={i} className="flex items-center space-x-2.5">
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => {
                        setAuthMode('ppdb_interest');
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full bg-amber-400 hover:bg-amber-300 text-slate-900 py-3 rounded-xl text-xs font-bold shadow-lg transition-all text-center cursor-pointer"
                    >
                      Daftar Via Formulir Online
                    </button>
                  </div>

                </div>
              </div>
            </section>

            {/* Bottom Call to Action banner */}
            <section className="py-24 bg-[#091629]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div 
                  className="bg-[#0b203a] text-white rounded-[32px] p-8 sm:p-12 lg:p-16 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12 border border-slate-800 shadow-2xl text-left"
                  id="cta-bottom-banner"
                >
                  <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Left elements: Badge and heading */}
                  <div className="space-y-6 max-w-xl">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white p-2 rounded-2xl shadow-lg shrink-0 flex items-center justify-center">
                        <SchoolLogo className="w-11 h-11" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">Ayo Bergabung Bersama Kami</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Kuota Terbatas. Wujudkan generasi cerdas Bermata Hati.</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                      Jadilah bagian dari keluarga besar SMP Taman Harapan Bekasi. Di sini, kecerdasan akademis diasah seimbang dengan kematangan spiritual nurani.
                    </p>
                  </div>

                  {/* Right elements: buttons */}
                  <div className="space-y-4 shrink-0 w-full lg:w-auto text-left lg:text-right">
                    <button
                      onClick={handleLoginClick}
                      className="w-full lg:w-auto group flex items-center justify-center space-x-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg cursor-pointer text-sm"
                      id="cta-get-started-btn"
                    >
                      <span>Masuk Portal Login</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <div className="flex items-center justify-center lg:justify-start space-x-2 text-slate-400 text-xs">
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Pelayanan Administrasi OSIS Digital</span>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Corporate/School footer section */}
            <footer className="bg-[#050e1b] text-slate-400 py-16 border-t border-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                
                {/* Column 1: School Identity */}
                <div className="md:col-span-5 space-y-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-white p-1 rounded-lg flex items-center justify-center">
                      <SchoolLogo className="w-7 h-7" />
                    </div>
                    <span className="text-base font-black text-white tracking-tight">SMP TAMAN HARAPAN</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
                    {settings.address}
                  </p>
                  <p className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest leading-none">
                    Slogan Resmi: "Bermata Hati"
                  </p>
                  
                  {/* Google Maps Iframe */}
                  <div className="w-full max-w-sm pt-2">
                    <iframe 
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.1158652936746!2d106.97495577587848!3d-6.248493193740057!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e698c2574e4029b%3A0xc34b07174dbfa3e2!2sSMP%20Taman%20Harapan%20Bekasi!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid" 
                      width="100%" 
                      height="150" 
                      style={{ border: 0 }} 
                      allowFullScreen={true} 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-xl border border-slate-800"
                    />
                  </div>
                </div>

                {/* Column 2: Quick Navigation */}
                <div className="md:col-span-3 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Navigasi Cepat</h4>
                  <ul className="space-y-2 text-xs font-semibold">
                    {[
                      { id: 'home', label: 'Beranda' },
                      { id: 'courses', label: 'Berita & Artikel' },
                      { id: 'features', label: 'Keunggulan' },
                      { id: 'uniforms', label: 'Seragam' },
                      { id: 'pricing', label: 'PPDB 2026/2027' },
                      { id: 'about', label: 'Profil & Guru' }
                    ].map((link) => (
                      <li key={link.id}>
                        <button 
                          onClick={() => {
                            const el = document.getElementById(link.id);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }} 
                          className="hover:text-amber-400 transition-colors cursor-pointer text-slate-400"
                        >
                          {link.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 3: Contact details */}
                <div className="md:col-span-4 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase text-white tracking-wider">Kontak & Hubungi Kami</h4>
                  <div className="space-y-3 text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                      <a href={settings.website} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-amber-400 transition-colors">
                        Website Resmi Tamhar
                      </a>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{settings.phone} / WA: {settings.whatsapp}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Instagram: {settings.instagram}</span>
                    </div>
                  </div>
                  
                  {/* Social links simulation */}
                  <div className="pt-2 flex space-x-3">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 cursor-pointer hover:bg-slate-850">
                      <span className="text-xs font-black">FB</span>
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 cursor-pointer hover:bg-slate-850">
                      <span className="text-xs font-black">IG</span>
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-amber-400 cursor-pointer hover:bg-slate-850">
                      <span className="text-xs font-black">YT</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800/60 text-center text-xs text-slate-500">
                <p>© 2026 SMP TAMAN HARAPAN BEKASI. Slogan Resmi: <strong>"Bermata Hati"</strong>. Hak Cipta Dilindungi.</p>
              </div>
            </footer>

          </motion.div>
        )}
      </AnimatePresence>

      {/* LOGIN & SIGNUP DIALOG POPUP MODAL */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-left relative overflow-hidden text-slate-100"
              id="auth-modal"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border border-transparent"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                
                {/* Modal Title */}
                <div className="space-y-1 text-center">
                  <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3 p-1">
                    <SchoolLogo className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">
                    {authMode === 'login' ? 'Masuk Portal Login' : 'Form Minat Pendaftaran PPDB'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {authMode === 'login' 
                      ? 'Kelola artikel, dokumentasi, kas, denda, dan data sekolah.' 
                      : 'Isi formulir online minat sekolah baru secara langsung.'}
                  </p>
                </div>

                {/* Form */}
                {authMode === 'login' ? (
                  /* LOGIN FORM */
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Pengguna / Username ERP</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="e.g. bendahara.osis atau superadmin"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi</label>
                        <button type="button" className="text-xs font-bold text-amber-400 hover:underline">Lupa Sandi?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-400 hover:bg-amber-350 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg text-center cursor-pointer"
                    >
                      Masuk & Buka Dashboard ERP
                    </button>
                  </form>
                ) : (
                  /* PPDB ONLINE FORM IN MODAL */
                  <form onSubmit={handlePpdbInterestSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nama Lengkap Calon Siswa</label>
                      <input
                        type="text"
                        required
                        value={ppdbStudentName}
                        onChange={(e) => setPpdbStudentName(e.target.value)}
                        placeholder="e.g. Ahmad Syuhada"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor WhatsApp Wali</label>
                      <input
                        type="text"
                        required
                        value={ppdbParentPhone}
                        onChange={(e) => setPpdbParentPhone(e.target.value)}
                        placeholder="e.g. 0812XXXXXXXX"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rencana Masuk</label>
                      <select
                        value={ppdbGrade}
                        onChange={(e) => setPpdbGrade(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400 font-medium text-slate-300"
                      >
                        <option value="7">Kelas VII (7) SMP</option>
                        <option value="8">Pindahan Kelas VIII (8)</option>
                        <option value="9">Pindahan Kelas IX (9)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-400 hover:bg-amber-350 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition-all text-center cursor-pointer"
                    >
                      Kirim Minat Sekarang
                    </button>
                  </form>
                )}

                {/* Switch Modes */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400 font-semibold">
                    {authMode === 'login' ? "Ingin mendaftarkan murid baru?" : 'Sudah memiliki akun?'}
                    <button
                      onClick={() => setAuthMode(authMode === 'login' ? 'ppdb_interest' : 'login')}
                      className="text-amber-400 hover:underline font-bold ml-1.5 cursor-pointer"
                    >
                      {authMode === 'login' ? 'PPDB Formulir Online' : 'Portal Login'}
                    </button>
                  </p>
                </div>



              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORCE CHANGE PASSWORD DIALOG MODAL */}
      <AnimatePresence>
        {isPasswordChangeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b1d33] border border-rose-500/40 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-left relative overflow-hidden text-slate-100"
            >
              <div className="space-y-5">
                <div className="bg-rose-500/10 text-rose-400 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3 border border-rose-500/20">
                  <LockKeyhole className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1.5 text-center">
                  <h3 className="text-lg font-extrabold text-white tracking-tight">
                    Ganti Password Pertama Anda
                  </h3>
                  <p className="text-xs text-slate-400">
                    Demi keamanan akun yang dibuat oleh Super Admin, Anda diwajibkan mengganti kata sandi default sebelum mengakses sistem ERP OSIS.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl space-y-1 text-xs">
                  <p className="text-slate-300 font-bold">Identitas Akun:</p>
                  <p className="text-slate-400">Nama: <span className="text-white font-extrabold">{passwordChangeUser?.name}</span></p>
                  <p className="text-slate-400">Email: <span className="text-white font-mono">{passwordChangeUser?.email}</span></p>
                  <p className="text-slate-400">Hak Akses: <span className="text-amber-400 font-extrabold uppercase">{passwordChangeUser?.role}</span></p>
                </div>

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Baru</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Konfirmasi Kata Sandi Baru</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 rounded-xl text-xs tracking-wider cursor-pointer shadow shadow-rose-600/30 transition-colors uppercase"
                  >
                    Simpan Password & Portal Login
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
