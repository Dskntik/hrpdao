import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FaSearch, 
  FaUserCircle,
  FaTimes,
  FaWallet,
  FaBars,
  FaFileAlt,
  FaGlobe,
  FaChevronDown
} from 'react-icons/fa';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '../utils/supabase';

function Navbar({ currentUser, onToggleSidebar }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [connected, setConnected] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('profile_picture')
          .eq('id', currentUser.id)
          .single();
        if (!profileError && profile) {
          setProfileData(profile);
        }
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLanguageDropdownOpen && !event.target.closest('.language-selector')) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLanguageDropdownOpen]);

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert(t('metaMaskNotFound'));
      return;
    }
    try {
      if (!window.ethereum.isMetaMask || !window.ethereum.isConnected()) {
        alert(t('metaMaskNotReady'));
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setConnected(true);
        alert(t('walletConnected'));
      }
    } catch (error) {
      console.error('MetaMask connection error:', error);
      alert(t('walletConnectionError'));
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'zh', name: '中文' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ar', name: 'العربية' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'uk', name: 'Українська' }
  ];

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem('language', languageCode);
    setIsLanguageDropdownOpen(false);
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === i18n.language) || languages[0];
  };

  const handleSearchToggle = () => {
    if (window.innerWidth < 768) {
      setIsSearchExpanded(!isSearchExpanded);
    }
  };

  const handleDocumentClick = () => {
    window.open('https://ipfs.io/ipfs/QmRXQP1s6rVaiXxrr6jY6Y7EfK1CYvyc82F99siunckoQr/', '_blank');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Logo and menu button for mobile */}
            <div className="flex items-center">
              {/* Menu button for mobile */}
              {isMobile && (
                <button 
                  onClick={onToggleSidebar}
                  className="p-2 rounded-full hover:bg-gray-100 mr-2"
                >
                  <FaBars className="h-5 w-5 text-gray-600" />
                </button>
              )}
              
              {/* Logotype */}
              <div 
                className="flex items-center cursor-pointer" 
                onClick={() => navigate('/feed')}
              >
                <div className="flex items-center">
                  <div className="bg-accent text-blue-950 p-1.5 sm:p-2 rounded-md font-bold text-sm sm:text-base">
                    <img 
                      src="/logo.png" 
                      alt="HRP Logo" 
                      className="h-6 sm:h-8 w-auto max-w-[80px] object-contain"
                    />
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className="text-lg sm:text-xl font-bold text-navy">
                      HUMAN RIGHTS POLICY DAO
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Allow no harm to yourself. Do no harm to others.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* The right part */}
            <div className={`flex items-center space-x-2 sm:space-x-3 ${isSearchExpanded ? 'hidden' : 'flex'}`}>
              {/* Desktop search and document */}
              {!isMobile && (
                <div className="flex items-center space-x-3">
                  {/* Search field */}
                  <div className="relative w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder={t('searchPlaceholder')}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-accent focus:border-accent text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Document icon - now positioned next to search */}
                  <button
                    onClick={handleDocumentClick}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative w-10 h-10 flex items-center justify-center"
                    title="Human Rights Policy"
                  >
                    <FaFileAlt size={28} className="text-black" />
                  </button>
                </div>
              )}

              {/* Search button for mobile */}
              {isMobile && (
                <button 
                  onClick={handleSearchToggle}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                >
                  <FaSearch className="h-5 w-5" />
                </button>
              )}

              {/* Document icon - mobile */}
              {isMobile && (
                <button
                  onClick={handleDocumentClick}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative w-10 h- flex items-center justify-center"
                  title="Human Rights Policy"
                >
                  <FaFileAlt size={28} className="text-black" />
                </button>
              )}

              {/* Purse */}
              <button
                onClick={handleConnectWallet}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative w-10 h-10 flex items-center justify-center"
                disabled={connected}
                title={connected ? t('walletConnected') : t('connectWallet')}
              >
                <FaWallet size={28} className={connected ? "text-green-500" : "text-gray-600"} />
              </button>

              {/* Language selection - improved dropdown */}
              <div className="language-selector relative">
                <button
                  onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors duration-200"
                  title={t('selectLanguage')}
                >
                  <FaGlobe className="h-5 w-5" />
                  <span className="text-sm font-medium hidden sm:block">
                    {getCurrentLanguage().name}
                  </span>
                  <FaChevronDown className={`h-3 w-3 transition-transform duration-200 ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Language dropdown menu */}
                {isLanguageDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-60 overflow-y-auto">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors duration-150 ${
                          i18n.language === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-sm font-medium">{language.name}</span>
                        {i18n.language === language.code && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User profile - displayed only on mobile devices */}
              {isMobile && (
                <button 
                  onClick={() => navigate('/profile')}
                  className="flex items-center justify-center rounded-full focus:outline-none w-9 h-9"
                >
                  {profileData?.profile_picture ? (
                    <img
                      className="w-9 h-9 rounded-full object-cover"
                      src={profileData.profile_picture}
                      alt="User profile"
                    />
                  ) : (
                    <FaUserCircle size={36} className="text-gray-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Advanced search for mobile */}
      {isSearchExpanded && (
        <div className="fixed inset-0 top-16 bg-white p-3 border-b shadow-md z-30">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-accent focus:border-accent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              onClick={() => setIsSearchExpanded(false)}
              className="absolute right-2 top-2 p-1 rounded-full hover:bg-gray-200"
            >
              <FaTimes className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}

export default Navbar;
