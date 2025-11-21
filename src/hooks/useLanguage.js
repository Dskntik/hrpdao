// hooks/useLanguage.js
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('uk');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Initialize language from localStorage on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'uk';
    i18n.changeLanguage(savedLanguage);
    setCurrentLanguage(savedLanguage);
  }, [i18n]);

  // Change language and save to localStorage
  const changeLanguage = useCallback((lng) => {
    try {
      i18n.changeLanguage(lng);
      localStorage.setItem('language', lng);
      setCurrentLanguage(lng);
      setShowLanguageDropdown(false);
      console.log(`✓ Language changed to: ${lng}`);
    } catch (err) {
      console.error('Error changing language:', err);
    }
  }, [i18n]);

  // Toggle dropdown
  const toggleLanguageDropdown = useCallback(() => {
    setShowLanguageDropdown(prev => !prev);
  }, []);

  // Close dropdown
  const closeLanguageDropdown = useCallback(() => {
    setShowLanguageDropdown(false);
  }, []);

  // Get language display name
  const getLanguageName = useCallback((code) => {
    const languages = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh': '中文',
      'hi': 'हिन्दी',
      'ar': 'العربية',
      'pt': 'Português',
      'ru': 'Русский',
      'ja': '日本語',
      'uk': 'Українська'
    };
    return languages[code] || code;
  }, []);

  return {
    // State
    currentLanguage,
    showLanguageDropdown,
    isUkrainian: currentLanguage === 'uk',
    isEnglish: currentLanguage === 'en',

    // Methods
    changeLanguage,
    toggleLanguageDropdown,
    closeLanguageDropdown,
    getLanguageName,

    // Helper
    availableLanguages: [
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
    ]
  };
};