import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { FullScreenIcon, ExitFullScreenIcon, LogoutIcon, SettingsIcon } from './icons/AdminIcons';


interface HeaderProps {
    user: User;
    onToggleSidebar: () => void;
    onToggleAdminSidebar?: () => void;
    onLogout: () => void;
}

const MenuIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);

const SunIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
);

const MoonIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
);

export const Header: React.FC<HeaderProps> = ({ user, onToggleSidebar, onToggleAdminSidebar, onLogout }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.theme === 'dark' || 
             (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const onFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-30 shrink-0">
      <div className="flex items-center space-x-4">
        <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Toggle resource sidebar">
          <MenuIcon className="h-6 w-6 text-gray-600 dark:text-gray-300"/>
        </button>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Learning Platform</h1>
      </div>
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button onClick={toggleFullScreen} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}>
            {isFullScreen ? <ExitFullScreenIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" /> : <FullScreenIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />}
        </button>
        <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Toggle dark mode">
          {isDarkMode ? <SunIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" /> : <MoonIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />}
        </button>
         <button onClick={onLogout} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Logout">
          <LogoutIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
        {user.role === 'admin' && onToggleAdminSidebar && (
            <button onClick={onToggleAdminSidebar} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Toggle admin sidebar">
                <SettingsIcon className="h-6 w-6 text-gray-600 dark:text-gray-300"/>
            </button>
        )}
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold uppercase">
          {user.name?.[0]}
        </div>
      </div>
    </header>
  );
};