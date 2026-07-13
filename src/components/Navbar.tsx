/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, X, Bell, LogOut, LayoutDashboard, Compass, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SchoolLogo from './SchoolLogo';
import { NAV_ITEMS, CONTACT_WHATSAPP_INTL } from '../constants';
import { formatWhatsAppUrl } from '../auth';

interface NavbarProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDashboardToggle: () => void;
  isDashboardOpen: boolean;
  userName: string;
}

export default function Navbar({
  isLoggedIn,
  onLogin,
  onLogout,
  activeTab,
  setActiveTab,
  onDashboardToggle,
  isDashboardOpen,
  userName
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = NAV_ITEMS;

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
    if (isDashboardOpen) {
      onDashboardToggle(); // Return to landing view when clicking main nav items
    }
    // Scroll to section smoothly if on landing page
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0b1a30] text-white border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div 
            onClick={() => handleNavClick('home')} 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
            id="navbar-logo"
          >
            <div className="bg-white p-1 sm:p-1.5 rounded-xl group-hover:scale-110 transition-all duration-300 shadow-md shrink-0 flex items-center justify-center">
              <SchoolLogo className="w-8 h-8 lg:w-9 lg:h-9" />
            </div>
            <div className="flex flex-col justify-center leading-none">
              <span className="text-xs sm:text-sm lg:text-sm xl:text-base 2xl:text-lg font-black font-display tracking-tight text-white block whitespace-nowrap">
                SMP TAMAN HARAPAN
              </span>
              <span className="text-[7px] sm:text-[8px] lg:text-[8px] xl:text-[9px] 2xl:text-[10px] text-amber-400 block tracking-widest font-extrabold uppercase whitespace-nowrap mt-0.5">
                "Bermata Hati"
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2 2xl:space-x-3.5 shrink-0 mx-4">
            {!isDashboardOpen && navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-2.5 py-1.5 lg:px-3 lg:py-2 xl:px-3.5 xl:py-2 rounded-lg xl:rounded-xl text-[11px] xl:text-xs 2xl:text-sm font-bold transition-all duration-300 ease-out hover:scale-115 active:scale-95 cursor-pointer whitespace-nowrap shadow-sm hover:shadow-lg hover:shadow-amber-400/20 ${
                  activeTab === item.id 
                    ? 'text-slate-950 bg-amber-400 font-extrabold shadow-md shadow-amber-400/20' 
                    : 'text-slate-300 hover:bg-amber-400 hover:text-slate-950'
                }`}
                id={`nav-item-${item.id}`}
              >
                {item.label}
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute bottom-0 left-1 right-1 h-0.5 bg-slate-950"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
            
            {isDashboardOpen && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs xl:text-sm whitespace-nowrap">
                <Compass className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                <span className="whitespace-nowrap">Anda berada di </span>
                <span className="text-white font-bold bg-slate-800 px-3 py-1 rounded-full text-[10px] xl:text-xs border border-slate-700 whitespace-nowrap">
                  PORTAL ERP INTERNAL GENOSTAR
                </span>
              </div>
            )}
          </div>

          {/* Desktop Auth / User Controls */}
          <div className="hidden lg:flex items-center space-x-2 xl:space-x-3 2xl:space-x-4 shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center space-x-2 xl:space-x-3">
                {/* Dashboard Toggle Button */}
                <button
                  onClick={onDashboardToggle}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 lg:px-3 lg:py-2 xl:px-4 xl:py-2.5 rounded-lg xl:rounded-xl text-[10px] xl:text-xs 2xl:text-sm font-bold transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer whitespace-nowrap shadow-md ${
                    isDashboardOpen 
                      ? 'bg-slate-800 text-white hover:bg-amber-400 hover:text-slate-950 border border-slate-700 hover:border-transparent hover:shadow-amber-400/30' 
                      : 'bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-amber-400/20'
                  }`}
                  id="dashboard-toggle-btn"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span className="whitespace-nowrap">{isDashboardOpen ? 'Kembali ke Portal' : 'Portal Login'}</span>
                </button>

                {/* Notifications */}
                <button className="relative text-slate-300 hover:text-slate-950 hover:bg-amber-400 hover:scale-110 p-2 xl:p-2.5 transition-all duration-300 ease-out rounded-lg xl:rounded-xl cursor-pointer shadow-sm hover:shadow-lg hover:shadow-amber-400/20">
                  <span className="absolute top-0.5 right-0.5 w-2 xl:w-2.5 h-2 xl:h-2.5 bg-rose-500 rounded-full ring-1 xl:ring-2 ring-[#0b1a30]" />
                  <Bell className="w-3.5 h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 shrink-0" />
                </button>

                {/* Profile Widget */}
                <div className="flex items-center space-x-2 xl:space-x-3 pl-2 xl:pl-3 border-l border-slate-800 shrink-0">
                  <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-slate-900 flex items-center justify-center font-bold text-xs xl:text-sm border-2 border-slate-700 shadow-sm shrink-0">
                    {userName ? userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden xl:block text-left shrink-0">
                    <p className="text-xs xl:text-sm font-semibold text-slate-200 leading-none whitespace-nowrap">{userName}</p>
                    <button 
                       onClick={onLogout}
                      className="text-[10px] xl:text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1 mt-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <LogOut className="w-3 h-3 shrink-0" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 xl:space-x-3 shrink-0">
                <button
                  onClick={onLogin}
                  className="px-2.5 py-1.5 lg:px-3 lg:py-2 xl:px-4 xl:py-2.5 rounded-lg xl:rounded-xl text-[10px] xl:text-xs 2xl:text-sm font-bold border border-slate-700 hover:bg-amber-400 hover:text-slate-950 hover:border-transparent transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer whitespace-nowrap shadow-sm hover:shadow-lg hover:shadow-amber-400/20"
                  id="login-btn"
                >
                  Portal Login
                </button>
                <a
                  href={formatWhatsAppUrl(CONTACT_WHATSAPP_INTL)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-400 text-slate-900 px-2.5 py-1.5 lg:px-3 lg:py-2 xl:px-4 xl:py-2.5 rounded-lg xl:rounded-xl text-[10px] xl:text-xs 2xl:text-sm font-bold hover:bg-amber-300 transition-all duration-300 ease-out hover:scale-110 active:scale-95 shadow-md shadow-amber-400/20 cursor-pointer whitespace-nowrap inline-block text-center"
                  id="signup-btn"
                >
                  PPDB Online
                </a>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-3">
            {isLoggedIn ? (
              <button
                onClick={onDashboardToggle}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-amber-400 shadow-inner"
                title="Portal Login"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center space-x-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 rounded-xl text-slate-950 font-bold text-xs shadow-md"
                title="Portal Login"
                id="mobile-login-btn"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-[#0f2444] border-t border-slate-800"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {!isDashboardOpen ? (
                navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`block w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-amber-400 text-slate-900 font-semibold' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-slate-400 text-sm italic">
                  Berada di Dashboard ERP GENOSTAR
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-800 space-y-3">
                {isLoggedIn ? (
                  <div className="space-y-2 px-2">
                    <div className="flex items-center space-x-3 py-2">
                      <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-200">{userName}</span>
                    </div>
                    <button
                      onClick={() => {
                        onDashboardToggle();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>{isDashboardOpen ? 'Kembali ke Portal' : 'Portal Login'}</span>
                    </button>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 px-2">
                    <button
                      onClick={() => {
                        onLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-center py-2.5 rounded-xl text-sm font-semibold border border-slate-700 hover:bg-slate-800 text-white"
                    >
                      Portal Login
                    </button>
                    <a
                      href={formatWhatsAppUrl(CONTACT_WHATSAPP_INTL)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 inline-block"
                    >
                      PPDB Online
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
