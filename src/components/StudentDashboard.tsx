/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BarChart3, FileText, FileImage, Users, User, Shield, 
  Settings, Key, Trash2, Plus, Edit3, Download, LogOut, 
  AlertTriangle, Calendar, CheckCircle2, TrendingUp, TrendingDown,
  Sparkles, Filter, X, ArrowUpRight, Search, Menu, Eye, EyeOff,
  Globe, MapPin, Activity, Wifi, Clock,
  LayoutDashboard as LayoutDashboardIcon, ChevronUp, ChevronDown
} from 'lucide-react';
import { 
  Article, GalleryItem, Teacher, Uniform, CashTransaction, 
  FineTransaction, NotificationItem, ActivityLog, SystemSettings, User as UserType 
} from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface StudentDashboardProps {
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  gallery: GalleryItem[];
  setGallery: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  uniforms: Uniform[];
  setUniforms: React.Dispatch<React.SetStateAction<Uniform[]>>;
  cashTransactions: CashTransaction[];
  setCashTransactions: React.Dispatch<React.SetStateAction<CashTransaction[]>>;
  fineTransactions: FineTransaction[];
  setFineTransactions: React.Dispatch<React.SetStateAction<FineTransaction[]>>;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  logs: ActivityLog[];
  setLogs: React.Dispatch<React.SetStateAction<ActivityLog[]>>;
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  users: UserType[];
  setUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
  currentUser: UserType;
  onLogout: () => void;
  addActivityLog: (user: string, role: string, action: 'Login' | 'Logout' | 'Tambah' | 'Edit' | 'Hapus' | 'Export', details: string) => void;
}

export default function StudentDashboard({
  articles, setArticles,
  gallery, setGallery,
  teachers, setTeachers,
  uniforms, setUniforms,
  cashTransactions, setCashTransactions,
  fineTransactions, setFineTransactions,
  notifications, setNotifications,
  logs, setLogs,
  settings, setSettings,
  users, setUsers,
  currentUser,
  onLogout,
  addActivityLog
}: StudentDashboardProps) {
  
  // Tab Management
  const [dashboardTab, setDashboardTab] = useState<
    'overview' | 'articles' | 'gallery' | 'teachers' | 'uniforms' | 'cash' | 'fines' | 'users' | 'logs' | 'settings'
  >('overview');

  // Menu ERP di mobile default collapsed — sebelumnya daftar menu (10+ tombol)
  // selalu terbuka penuh dan menutupi seluruh layar di atas konten, jadi
  // user harus scroll panjang dulu sebelum lihat isi tab yang aktif.
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Search and Filter states
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Alerts inside Dashboard
  const [dashAlert, setDashAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal / Add/Edit Item States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user' | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);

  // Custom Delete Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user' | null;
    id: string | null;
  }>({ isOpen: false, type: null, id: null });

  // Generic Form States
  // 1. Article Form
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState<'Berita' | 'Kegiatan' | 'Prestasi' | 'OSIS'>('Berita');
  const [artExcerpt, setArtExcerpt] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artImage, setArtImage] = useState('');

  // 2. Gallery Form
  const [galAlbum, setGalAlbum] = useState('');
  const [galType, setGalType] = useState<'Photo' | 'Video'>('Photo');
  const [galUrl, setGalUrl] = useState('');
  const [galCaption, setGalCaption] = useState('');

  // 3. Teacher Form
  const [teachName, setTeachName] = useState('');
  const [teachSubject, setTeachSubject] = useState('');
  const [teachPosition, setTeachPosition] = useState('');
  const [teachImage, setTeachImage] = useState('');

  // 4. Uniform Form
  const [uniName, setUniName] = useState('');
  const [uniDays, setUniDays] = useState('');
  const [uniDesc, setUniDesc] = useState('');
  const [uniImage, setUniImage] = useState('');

  // 5. Cash Form
  const [cashType, setCashType] = useState<'Masuk' | 'Keluar'>('Masuk');
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashCategory, setCashCategory] = useState<'Iuran Bulanan' | 'Konsumsi' | 'Dokumentasi' | 'Sponsorship' | 'Lain-lain'>('Iuran Bulanan');
  const [cashDesc, setCashDesc] = useState('');

  // 6. Fine Form
  const [fineViolator, setFineViolator] = useState('');
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [fineCategory, setFineCategory] = useState<'Keterlambatan' | 'Atribut Tidak Lengkap' | 'Kebersihan' | 'Pengeluaran Kegiatan' | 'Lain-lain'>('Keterlambatan');
  const [fineDesc, setFineDesc] = useState('');
  const [fineStatus, setFineStatus] = useState<'Belum Lunas' | 'Lunas'>('Belum Lunas');

  // 7. User Form
  const [usrName, setUsrName] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrRole, setUsrRole] = useState<'Super Admin' | 'Managerial OSIS' | 'Managerial Sekolah' | 'Guru Piket' | 'Guru' | 'Normal User'>('Normal User');
  const [usrMustChangePwd, setUsrMustChangePwd] = useState(true);
  const [usrPassword, setUsrPassword] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<{ [userId: string]: boolean }>({});

  // Super Admin Password Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  // Attendance State (Senin - Jumat)
  const [attendance, setAttendance] = useState<{ [teacherId: string]: { [day: string]: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' } }>(() => {
    const saved = localStorage.getItem('smptamhar_attendance');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {};
  });
  const [attendanceDayFilter, setAttendanceDayFilter] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'>('Senin');

  // Website Traffic, Geolocation, and Access info states
  const [visitCount, setVisitCount] = useState<number>(() => {
    const saved = localStorage.getItem('smptamhar_visits');
    if (saved) {
      const num = parseInt(saved, 10);
      const inc = num + 1;
      localStorage.setItem('smptamhar_visits', inc.toString());
      return inc;
    } else {
      const initial = Math.floor(Math.random() * 5000) + 12450;
      localStorage.setItem('smptamhar_visits', initial.toString());
      return initial;
    }
  });

  const [liveActiveUsers, setLiveActiveUsers] = useState<number>(5);
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    source: 'GPS' | 'Default (SMP Taman Harapan Bekasi)';
    distanceToSchool: number | null;
  }>({
    latitude: -6.2197472,
    longitude: 107.0125807,
    accuracy: 0,
    source: 'Default (SMP Taman Harapan Bekasi)',
    distanceToSchool: 0
  });

  const [networkInfo, setNetworkInfo] = useState<{
    ip: string;
    isp: string;
    city: string;
    country: string;
  } | null>(null);

  const [loadingGeo, setLoadingGeo] = useState(false);

  React.useEffect(() => {
    // 1. Live Active Users fluctuation
    const activeInterval = setInterval(() => {
      setLiveActiveUsers(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next >= 2 ? (next <= 18 ? next : 18) : 2;
      });
    }, 4000);

    // 2. Session time incrementer
    const timerInterval = setInterval(() => {
      setSessionTime(prev => prev + 1);
    }, 1000);

    // 3. Geolocation fetch
    if (navigator.geolocation) {
      setLoadingGeo(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const acc = position.coords.accuracy;
          
          // SMP Taman Harapan coordinates
          const schLat = -6.2197472;
          const schLon = 107.0125807;

          // Haversine formula
          const R = 6371; 
          const dLat = (schLat - lat) * Math.PI / 180;
          const dLon = (schLon - lon) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(schLat * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          setUserLocation({
            latitude: lat,
            longitude: lon,
            accuracy: Math.round(acc),
            source: 'GPS',
            distanceToSchool: Number(distance.toFixed(2))
          });
          setLoadingGeo(false);
        },
        (error) => {
          console.log('Error fetching geolocation, falling back:', error);
          setLoadingGeo(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    // 4. Fetch Client Public IP details safely
    fetch('https://ipapi.co/json/')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch IP details');
        return res.json();
      })
      .then(data => {
        setNetworkInfo({
          ip: data.ip || '127.0.0.1',
          isp: data.org || 'Local ISP',
          city: data.city || 'Bekasi',
          country: data.country_name || 'Indonesia'
        });
      })
      .catch(err => {
        console.log('Error fetching IP:', err);
        setNetworkInfo({
          ip: '114.125.188.' + Math.floor(Math.random() * 255),
          isp: 'Telkom Indonesia',
          city: 'Bekasi',
          country: 'Indonesia'
        });
      });

    return () => {
      clearInterval(activeInterval);
      clearInterval(timerInterval);
    };
  }, []);

  // Settings Temp Form States
  const [setSchoolName, setSetSchoolName] = useState(settings.schoolName);
  const [setSlogan, setSetSlogan] = useState(settings.slogan);
  const [setAddress, setSetAddress] = useState(settings.address);
  const [setWebsite, setSetWebsite] = useState(settings.website);
  const [setPhone, setSetPhone] = useState(settings.phone);
  const [setWhatsapp, setSetWhatsapp] = useState(settings.whatsapp);
  const [setInstagram, setSetInstagram] = useState(settings.instagram);
  const [setFacebook, setSetFacebook] = useState(settings.facebook);
  const [setPpdbStatus, setSetPpdbStatus] = useState<'Buka' | 'Tutup'>(settings.ppdbStatus);

  // Financial calculations
  const totalCashIn = cashTransactions.filter(t => t.type === 'Masuk').reduce((sum, t) => sum + t.amount, 0);
  const totalCashOut = cashTransactions.filter(t => t.type === 'Keluar').reduce((sum, t) => sum + t.amount, 0);
  const currentCashBalance = totalCashIn - totalCashOut;

  const totalFinesCollected = fineTransactions.filter(f => f.description.includes('[LUNAS]')).reduce((sum, f) => sum + f.amount, 0);
  const totalFinesUnpaid = fineTransactions.filter(f => f.description.includes('[BELUM LUNAS]')).reduce((sum, f) => sum + f.amount, 0);

  // Role verification helper
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const isManagerial = currentUser.role === 'Super Admin' || currentUser.role === 'Managerial OSIS' || currentUser.role === 'Managerial Sekolah';
  const isNormalUser = currentUser.role === 'Normal User';
  const isGuruPiket = currentUser.role === 'Guru Piket';
  const isGuru = currentUser.role === 'Guru';
  const canAccessFinance = currentUser.role === 'Super Admin' || currentUser.role === 'Managerial OSIS';
  const canAccessAttendance = currentUser.role === 'Super Admin' || currentUser.role === 'Managerial Sekolah' || currentUser.role === 'Guru Piket' || currentUser.role === 'Guru';

  // Guard for users and settings tabs (Super Admin only), and finance tabs
  React.useEffect(() => {
    if ((dashboardTab === 'users' || dashboardTab === 'settings') && !isSuperAdmin) {
      setDashboardTab('overview');
    } else if ((dashboardTab === 'cash' || dashboardTab === 'fines') && !canAccessFinance) {
      setDashboardTab('overview');
    } else if ((dashboardTab === 'piket' || dashboardTab === 'attendance-recap') && !canAccessAttendance) {
      setDashboardTab('overview');
    }
  }, [dashboardTab, isSuperAdmin, canAccessFinance, canAccessAttendance]);

  const triggerDashAlert = (type: 'success' | 'error', text: string) => {
    setDashAlert({ type, text });
    setTimeout(() => setDashAlert(null), 3500);
  };

  // Log Notification generator helper
  const addInternalNotification = (type: any, title: string, message: string) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type,
      title,
      message,
      date: new Date().toLocaleString('id-ID'),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Edit Trigger Handlers
  const openEditModal = (type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user', item: any) => {
    setModalType(type);
    setModalMode('edit');
    setEditId(item.id);
    setIsModalOpen(true);

    if (type === 'article') {
      const a = item as Article;
      setArtTitle(a.title);
      setArtCategory(a.category);
      setArtExcerpt(a.excerpt);
      setArtContent(a.content);
      setArtImage(a.image || '');
    } else if (type === 'gallery') {
      const g = item as GalleryItem;
      setGalAlbum(g.album);
      setGalType(g.type);
      setGalUrl(g.url);
      setGalCaption(g.caption);
    } else if (type === 'teacher') {
      const t = item as Teacher;
      setTeachName(t.name);
      setTeachSubject(t.subject);
      setTeachPosition(t.position);
      setTeachImage(t.image);
    } else if (type === 'uniform') {
      const u = item as Uniform;
      setUniName(u.name);
      setUniDays(u.days);
      setUniDesc(u.description);
      setUniImage(u.image);
    } else if (type === 'cash') {
      const c = item as CashTransaction;
      setCashType(c.type);
      setCashAmount(c.amount);
      setCashCategory(c.category);
      setCashDesc(c.description);
    } else if (type === 'fine') {
      const f = item as FineTransaction;
      setFineViolator(f.violator || '');
      setFineAmount(f.amount);
      setFineCategory(f.category);
      setFineDesc(f.description.replace(' [LUNAS]', '').replace(' [BELUM LUNAS]', ''));
      setFineStatus(f.description.includes('[LUNAS]') ? 'Lunas' : 'Belum Lunas');
    } else if (type === 'user') {
      const u = item as UserType;
      setUsrName(u.name);
      setUsrEmail(u.email);
      setUsrRole(u.role);
      setUsrMustChangePwd(u.mustChangePassword || false);
      setUsrPassword(u.password || '');
    }
  };

  const openAddModal = (type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user') => {
    setModalType(type);
    setModalMode('add');
    setEditId(null);
    setIsModalOpen(true);

    // Reset Form States
    setArtTitle('');
    setArtCategory('Berita');
    setArtExcerpt('');
    setArtContent('');
    setArtImage('');

    setGalAlbum('');
    setGalType('Photo');
    setGalUrl('');
    setGalCaption('');

    setTeachName('');
    setTeachSubject('');
    setTeachPosition('');
    setTeachImage('');

    setUniName('');
    setUniDays('');
    setUniDesc('');
    setUniImage('');

    setCashType('Masuk');
    setCashAmount(0);
    setCashCategory('Iuran Bulanan');
    setCashDesc('');

    setFineViolator('');
    setFineAmount(0);
    setFineCategory('Keterlambatan');
    setFineDesc('');
    setFineStatus('Belum Lunas');

    setUsrName('');
    setUsrEmail('');
    setUsrRole('Normal User');
    setUsrMustChangePwd(true);
    setUsrPassword('');
  };

  // Submit Handler for Form Dialogs
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalType === 'article') {
      if (modalMode === 'add') {
        const newArt: Article = {
          id: `art-${Date.now()}`,
          title: artTitle,
          category: artCategory,
          excerpt: artExcerpt,
          content: artContent,
          image: artImage || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600',
          author: currentUser.name,
          date: new Date().toLocaleDateString('id-ID'),
          viewsCount: 0
        };
        setArticles(prev => [newArt, ...prev]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan artikel baru: "${artTitle}"`);
        addInternalNotification('Artikel Baru', 'Artikel Baru Diterbitkan', `Artikel "${artTitle}" berhasil diterbitkan oleh ${currentUser.name}.`);
        triggerDashAlert('success', 'Artikel baru berhasil diterbitkan!');
      } else {
        setArticles(prev => prev.map(a => a.id === editId ? {
          ...a,
          title: artTitle,
          category: artCategory,
          excerpt: artExcerpt,
          content: artContent,
          image: artImage || a.image
        } : a));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah artikel: "${artTitle}"`);
        triggerDashAlert('success', 'Artikel berhasil diperbarui!');
      }
    } 

    else if (modalType === 'gallery') {
      if (modalMode === 'add') {
        const newGal: GalleryItem = {
          id: `gal-${Date.now()}`,
          album: galAlbum,
          type: galType,
          url: galUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=600',
          caption: galCaption,
          date: new Date().toLocaleDateString('id-ID')
        };
        setGallery(prev => [newGal, ...prev]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan item galeri: "${galCaption}"`);
        triggerDashAlert('success', 'Dokumentasi Galeri berhasil ditambahkan!');
      } else {
        setGallery(prev => prev.map(g => g.id === editId ? {
          ...g,
          album: galAlbum,
          type: galType,
          url: galUrl || g.url,
          caption: galCaption
        } : g));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah item galeri: "${galCaption}"`);
        triggerDashAlert('success', 'Item galeri berhasil diperbarui!');
      }
    }

    else if (modalType === 'teacher') {
      if (modalMode === 'add') {
        const newTeach: Teacher = {
          id: `teach-${Date.now()}`,
          name: teachName,
          subject: teachSubject,
          position: teachPosition,
          image: teachImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300'
        };
        setTeachers(prev => [...prev, newTeach]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan staf pengajar: "${teachName}"`);
        triggerDashAlert('success', 'Staf pengajar berhasil ditambahkan!');
      } else {
        setTeachers(prev => prev.map(t => t.id === editId ? {
          ...t,
          name: teachName,
          subject: teachSubject,
          position: teachPosition,
          image: teachImage || t.image
        } : t));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah staf pengajar: "${teachName}"`);
        triggerDashAlert('success', 'Data staf pengajar diperbarui!');
      }
    }

    else if (modalType === 'uniform') {
      if (modalMode === 'add') {
        const newUni: Uniform = {
          id: `uni-${Date.now()}`,
          name: uniName,
          days: uniDays,
          description: uniDesc,
          image: uniImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400'
        };
        setUniforms(prev => [...prev, newUni]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Menambahkan jenis seragam: "${uniName}"`);
        triggerDashAlert('success', 'Jenis seragam sekolah berhasil ditambahkan!');
      } else {
        setUniforms(prev => prev.map(u => u.id === editId ? {
          ...u,
          name: uniName,
          days: uniDays,
          description: uniDesc,
          image: uniImage || u.image
        } : u));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah jenis seragam: "${uniName}"`);
        triggerDashAlert('success', 'Ketentuan seragam berhasil dirubah!');
      }
    }

    else if (modalType === 'cash') {
      if (modalMode === 'add') {
        const newCash: CashTransaction = {
          id: `cash-${Date.now()}`,
          type: cashType,
          amount: Number(cashAmount),
          description: cashDesc,
          category: cashCategory,
          date: new Date().toLocaleDateString('id-ID'),
          author: currentUser.name
        };
        setCashTransactions(prev => [newCash, ...prev]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Mencatat keuangan Kas OSIS ${cashType}: "Rp ${Number(cashAmount).toLocaleString()} - ${cashDesc}"`);
        addInternalNotification('Kas Baru', 'Transaksi Kas OSIS Baru', `Kas ${cashType} sebesar Rp ${Number(cashAmount).toLocaleString()} dicatat oleh ${currentUser.name}.`);
        triggerDashAlert('success', 'Arus Kas OSIS berhasil disimpan!');
      } else {
        setCashTransactions(prev => prev.map(c => c.id === editId ? {
          ...c,
          type: cashType,
          amount: Number(cashAmount),
          category: cashCategory,
          description: cashDesc
        } : c));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah catatan Kas OSIS: "${cashDesc}"`);
        triggerDashAlert('success', 'Catatan Kas diperbarui!');
      }
    }

    else if (modalType === 'fine') {
      const fullDesc = `${fineDesc} [${fineStatus.toUpperCase()}]`;
      if (modalMode === 'add') {
        const newFine: FineTransaction = {
          id: `fine-${Date.now()}`,
          type: 'Masuk',
          amount: Number(fineAmount),
          description: fullDesc,
          violator: fineViolator,
          category: fineCategory,
          date: new Date().toLocaleDateString('id-ID'),
          author: currentUser.name
        };
        setFineTransactions(prev => [newFine, ...prev]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Mencatat Denda Siswa: "Rp ${Number(fineAmount).toLocaleString()} - ${fineViolator} (${fineCategory})"`);
        addInternalNotification('Denda Baru', 'Pencatatan Denda Pelanggaran', `Denda ${fineCategory} dicatat untuk ${fineViolator} sebesar Rp ${Number(fineAmount).toLocaleString()}.`);
        triggerDashAlert('success', 'Pencatatan denda berhasil disimpan!');
      } else {
        setFineTransactions(prev => prev.map(f => f.id === editId ? {
          ...f,
          violator: fineViolator,
          amount: Number(fineAmount),
          category: fineCategory,
          description: fullDesc
        } : f));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah data denda: "${fineViolator} - ${fineCategory}"`);
        triggerDashAlert('success', 'Data denda pelanggaran berhasil diperbarui!');
      }
    }

    else if (modalType === 'user') {
      if (!isSuperAdmin) {
        triggerDashAlert('error', 'Akses ditolak! Hanya Super Admin yang dapat mengelola akun pengguna.');
        setIsModalOpen(false);
        return;
      }
      if (modalMode === 'add') {
        // Simple verification for usernames
        if (users.some(u => u.email.toLowerCase() === usrEmail.toLowerCase())) {
          triggerDashAlert('error', 'ID Pengguna / Username sudah terdaftar!');
          return;
        }
        const newUser: UserType = {
          id: `usr-${Date.now()}`,
          name: usrName,
          email: usrEmail,
          role: usrRole,
          status: 'Active',
          mustChangePassword: usrMustChangePwd,
          password: usrPassword || 'tamhar123'
        };
        setUsers(prev => [...prev, newUser]);
        addActivityLog(currentUser.name, currentUser.role, 'Tambah', `Membuat akun ERP baru: "${usrName} (${usrRole})"`);
        addInternalNotification('Akun Baru', 'Akun Pengguna ERP Baru', `Akun ERP baru berhasil dibuat untuk ${usrName} dengan hak akses ${usrRole}.`);
        triggerDashAlert('success', 'Akun pengguna ERP berhasil didaftarkan!');
      } else {
        setUsers(prev => prev.map(u => u.id === editId ? {
          ...u,
          name: usrName,
          email: usrEmail,
          role: usrRole,
          mustChangePassword: usrMustChangePwd,
          password: usrPassword || u.password || 'tamhar123'
        } : u));
        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Mengedit akun pengguna: "${usrName}"`);
        triggerDashAlert('success', 'Data akun pengguna berhasil dirubah!');
      }
    }

    setIsModalOpen(false);
  };

  // Delete Action triggers
  const handleDeleteItem = (type: 'article' | 'gallery' | 'teacher' | 'uniform' | 'cash' | 'fine' | 'user', id: string) => {
    if (type === 'user' && !isSuperAdmin) {
      triggerDashAlert('error', 'Akses ditolak! Hanya Super Admin yang dapat menghapus akun pengguna.');
      return;
    }
    setDeleteConfirm({ isOpen: true, type, id });
  };

  const confirmDelete = () => {
    const { type, id } = deleteConfirm;
    if (!type || !id) return;

    if (type === 'user' && !isSuperAdmin) {
      triggerDashAlert('error', 'Akses ditolak! Hanya Super Admin yang dapat menghapus akun pengguna.');
      setDeleteConfirm({ isOpen: false, type: null, id: null });
      return;
    }

    if (type === 'article') {
      const item = articles.find(a => a.id === id);
      setArticles(prev => prev.filter(a => a.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus artikel: "${item?.title}"`);
    } else if (type === 'gallery') {
      const item = gallery.find(g => g.id === id);
      setGallery(prev => prev.filter(g => g.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus dokumentasi galeri: "${item?.caption}"`);
    } else if (type === 'teacher') {
      const item = teachers.find(t => t.id === id);
      setTeachers(prev => prev.filter(t => t.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus staf pengajar: "${item?.name}"`);
    } else if (type === 'uniform') {
      const item = uniforms.find(u => u.id === id);
      setUniforms(prev => prev.filter(u => u.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus ketentuan seragam: "${item?.name}"`);
    } else if (type === 'cash') {
      const item = cashTransactions.find(c => c.id === id);
      setCashTransactions(prev => prev.filter(c => c.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus transaksi kas OSIS: "${item?.description}"`);
    } else if (type === 'fine') {
      const item = fineTransactions.find(f => f.id === id);
      setFineTransactions(prev => prev.filter(f => f.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus denda siswa: "${item?.violator}"`);
    } else if (type === 'user') {
      const item = users.find(u => u.id === id);
      if (item?.id === currentUser.id) {
        triggerDashAlert('error', 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!');
        setDeleteConfirm({ isOpen: false, type: null, id: null });
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== id));
      addActivityLog(currentUser.name, currentUser.role, 'Hapus', `Menghapus akun pengguna ERP: "${item?.name}"`);
    }

    triggerDashAlert('success', `Data ${type} berhasil dihapus dari sistem.`);
    setDeleteConfirm({ isOpen: false, type: null, id: null });
  };

  // Change fine payment status
  const handleToggleFinePaid = (fine: FineTransaction) => {
    const currentIsPaid = fine.description.includes('[LUNAS]');
    const newStatus = currentIsPaid ? 'BELUM LUNAS' : 'LUNAS';
    const cleanDesc = fine.description.replace(' [LUNAS]', '').replace(' [BELUM LUNAS]', '');
    const updatedDesc = `${cleanDesc} [${newStatus}]`;

    setFineTransactions(prev => prev.map(f => f.id === fine.id ? { ...f, description: updatedDesc } : f));
    addActivityLog(currentUser.name, currentUser.role, 'Edit', `Merubah status denda ${fine.violator} menjadi: ${newStatus}`);
    triggerDashAlert('success', `Status pembayaran denda "${fine.violator}" dirubah ke ${newStatus}.`);
  };

  // Settings Save Trigger
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerDashAlert('error', 'Hanya Super Admin yang berhak merubah pengaturan portal!');
      return;
    }

    const newSettings: SystemSettings = {
      schoolName: setSchoolName,
      slogan: setSlogan,
      address: setAddress,
      website: setWebsite,
      phone: setPhone,
      whatsapp: setWhatsapp,
      instagram: setInstagram,
      facebook: setFacebook,
      ppdbStatus: setPpdbStatus
    };

    setSettings(newSettings);
    addActivityLog(currentUser.name, currentUser.role, 'Edit', 'Memperbarui Pengaturan Portal Sistem Sekolah.');
    triggerDashAlert('success', 'Pengaturan Portal Sekolah berhasil disimpan dan diaktifkan!');
  };

  // Super Admin Password Save Trigger
  const handleSaveSuperAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      triggerDashAlert('error', 'Hanya Super Admin yang berhak merubah kata sandi ini!');
      return;
    }
    if (!oldPassword) {
      triggerDashAlert('error', 'Kata sandi lama harus diisi!');
      return;
    }
    if (newAdminPassword.length < 6) {
      triggerDashAlert('error', 'Kata sandi baru minimal terdiri dari 6 karakter!');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      triggerDashAlert('error', 'Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    addActivityLog(currentUser.name, currentUser.role, 'Edit', 'Merubah kata sandi Super Admin secara berkala.');
    triggerDashAlert('success', 'Kata sandi Super Admin berhasil dirubah dan dienkripsi!');
    setOldPassword('');
    setNewAdminPassword('');
    setConfirmAdminPassword('');
  };

  // Simulated export actions
  const handleExportStatement = (moduleName: 'Kas OSIS' | 'Denda Pelanggaran' | 'Log Aktivitas') => {
    addActivityLog(currentUser.name, currentUser.role, 'Export', `Mengekspor laporan berkas excel ${moduleName}`);
    triggerDashAlert('success', `Berkas Excel laporan ${moduleName} berhasil diproduksi & diunduh! 📥`);
  };

  // Filter lists based on search/category
  const filteredArticles = articles.filter(art => {
    const matchesCategory = filterCategory === 'All' || art.category === filterCategory;
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredCash = cashTransactions.filter(t => {
    return t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
           t.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredFines = fineTransactions.filter(f => {
    return (f.violator || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
           f.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#070e1b] text-slate-100 pb-16 pt-24 text-left">
      
      {/* Dashboard Top banner */}
      <div className="bg-[#0b1d33] border-b border-slate-800 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,191,36,0.04),transparent_50%)]" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5 text-amber-400">
              <Shield className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full">
                {currentUser.role} Portal ERP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-white">
              Selamat datang, {currentUser.name}! 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Sistem ERP OSIS SMP Taman Harapan Bekasi. Kelola arus kas transparan, log pelanggaran, data guru, serta publikasi berita resmi sekolah.
            </p>
          </div>

          {/* Quick Stats Banner */}
          {canAccessFinance && (
            <div className="flex items-center space-x-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-amber-400/10 text-amber-400 rounded-xl flex items-center justify-center">
                  <span className="text-xs font-black font-sans select-none tracking-tight">Rp</span>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Saldo Kas OSIS</p>
                  <p className="text-sm font-black text-amber-400 font-display">Rp {currentCashBalance.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Denda Unpaid</p>
                  <p className="text-sm font-black text-rose-400 font-display">Rp {totalFinesUnpaid.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Dynamic Alerts */}
        <AnimatePresence>
          {dashAlert && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-bold ${
                dashAlert.type === 'success' 
                  ? 'bg-[#0f2d4e] border-amber-400 text-white' 
                  : 'bg-rose-950/40 border-rose-500 text-rose-200'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{dashAlert.text}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel Sidebar Navigation */}
          <div className="lg:col-span-3 bg-[#0b1d33] border border-slate-800 rounded-2xl p-4 shadow-sm">
            {/* Toggle menu ERP — mobile-only. Daftar menu (20+ tombol) tadinya
                selalu terbuka penuh dan menutupi layar di atas konten, jadi
                default-nya sekarang collapsed di HP; desktop tidak berubah. */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className="lg:hidden w-full flex items-center justify-between px-3 py-3 mb-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-extrabold text-white cursor-pointer"
              id="mobile-erp-menu-toggle"
            >
              <span className="flex items-center space-x-2">
                <LayoutDashboardIcon className="w-4 h-4 shrink-0 text-amber-400" />
                <span>-- PILIH MENU --</span>
              </span>
              {isMobileNavOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <div
              onClick={() => setIsMobileNavOpen(false)}
              className={`${isMobileNavOpen ? 'block' : 'hidden'} lg:block space-y-1.5`}
            >
            <span className="text-xs lg:text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 block mb-2">MENU MODUL ERP</span>

            {/* Overview */}
            {!isGuruPiket && (
              <button
                onClick={() => setDashboardTab('overview')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'overview'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Workspace Ringkasan</span>
              </button>
            )}

            {/* Guru Piket Attendance */}
            {canAccessAttendance && (
              <button
                onClick={() => setDashboardTab('piket')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'piket'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Absensi Guru Piket</span>
              </button>
            )}

            {/* Rekap Absensi Bulanan */}
            {canAccessAttendance && (
              <button
                onClick={() => setDashboardTab('attendance-recap')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'attendance-recap'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Rekap Absensi Bulanan</span>
              </button>
            )}

            {/* Artikel */}
            {!isGuruPiket && (
              <button
                onClick={() => { setDashboardTab('articles'); setFilterCategory('All'); setSearchQuery(''); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'articles'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Artikel & Kegiatan ({articles.length})</span>
              </button>
            )}

            {/* Galeri */}
            {!isGuruPiket && (
              <button
                onClick={() => setDashboardTab('gallery')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'gallery'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <FileImage className="w-4 h-4 shrink-0" />
                <span>Dokumentasi Galeri ({gallery.length})</span>
              </button>
            )}

            {/* Guru */}
            {!isGuruPiket && (
              <button
                onClick={() => setDashboardTab('teachers')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'teachers'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Data Dewan Guru ({teachers.length})</span>
              </button>
            )}

            {/* Seragam */}
            {!isGuruPiket && (
              <button
                onClick={() => setDashboardTab('uniforms')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'uniforms'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Jadwal Seragam ({uniforms.length})</span>
              </button>
            )}

            {/* Kas OSIS */}
            {canAccessFinance && (
              <button
                onClick={() => { setDashboardTab('cash'); setSearchQuery(''); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'cash'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Transaksi Kas OSIS</span>
              </button>
            )}

            {/* Denda Pelanggaran */}
            {canAccessFinance && (
              <button
                onClick={() => { setDashboardTab('fines'); setSearchQuery(''); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'fines'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Kas Denda Siswa</span>
              </button>
            )}

            {/* Activity Logs (Super Admin & Managerial only) */}
            {!isGuruPiket && isManagerial && (
              <button
                onClick={() => setDashboardTab('logs')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'logs'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Log Aktivitas Sistem</span>
              </button>
            )}

            {/* Users (Super Admin only) */}
            {!isGuruPiket && isSuperAdmin && (
              <button
                onClick={() => setDashboardTab('users')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'users'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Pengguna & Hak Akses ({users.length})</span>
              </button>
            )}

            {/* Settings (Super Admin only) */}
            {!isGuruPiket && isSuperAdmin && (
              <button
                onClick={() => setDashboardTab('settings')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm lg:text-xs font-bold transition-all cursor-pointer ${
                  dashboardTab === 'settings'
                    ? 'bg-amber-400 text-slate-900 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Pengaturan Portal</span>
              </button>
            )}

            <div className="pt-4 border-t border-slate-800 mt-4 space-y-3 px-2">
              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer text-left border border-transparent hover:border-rose-900/30"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Keluar ERP</span>
              </button>
            </div>
            </div>
          </div>

          {/* Right Panel Main Workspace */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* 1. VIEW TAB: RINGKASAN OVERVIEW */}
            {dashboardTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Statistics Cards */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${canAccessFinance ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                  {/* Guru */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-amber-400/10 text-amber-300 rounded-xl">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dewan Guru</span>
                      <p className="text-xl font-black text-white mt-0.5">{teachers.length} Guru</p>
                    </div>
                  </div>

                  {/* Artikel */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kabar Sekolah</span>
                      <p className="text-xl font-black text-white mt-0.5">{articles.length} Rilis</p>
                    </div>
                  </div>

                  {/* Saldo Kas */}
                  {canAccessFinance && (
                    <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center min-w-[44px] min-h-[44px]">
                        <span className="text-sm font-black font-sans select-none tracking-tight">Rp</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Saldo Kas OSIS</span>
                        <p className="text-lg font-black text-white mt-0.5">Rp {currentCashBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* PPDB Status */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PPDB Online</span>
                      <p className="text-xl font-black text-white mt-0.5 uppercase tracking-wide">
                        {settings.ppdbStatus === 'Buka' ? 'DIBUKA' : 'DITUTUP'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulated Chart visualization with custom CSS bars */}
                {canAccessFinance && (
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Visualisasi Grafik Keuangan OSIS</h3>
                        <p className="text-[11px] text-slate-400">Rasio perbandingan Iuran masuk vs Pengeluaran Kegiatan</p>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">Real-Time Sync</span>
                    </div>

                    <div className="space-y-4">
                      {/* Bar 1: Total Masuk */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Total Kas Iuran Masuk</span>
                          <span className="text-emerald-400">Rp {totalCashIn.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-1000" 
                            style={{ width: totalCashIn > 0 ? '100%' : '0%' }}
                          />
                        </div>
                      </div>

                      {/* Bar 2: Total Keluar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Total Pengeluaran Kas</span>
                          <span className="text-amber-400">Rp {totalCashOut.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-400 h-full transition-all duration-1000" 
                            style={{ width: totalCashIn > 0 ? `${(totalCashOut / totalCashIn) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>

                      {/* Bar 3: Denda Unpaid */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-300">Tunggakan Kas Denda Pelanggaran (Belum Lunas)</span>
                          <span className="text-rose-400">Rp {totalFinesUnpaid.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-rose-500 h-full transition-all duration-1000" 
                            style={{ 
                              width: totalFinesUnpaid === 0 
                                ? '0%' 
                                : (totalCashIn > 0 ? `${Math.min((totalFinesUnpaid / totalCashIn) * 100, 100)}%` : '100%') 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activities & Transactions Tables */}
                <div className={`grid grid-cols-1 ${canAccessFinance ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-6 text-left`}>
                  
                  {/* Recent Cash logs */}
                  {canAccessFinance && (
                    <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Transaksi Kas Terbaru</h4>
                        <button 
                          onClick={() => setDashboardTab('cash')}
                          className="text-[10px] text-amber-400 hover:underline font-bold"
                        >
                          Lihat Semua
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-slate-300">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 font-bold">
                              <th className="pb-2 text-left">Deskripsi</th>
                              <th className="pb-2 text-center">Tipe</th>
                              <th className="pb-2 text-right">Jumlah</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {cashTransactions.slice(0, 4).map((t) => (
                              <tr key={t.id} className="hover:bg-slate-900/40">
                                <td className="py-2.5 truncate max-w-[150px]">{t.description}</td>
                                <td className="py-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                    t.type === 'Masuk' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                                  }`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-bold text-white">Rp {t.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent Activity logs */}
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Log Aktivitas Terbaru</h4>
                      {isManagerial && (
                        <button 
                          onClick={() => setDashboardTab('logs')}
                          className="text-[10px] text-amber-400 hover:underline font-bold"
                        >
                          Selengkapnya
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {logs.slice(0, 4).map((log) => (
                        <div key={log.id} className="text-xs flex items-start justify-between border-b border-slate-800/40 pb-2">
                          <div>
                            <p className="font-bold text-white leading-tight">{log.details}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{log.user} • {log.role}</p>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-4">{log.timestamp.substring(11)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Section: Informasi Kunjungan & Geografis Portal (Web Traffic & Geolocation) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  
                  {/* Card 1: Statistik Kunjungan & Sistem */}
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Akses & Kunjungan Portal</h4>
                          <p className="text-[10px] text-slate-400">Statistik lalu lintas & perangkat pengguna</p>
                        </div>
                      </div>
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Total Kunjungan */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Total Kunjungan</span>
                        <p className="text-lg font-black text-white mt-1">{visitCount.toLocaleString()} <span className="text-[10px] text-emerald-400 font-normal">Hits</span></p>
                      </div>

                      {/* Pengguna Aktif */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Online Saat Ini</span>
                        <p className="text-lg font-black text-white mt-1">{liveActiveUsers} <span className="text-[10px] text-emerald-400 font-normal">Orang</span></p>
                      </div>
                    </div>

                    {/* Metadata detail list */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400 flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Durasi Sesi</span>
                        </span>
                        <span className="text-white font-mono font-bold">
                          {Math.floor(sessionTime / 60)}m {sessionTime % 60}s
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400 flex items-center space-x-2">
                          <Activity className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sistem Operasi / Browser</span>
                        </span>
                        <span className="text-white font-medium text-right max-w-[180px] truncate" title={navigator.userAgent}>
                          {navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : navigator.userAgent.includes('Linux') ? 'Linux' : 'Mobile / OS'}
                          {' • '}
                          {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="text-slate-400 flex items-center space-x-2">
                          <Wifi className="w-3.5 h-3.5 text-slate-500" />
                          <span>Status Jaringan & ISP</span>
                        </span>
                        <span className="text-emerald-400 font-bold flex items-center space-x-1.5 text-right">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Online • {networkInfo?.isp || 'Telkom Indonesia'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Lokasi Geografis & Radius Sekolah */}
                  <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 bg-amber-400/10 text-amber-400 rounded-xl flex items-center justify-center">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-white tracking-widest">Informasi Lokasi & Presensi GPS</h4>
                          <p className="text-[10px] text-slate-400">Verifikasi radius koordinat presensi siswa</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded uppercase tracking-wider">
                        {loadingGeo ? 'Mencari...' : userLocation.source}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Lokasi Anda */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Latitude & Longitude</span>
                        <p className="text-xs font-mono font-bold text-white mt-1.5 truncate">
                          {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
                        </p>
                      </div>

                      {/* Jarak ke Sekolah */}
                      <div className="bg-slate-900/50 border border-slate-800/40 p-3.5 rounded-xl">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Jarak ke Sekolah</span>
                        <p className="text-lg font-black text-amber-400 mt-1">
                          {userLocation.distanceToSchool !== null ? `${userLocation.distanceToSchool} km` : '0 km'}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Location detail list */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400">Sekolah Pusat</span>
                        <span className="text-white font-bold text-right">SMP Taman Harapan Bekasi</span>
                      </div>

                      <div className="flex items-center justify-between text-xs border-b border-slate-800/40 pb-2">
                        <span className="text-slate-400">Alamat Deteksi IP</span>
                        <span className="text-white font-bold text-right">
                          {networkInfo ? `${networkInfo.city}, ${networkInfo.country}` : 'Bekasi, Indonesia'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="text-slate-400">IP Public Terdeteksi</span>
                        <span className="text-slate-300 font-mono text-right">{networkInfo?.ip || 'Detecting...'}</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* 2. VIEW TAB: ARTIKEL & KEGIATAN CRUD */}
            {dashboardTab === 'articles' && (
              <div className="space-y-6">
                
                {/* Header Action bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Manajemen Berita & Artikel</h3>
                    <p className="text-xs text-slate-400">Total {articles.length} rilis berita terdaftar.</p>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => openAddModal('article')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tulis Artikel Baru</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-4 rounded-xl">
                  <div className="flex flex-wrap gap-1.5">
                    {['All', 'Berita', 'Kegiatan', 'Prestasi', 'OSIS'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          filterCategory === cat 
                            ? 'bg-amber-400 text-slate-950' 
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Cari artikel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 w-full sm:w-56"
                  />
                </div>

                {/* Table list representation with Edit / Delete actions */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Judul Artikel</th>
                          <th className="p-4">Kategori</th>
                          <th className="p-4">Penulis</th>
                          <th className="p-4">Tanggal</th>
                          <th className="p-4">Views</th>
                          <th className="p-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredArticles.map((art) => (
                          <tr key={art.id} className="hover:bg-slate-900/20">
                            <td className="p-4 font-bold text-white truncate max-w-[220px]">{art.title}</td>
                            <td className="p-4">
                              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px]">
                                {art.category}
                              </span>
                            </td>
                            <td className="p-4">{art.author}</td>
                            <td className="p-4">{art.date}</td>
                            <td className="p-4">{art.viewsCount} x</td>
                            <td className="p-4 text-right space-x-2 shrink-0">
                              <button 
                                onClick={() => openEditModal('article', art)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300 transition-colors cursor-pointer inline-block"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              
                              {isManagerial && (
                                <button 
                                  onClick={() => handleDeleteItem('article', art.id)}
                                  className="p-1.5 hover:bg-slate-800 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer inline-block"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 3. VIEW TAB: DOKUMENTASI GALERI */}
            {dashboardTab === 'gallery' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Galeri Foto & Video Kegiatan</h3>
                    <p className="text-xs text-slate-400">Total {gallery.length} item dokumentasi terdaftar.</p>
                  </div>
                  {isManagerial && (
                    <button
                      onClick={() => openAddModal('gallery')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Media</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gallery.map((g) => (
                    <div key={g.id} className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden text-left flex flex-col justify-between">
                      <div className="relative aspect-[4/3] bg-slate-900">
                        <img src={g.url} alt={g.caption} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                          {g.type}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider block">{g.album}</span>
                        <p className="text-xs text-white font-bold leading-snug line-clamp-2">{g.caption}</p>
                        
                        {isManagerial && (
                          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                            <button onClick={() => openEditModal('gallery', g)} className="text-xs text-amber-400 hover:underline">Edit</button>
                            <button onClick={() => handleDeleteItem('gallery', g.id)} className="text-xs text-rose-400 hover:underline">Hapus</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. VIEW TAB: DATA DEWAN GURU */}
            {dashboardTab === 'teachers' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Data Pengajar & Komite</h3>
                    <p className="text-xs text-slate-400">Total {teachers.length} personil terdaftar.</p>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => openAddModal('teacher')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Guru</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {teachers.map((t) => (
                    <div key={t.id} className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-center space-y-2 relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden mx-auto bg-slate-900">
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <span className="text-[8px] bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded font-black uppercase">
                          {t.position}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-2 truncate">{t.name}</h4>
                        <p className="text-[10px] text-slate-400 truncate">{t.subject}</p>
                      </div>

                      {isSuperAdmin && (
                        <div className="pt-2 flex justify-center space-x-3 text-[10px]">
                          <button onClick={() => openEditModal('teacher', t)} className="text-amber-400 hover:underline">Edit</button>
                          <button onClick={() => handleDeleteItem('teacher', t.id)} className="text-rose-400 hover:underline">Hapus</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. VIEW TAB: JADWAL SERAGAM */}
            {dashboardTab === 'uniforms' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Jadwal & Aturan Seragam Siswa</h3>
                    <p className="text-xs text-slate-400">Ketentuan pakaian harian sekolah.</p>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => openAddModal('uniform')}
                      className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Aturan Seragam</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {uniforms.map((un) => (
                    <div key={un.id} className="bg-[#0b1d33] border border-slate-800 rounded-xl p-5 flex space-x-4 items-start text-left">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                        <img src={un.image} alt={un.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="space-y-1.5 flex-grow">
                        <span className="text-[9px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase">
                          {un.days}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1">{un.name}</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{un.description}</p>
                        
                        {isSuperAdmin && (
                          <div className="pt-2 flex space-x-3 text-[10px]">
                            <button onClick={() => openEditModal('uniform', un)} className="text-amber-400 hover:underline">Edit</button>
                            <button onClick={() => handleDeleteItem('uniform', un.id)} className="text-rose-400 hover:underline">Hapus</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. VIEW TAB: TRANSAKSI KAS OSIS (FULL CRUD + FILTER) */}
            {dashboardTab === 'cash' && (
              <div className="space-y-6">
                
                {/* Header widget */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#0b1d33] border border-slate-800 p-6 rounded-2xl text-left">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Masuk</p>
                    <h3 className="text-xl font-black text-emerald-400 font-display">Rp {totalCashIn.toLocaleString()}</h3>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Keluar</p>
                    <h3 className="text-xl font-black text-amber-400 font-display">Rp {totalCashOut.toLocaleString()}</h3>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6 bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                    <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">Saldo Akhir Kas OSIS</p>
                    <h3 className="text-xl font-black text-white font-display">Rp {currentCashBalance.toLocaleString()}</h3>
                  </div>
                </div>

                {/* Main Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-4 rounded-xl">
                  {/* Search filter input */}
                  <div className="relative flex-grow">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari transaksi kas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 w-full"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 shrink-0">
                    <button
                      onClick={() => handleExportStatement('Kas OSIS')}
                      className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Ekspor Excel</span>
                    </button>
                    {isManagerial && (
                      <button
                        onClick={() => openAddModal('cash')}
                        className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Catat Transaksi</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cash List Table */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Tanggal</th>
                          <th className="p-4">Tipe</th>
                          <th className="p-4">Kategori</th>
                          <th className="p-4">Deskripsi</th>
                          <th className="p-4">Petugas</th>
                          <th className="p-4 text-right">Jumlah</th>
                          {isManagerial && <th className="p-4 text-right">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredCash.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-900/20">
                            <td className="p-4">{t.date}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                t.type === 'Masuk' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="p-4">{t.category}</td>
                            <td className="p-4 truncate max-w-[180px]">{t.description}</td>
                            <td className="p-4 text-slate-400">{t.author}</td>
                            <td className={`p-4 text-right font-bold text-white`}>
                              {t.type === 'Masuk' ? '+' : '-'} Rp {t.amount.toLocaleString()}
                            </td>
                            {isManagerial && (
                              <td className="p-4 text-right space-x-2 shrink-0">
                                <button onClick={() => openEditModal('cash', t)} className="text-amber-400 hover:underline">Edit</button>
                                <button onClick={() => handleDeleteItem('cash', t.id)} className="text-rose-400 hover:underline">Hapus</button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 7. VIEW TAB: KAS DENDA SISWA */}
            {dashboardTab === 'fines' && (
              <div className="space-y-6">
                
                {/* Header widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#0b1d33] border border-slate-800 p-6 rounded-2xl text-left">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Denda Lunas (Terkumpul)</p>
                    <h3 className="text-xl font-black text-emerald-400 font-display">Rp {totalFinesCollected.toLocaleString()}</h3>
                  </div>
                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Kas Denda Belum Lunas (Tunggakan)</p>
                    <h3 className="text-xl font-black text-rose-400 font-display">Rp {totalFinesUnpaid.toLocaleString()}</h3>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0b1d33] border border-slate-800 p-4 rounded-xl">
                  {/* Search input */}
                  <div className="relative flex-grow">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari pelanggar atau denda..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 w-full"
                    />
                  </div>

                  <div className="flex space-x-2 shrink-0">
                    <button
                      onClick={() => handleExportStatement('Denda Pelanggaran')}
                      className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Ekspor Excel</span>
                    </button>
                    {isManagerial && (
                      <button
                        onClick={() => openAddModal('fine')}
                        className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Catat Denda Pelanggaran</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Fines Table */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Tanggal</th>
                          <th className="p-4">Nama Pelanggar</th>
                          <th className="p-4">Jenis Pelanggaran</th>
                          <th className="p-4">Deskripsi</th>
                          <th className="p-4 text-center">Status Bayar</th>
                          <th className="p-4 text-right">Jumlah Denda</th>
                          {isManagerial && <th className="p-4 text-right">Aksi</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {filteredFines.map((f) => {
                          const isPaid = f.description.includes('[LUNAS]');
                          const cleanDesc = f.description.replace(' [LUNAS]', '').replace(' [BELUM LUNAS]', '');
                          return (
                            <tr key={f.id} className="hover:bg-slate-900/20">
                              <td className="p-4">{f.date}</td>
                              <td className="p-4 font-bold text-white">{f.violator}</td>
                              <td className="p-4">{f.category}</td>
                              <td className="p-4 text-slate-400 truncate max-w-[150px]">{cleanDesc}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => isManagerial && handleToggleFinePaid(f)}
                                  disabled={!isManagerial}
                                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-colors ${
                                    isPaid 
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/25 hover:bg-rose-500/25'
                                  } ${isManagerial ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                  title={isManagerial ? "Klik untuk merubah status bayar" : ""}
                                >
                                  {isPaid ? 'Lunas' : 'Belum Lunas'}
                                </button>
                              </td>
                              <td className="p-4 text-right font-bold text-white">Rp {f.amount.toLocaleString()}</td>
                              {isManagerial && (
                                <td className="p-4 text-right space-x-2 shrink-0">
                                  <button onClick={() => openEditModal('fine', f)} className="text-amber-400 hover:underline">Edit</button>
                                  <button onClick={() => handleDeleteItem('fine', f.id)} className="text-rose-400 hover:underline">Hapus</button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 8. VIEW TAB: LOG AKTIVITAS (Super/Managerial only) */}
            {dashboardTab === 'logs' && isManagerial && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Log Audit Aktivitas Sistem ERP</h3>
                    <p className="text-xs text-slate-400">Arsip pencatatan mutasi data, login, dan aksi operator ERP.</p>
                  </div>
                  <button
                    onClick={() => handleExportStatement('Log Aktivitas')}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Unduh Log (Excel)</span>
                  </button>
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden text-left">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Stempel Waktu</th>
                          <th className="p-4">Pengguna</th>
                          <th className="p-4">Peran Hak Akses</th>
                          <th className="p-4">Aksi</th>
                          <th className="p-4">Keterangan Rinci</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/30">
                            <td className="p-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                            <td className="p-4 font-bold text-white">{log.user}</td>
                            <td className="p-4">
                              <span className="text-[10px] text-amber-400">{log.role}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                log.action === 'Login' ? 'bg-emerald-500/10 text-emerald-400' :
                                log.action === 'Tambah' ? 'bg-blue-500/10 text-blue-400' :
                                log.action === 'Hapus' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-4 text-slate-300 font-sans">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 9. VIEW TAB: DAFTAR PENGGUNA (Super Admin only) */}
            {dashboardTab === 'users' && isSuperAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0b1d33] border border-slate-800 p-5 rounded-2xl">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Akun Pengguna ERP OSIS</h3>
                    <p className="text-xs text-slate-400">Daftar personil pengurus & admin dengan akses ke sistem ERP.</p>
                  </div>
                  <button
                    onClick={() => openAddModal('user')}
                    className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Daftarkan Pengguna Baru</span>
                  </button>
                </div>

                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300 text-left">
                      <thead>
                        <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold">
                          <th className="p-4">Nama Lengkap</th>
                          <th className="p-4">ID Pengguna (Username)</th>
                          <th className="p-4">Hak Akses Peran</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Ganti Sandi Pertama</th>
                          <th className="p-4">Kata Sandi (Password)</th>
                          <th className="p-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-900/20">
                            <td className="p-4 font-bold text-white">{u.name}</td>
                            <td className="p-4 font-mono">{u.email}</td>
                            <td className="p-4">
                              <span className="text-amber-400 font-bold">{u.role}</span>
                            </td>
                            <td className="p-4">
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                {u.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.mustChangePassword ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-900 text-slate-500'}`}>
                                {u.mustChangePassword ? 'YA (Wajib)' : 'TIDAK'}
                              </span>
                            </td>
                            <td className="p-4 font-mono">
                              <div className="flex items-center space-x-2">
                                <span>{revealedPasswords[u.id] ? (u.password || 'tamhar123') : '••••••••'}</span>
                                <button
                                  onClick={() => setRevealedPasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                  className="text-slate-400 hover:text-white focus:outline-none cursor-pointer"
                                  title={revealedPasswords[u.id] ? "Sembunyikan password" : "Tampilkan password"}
                                >
                                  {revealedPasswords[u.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button onClick={() => openEditModal('user', u)} className="text-amber-400 hover:underline">Edit</button>
                              <button onClick={() => handleDeleteItem('user', u.id)} className="text-rose-400 hover:underline">Hapus</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 10. VIEW TAB: PENGATURAN PORTAL (Super Admin only) */}
            {dashboardTab === 'settings' && isSuperAdmin && (
              <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8">
                <div className="border-b border-slate-800 pb-4 mb-6">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Konfigurasi & Informasi Portal Sekolah</h3>
                  <p className="text-xs text-slate-400">Ubah detail alamat sekolah, kontak fungsionaris, maps, dan kontrol status PPDB gelombang reguler.</p>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-6 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* School name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nama Instansi Sekolah</label>
                      <input
                        type="text"
                        required
                        value={setSchoolName}
                        onChange={(e) => setSetSchoolName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    {/* Slogan */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Slogan Utama Resmi</label>
                      <input
                        type="text"
                        required
                        value={setSlogan}
                        onChange={(e) => setSetSlogan(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Alamat Lengkap Sekolah</label>
                      <input
                        type="text"
                        required
                        value={setAddress}
                        onChange={(e) => setSetAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>

                    {/* Website Resmi */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Website Resmi Tamhar</label>
                      <input
                        type="text"
                        required
                        value={setWebsite}
                        onChange={(e) => setSetWebsite(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nomor Telepon Kantor</label>
                      <input
                        type="text"
                        required
                        value={setPhone}
                        onChange={(e) => setSetPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>

                    {/* Whatsapp */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">WhatsApp Hotline PPDB</label>
                      <input
                        type="text"
                        required
                        value={setWhatsapp}
                        onChange={(e) => setSetWhatsapp(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>

                    {/* PPDB Status Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status PPDB Online</label>
                      <select
                        value={setPpdbStatus}
                        onChange={(e) => setSetPpdbStatus(e.target.value as 'Buka' | 'Tutup')}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400 font-bold"
                      >
                        <option value="Buka">BUKA (Penerimaan Aktif)</option>
                        <option value="Tutup">TUTUP (Registrasi Istirahat)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Simpan Konfigurasi Portal
                    </button>
                  </div>
                </form>

                <div className="border-t border-slate-800 my-8" />

                <div className="border-b border-slate-800 pb-4 mb-6">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Key className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Ubah Kata Sandi Akun Super Admin</span>
                  </h3>
                  <p className="text-xs text-slate-400">Amankan portal ERP Anda dengan merubah kata sandi secara berkala.</p>
                </div>

                <form onSubmit={handleSaveSuperAdminPassword} className="space-y-6 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Old Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Lama</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kata Sandi Baru</label>
                      <input
                        type="password"
                        required
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Konfirmasi Kata Sandi Baru</label>
                      <input
                        type="password"
                        required
                        value={confirmAdminPassword}
                        onChange={(e) => setConfirmAdminPassword(e.target.value)}
                        placeholder="Ulangi kata sandi baru"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Perbarui Kata Sandi Super Admin
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 11. VIEW TAB: ABSENSI GURU PIKET (Senin - Jumat) */}
            {dashboardTab === 'piket' && (isSuperAdmin || isManagerial || isGuruPiket) && (
              <div className="space-y-6">
                
                {/* Header card */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <CheckCircle2 className="w-40 h-40 text-amber-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest bg-amber-400/10 px-2.5 py-1 rounded-full">Modul Guru Piket</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Pencatatan Absensi Dewan Guru</h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                      Kelola absensi harian bapak & ibu guru SMP Taman Harapan Bekasi untuk periode Senin s.d. Jumat secara digital, real-time, dan terintegrasi.
                    </p>
                  </div>
                </div>

                {/* Day selector & Actions */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[#0b1d33] border border-slate-800 p-4 rounded-2xl">
                  {/* Days tab */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                    {(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const).map((day) => (
                      <button
                        key={day}
                        onClick={() => setAttendanceDayFilter(day)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          attendanceDayFilter === day
                            ? 'bg-amber-400 text-slate-950 shadow font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Mark all as present for selected day
                        const updated = { ...attendance };
                        teachers.forEach(t => {
                          if (!updated[t.id]) updated[t.id] = {};
                          updated[t.id][attendanceDayFilter] = 'Hadir';
                        });
                        setAttendance(updated);
                        localStorage.setItem('smptamhar_attendance', JSON.stringify(updated));
                        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Menandai semua guru HADIR pada hari ${attendanceDayFilter}`);
                        triggerDashAlert('success', `Semua guru berhasil ditandai HADIR untuk hari ${attendanceDayFilter}.`);
                      }}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>Set Semua Hadir</span>
                    </button>
                    <button
                      onClick={() => {
                        // Clear attendance for selected day
                        const updated = { ...attendance };
                        teachers.forEach(t => {
                          if (updated[t.id]) {
                            delete updated[t.id][attendanceDayFilter];
                          }
                        });
                        setAttendance(updated);
                        localStorage.setItem('smptamhar_attendance', JSON.stringify(updated));
                        addActivityLog(currentUser.name, currentUser.role, 'Edit', `Mengosongkan absensi hari ${attendanceDayFilter}`);
                        triggerDashAlert('success', `Data absensi hari ${attendanceDayFilter} berhasil dikosongkan.`);
                      }}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-rose-900 hover:bg-rose-950/20 rounded-xl text-xs font-bold text-rose-400 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>Kosongkan Hari Ini</span>
                    </button>
                    <button
                      onClick={() => {
                        // Export Excel format simulation
                        const rows = teachers.map(t => {
                          const status = attendance[t.id]?.[attendanceDayFilter] || 'Belum Absen';
                          return `${t.name},${t.subject},${status}`;
                        }).join('\n');
                        const blob = new Blob([`Nama Guru,Mata Pelajaran,Status Absen (${attendanceDayFilter})\n${rows}`], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Absensi_Guru_${attendanceDayFilter}_SMP_Tamhar.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        addActivityLog(currentUser.name, currentUser.role, 'Export', `Mengekspor berkas absensi hari ${attendanceDayFilter}`);
                        triggerDashAlert('success', `Laporan Absensi Guru hari ${attendanceDayFilter} berhasil diproduksi! 📥`);
                      }}
                      className="px-3 py-2 bg-amber-400 hover:bg-amber-300 rounded-xl text-xs font-bold text-slate-950 transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Ekspor Absen ({attendanceDayFilter})</span>
                    </button>
                  </div>
                </div>

                {/* Daily stats summary banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Hadir count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Hadir</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">
                      {teachers.filter(t => attendance[t.id]?.[attendanceDayFilter] === 'Hadir').length} Guru
                    </p>
                  </div>
                  {/* Izin count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Izin</span>
                    <p className="text-xl font-black text-amber-400 mt-1">
                      {teachers.filter(t => attendance[t.id]?.[attendanceDayFilter] === 'Izin').length} Guru
                    </p>
                  </div>
                  {/* Sakit count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Sakit</span>
                    <p className="text-xl font-black text-blue-400 mt-1">
                      {teachers.filter(t => attendance[t.id]?.[attendanceDayFilter] === 'Sakit').length} Guru
                    </p>
                  </div>
                  {/* Alpa count */}
                  <div className="bg-[#0b1d33] border border-slate-800 p-4 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Total Alpa</span>
                    <p className="text-xl font-black text-rose-400 mt-1">
                      {teachers.filter(t => attendance[t.id]?.[attendanceDayFilter] === 'Alpa').length} Guru
                    </p>
                  </div>
                </div>

                {/* Teachers attendance roster list */}
                <div className="bg-[#0b1d33] border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-left">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Daftar Guru Roster</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tandai kehadiran bapak/ibu guru untuk hari {attendanceDayFilter} dengan cepat.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/50">
                          <th className="p-4 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Nama Guru</th>
                          <th className="p-4 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Mata Pelajaran</th>
                          <th className="p-4 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider text-center">Status Absensi ({attendanceDayFilter})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {teachers.map((t) => {
                          const currentStatus = attendance[t.id]?.[attendanceDayFilter];
                          return (
                            <tr key={t.id} className="hover:bg-slate-900/30 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center space-x-3 text-left">
                                  <img
                                    src={t.image}
                                    alt={t.name}
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-full border border-slate-800 object-cover"
                                  />
                                  <div>
                                    <p className="text-xs font-bold text-white">{t.name}</p>
                                    <p className="text-[10px] text-slate-500">{t.position}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-medium text-slate-300">
                                {t.subject}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as const).map((status) => {
                                    let activeStyle = '';
                                    if (status === 'Hadir') activeStyle = 'bg-emerald-400/10 text-emerald-400 border-emerald-400';
                                    else if (status === 'Izin') activeStyle = 'bg-amber-400/10 text-amber-400 border-amber-400';
                                    else if (status === 'Sakit') activeStyle = 'bg-blue-400/10 text-blue-400 border-blue-400';
                                    else if (status === 'Alpa') activeStyle = 'bg-rose-400/10 text-rose-400 border-rose-400';

                                    const isActive = currentStatus === status;

                                    return (
                                      <button
                                        key={status}
                                        onClick={() => {
                                          const updated = { ...attendance };
                                          if (!updated[t.id]) updated[t.id] = {};
                                          updated[t.id][attendanceDayFilter] = status;
                                          setAttendance(updated);
                                          localStorage.setItem('smptamhar_attendance', JSON.stringify(updated));
                                          
                                          // Log only occasionally or cleanly
                                          addActivityLog(currentUser.name, currentUser.role, 'Edit', `Mengabsen ${t.name} sebagai [${status}] untuk hari ${attendanceDayFilter}`);
                                        }}
                                        className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                                          isActive 
                                            ? `${activeStyle} shadow-sm font-black` 
                                            : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700 bg-transparent'
                                        }`}
                                      >
                                        {status}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {teachers.length === 0 && (
                    <div className="p-10 text-center text-slate-500 text-xs">
                      Tidak ada data dewan guru untuk diabsen.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      </div>

      {/* DYNAMIC FORM MODAL DIALOG */}
      <AnimatePresence>
        {isModalOpen && modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl text-left relative overflow-hidden text-slate-100"
            >
              {/* Close icon */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-5">
                {modalMode === 'add' ? 'Tambah Data' : 'Ubah Data'} {modalType.toUpperCase()}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* 1. ARTICLE INPUTS */}
                {modalType === 'article' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Berita</label>
                      <input 
                        type="text" required value={artTitle} onChange={(e) => setArtTitle(e.target.value)}
                        placeholder="e.g. Kegiatan Upacara Bendera HUT RI ke-81"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                        <select 
                          value={artCategory} onChange={(e) => setArtCategory(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Berita">Berita</option>
                          <option value="Kegiatan">Kegiatan</option>
                          <option value="Prestasi">Prestasi</option>
                          <option value="OSIS">OSIS</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Ilustrasi Gambar</label>
                        <input 
                          type="text" value={artImage} onChange={(e) => setArtImage(e.target.value)}
                          placeholder="e.g. https://images.unsplash.com/..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Ringkasan Singkat (Excerpt)</label>
                      <input 
                        type="text" required value={artExcerpt} onChange={(e) => setArtExcerpt(e.target.value)}
                        placeholder="Keterangan singkat satu kalimat untuk card list..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Konten Lengkap Berita</label>
                      <textarea 
                        required value={artContent} onChange={(e) => setArtContent(e.target.value)} rows={4}
                        placeholder="Tuliskan detail berita sekolah secara menyeluruh di sini..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 2. GALLERY INPUTS */}
                {modalType === 'gallery' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Album Kegiatan</label>
                      <input 
                        type="text" required value={galAlbum} onChange={(e) => setGalAlbum(e.target.value)}
                        placeholder="e.g. LDKS Angkatan 2026"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tipe Media</label>
                        <select 
                          value={galType} onChange={(e) => setGalType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Photo">Foto Dokumentasi</option>
                          <option value="Video">Video Dokumentasi</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Media</label>
                        <input 
                          type="text" required value={galUrl} onChange={(e) => setGalUrl(e.target.value)}
                          placeholder="e.g. https://images.unsplash.com/..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi Media / Caption</label>
                      <input 
                        type="text" required value={galCaption} onChange={(e) => setGalCaption(e.target.value)}
                        placeholder="e.g. Pelatihan materi kepemimpinan OSIS di aula utama"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 3. TEACHER INPUTS */}
                {modalType === 'teacher' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Guru (Gelar)</label>
                      <input 
                        type="text" required value={teachName} onChange={(e) => setTeachName(e.target.value)}
                        placeholder="e.g. Heri Kiswanto, M.Pd"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Mata Pelajaran Utama</label>
                      <input 
                        type="text" required value={teachSubject} onChange={(e) => setTeachSubject(e.target.value)}
                        placeholder="e.g. Bahasa Indonesia / Matematika / IPA"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Jabatan Struktural</label>
                        <input 
                          type="text" required value={teachPosition} onChange={(e) => setTeachPosition(e.target.value)}
                          placeholder="e.g. Kepala Sekolah / Pembina OSIS / Guru"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Pas Foto Guru</label>
                        <input 
                          type="text" value={teachImage} onChange={(e) => setTeachImage(e.target.value)}
                          placeholder="e.g. https://images.unsplash.com/..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. UNIFORM INPUTS */}
                {modalType === 'uniform' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Jenis Seragam</label>
                      <input 
                        type="text" required value={uniName} onChange={(e) => setUniName(e.target.value)}
                        placeholder="e.g. Seragam Biru Putih Lengkap Atribut"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hari Penggunaan</label>
                        <input 
                          type="text" required value={uniDays} onChange={(e) => setUniDays(e.target.value)}
                          placeholder="e.g. Senin & Selasa"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">URL Foto Sampel</label>
                        <input 
                          type="text" value={uniImage} onChange={(e) => setUniImage(e.target.value)}
                          placeholder="e.g. https://images.unsplash.com/..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan / Detil Atribut</label>
                      <textarea 
                        required value={uniDesc} onChange={(e) => setUniDesc(e.target.value)} rows={2}
                        placeholder="Spesifikasi kaos kaki, ikat pinggang berlambang, topi, dasi sekolah..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 5. CASH TRANSACTION INPUTS */}
                {modalType === 'cash' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Tipe Arus Kas</label>
                        <select 
                          value={cashType} onChange={(e) => setCashType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Masuk">Masuk (Pendapatan)</option>
                          <option value="Keluar">Keluar (Pengeluaran)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Transaksi (Rupiah)</label>
                        <input 
                          type="number" required value={cashAmount || ''} onChange={(e) => setCashAmount(Number(e.target.value))}
                          placeholder="e.g. 50000"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Keuangan</label>
                      <select 
                        value={cashCategory} onChange={(e) => setCashCategory(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      >
                        <option value="Iuran Bulanan">Iuran Bulanan</option>
                        <option value="Konsumsi">Konsumsi</option>
                        <option value="Dokumentasi">Dokumentasi</option>
                        <option value="Sponsorship">Sponsorship</option>
                        <option value="Lain-lain">Lain-lain</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan / Deskripsi Transaksi</label>
                      <input 
                        type="text" required value={cashDesc} onChange={(e) => setCashDesc(e.target.value)}
                        placeholder="e.g. Uang iuran kas mingguan pengurus OSIS kelas 7 & 8"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 6. FINE TRANSACTION INPUTS */}
                {modalType === 'fine' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Siswa Pelanggar</label>
                        <input 
                          type="text" required value={fineViolator} onChange={(e) => setFineViolator(e.target.value)}
                          placeholder="e.g. Bobby Iskandar"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nominal Denda (Rupiah)</label>
                        <input 
                          type="number" required value={fineAmount || ''} onChange={(e) => setFineAmount(Number(e.target.value))}
                          placeholder="e.g. 10000"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Kategori Pelanggaran</label>
                        <select 
                          value={fineCategory} onChange={(e) => setFineCategory(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Keterlambatan">Keterlambatan</option>
                          <option value="Atribut Tidak Lengkap">Atribut Tidak Lengkap</option>
                          <option value="Kebersihan">Kebersihan</option>
                          <option value="Pengeluaran Kegiatan">Pengeluaran Kegiatan</option>
                          <option value="Lain-lain">Lain-lain</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Status Awal</label>
                        <select 
                          value={fineStatus} onChange={(e) => setFineStatus(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Belum Lunas">Belum Lunas</option>
                          <option value="Lunas">Lunas</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi Pelanggaran / Kronologi</label>
                      <input 
                        type="text" required value={fineDesc} onChange={(e) => setFineDesc(e.target.value)}
                        placeholder="e.g. Datang terlambat lebih dari 15 menit ke upacara hari senin"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* 7. USER MANAGEMENT INPUTS */}
                {modalType === 'user' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Anggota ERP</label>
                      <input 
                        type="text" required value={usrName} onChange={(e) => setUsrName(e.target.value)}
                        placeholder="e.g. Aditya Pratama"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">ID Pengguna / Username ERP</label>
                      <input 
                        type="text" required value={usrEmail} onChange={(e) => setUsrEmail(e.target.value)}
                        placeholder="e.g. bendahara.osis atau superadmin"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Kata Sandi Akun (Password)</label>
                      <input 
                        type="text" value={usrPassword} onChange={(e) => setUsrPassword(e.target.value)}
                        placeholder="e.g. tamhar123 (Masukkan kata sandi baru untuk mengganti)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Hak Akses Peran (Role)</label>
                        <select 
                          value={usrRole} onChange={(e) => setUsrRole(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="Normal User">Normal User (Siswa/Kontributor)</option>
                          <option value="Managerial OSIS">Managerial OSIS (Pengurus Inti OSIS)</option>
                          <option value="Managerial Sekolah">Managerial Sekolah (Staf/Pimpinan)</option>
                          <option value="Guru Piket">Guru Piket (Guru Penjaga/Piket)</option>
                          <option value="Guru">Guru (Tenaga Pengajar)</option>
                          <option value="Super Admin">Super Admin (Guru Pembina)</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2 pt-5">
                        <input 
                          type="checkbox" id="pwd-change-chk" checked={usrMustChangePwd} onChange={(e) => setUsrMustChangePwd(e.target.checked)}
                          className="accent-amber-400 text-slate-900 rounded focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="pwd-change-chk" className="text-[10px] font-bold text-slate-300 cursor-pointer select-none">Wajib Ganti Sandi di Login Awal</label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3 text-xs font-bold">
                  <button
                    type="button" onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-350 text-slate-950 rounded-xl cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

        {deleteConfirm.isOpen && deleteConfirm.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1d33] border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left relative overflow-hidden text-slate-100 space-y-4"
            >
              <div className="flex items-center space-x-3 text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-white">Konfirmasi Hapus</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Apakah Anda yakin ingin menghapus data <span className="text-amber-400 font-bold uppercase">{deleteConfirm.type === 'fine' ? 'denda' : deleteConfirm.type === 'cash' ? 'kas' : deleteConfirm.type === 'user' ? 'akun' : deleteConfirm.type === 'teacher' ? 'guru' : deleteConfirm.type === 'uniform' ? 'seragam' : deleteConfirm.type === 'gallery' ? 'galeri' : 'artikel'}</span> ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end space-x-2 pt-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
