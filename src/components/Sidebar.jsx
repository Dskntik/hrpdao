import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import { 
  FaHome, 
  FaUser, 
  FaGlobe, 
  FaComments, 
  FaUsers, 
  FaBriefcase, 
  FaBell, 
  FaCog, 
  FaSignOutAlt,
  FaPlus,
} from 'react-icons/fa';

function Sidebar({ currentUser }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { label: 'country', path: '/country', icon: <FaGlobe size={18} /> },
    { label: 'profile', path: '/profile', icon: <FaUser size={18} /> },
    { label: 'chat', path: '/chat', icon: <FaComments size={18} /> },
    { label: 'community', path: '/community', icon: <FaUsers size={18} /> },
    { label: 'services', path: '/services', icon: <FaBriefcase size={18} /> },
    { label: 'notifications', path: '/notifications', icon: <FaBell size={18} /> },
    { label: 'settings', path: '/settings', icon: <FaCog size={18} /> },
  ];

  // Завантаження профілю користувача
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const { data: profileData, error } = await supabase
          .from('users')
          .select('username, profile_picture, country, city, status, bio')
          .eq('id', currentUser.id)
          .single();

        if (error) throw error;

        setUserProfile(profileData || {
          username: '',
          profile_picture: '',
          country: '',
          city: '',
          status: '',
          bio: ''
        });
      } catch (err) {
        console.error('Помилка завантаження профілю:', err);
        setUserProfile({
          username: '',
          profile_picture: '',
          country: '',
          city: '',
          status: '',
          bio: ''
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (err) {
      console.error('Помилка виходу:', err);
      alert(t('logoutError'));
    }
  };

  // Функція для переходу на сторінку профілю
  const handleProfileClick = () => {
    navigate('/profile');
  };

  const isActive = (path) => location.pathname === path;

  const getCountryName = (countryCode) => {
    const countries = {
      'UA': { en: 'Ukraine', uk: 'Україна' },
      'US': { en: 'United States', uk: 'США' },
      'GB': { en: 'United Kingdom', uk: 'Великобританія' },
      'DE': { en: 'Germany', uk: 'Німеччина' },
      'FR': { en: 'France', uk: 'Франція' },
      'PL': { en: 'Poland', uk: 'Польща' },
    };
    
    const country = countries[countryCode];
    return country ? country[i18n.language] || country.en : countryCode;
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex items-center text-left p-3 rounded-full transition-all duration-200${
              isActive(item.path)
                ? ' bg-gray-100 text-accent'
                : ' text-blue-950 hover:bg-gray-100 hover:text-accent'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            <span className="text-base font-medium">{t(item.label)}</span>
          </button>
        ))}
        
        {/* Кнопка створення посту */}
        <button
          onClick={() => navigate('/create-post')}
          className="w-full px-4 py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800"
          aria-label={t('createPost')}
        >
          <FaPlus className="w-4 h-4" />
          {t('createPost') || 'Додати пост'}
        </button>

        {/* СЕКЦІЯ: Інформація про користувача та кнопка виходу */}
        {currentUser && userProfile && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              {/* Аватарка з можливістю переходу на профіль */}
              <button
                onClick={handleProfileClick}
                className="flex-shrink-0 focus:outline-none hover:opacity-80 transition-opacity duration-200"
              >
                <img
                  src={userProfile.profile_picture || 'https://placehold.co/64x64'}
                  alt={t('profilePicture')}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              </button>
              
              <div className="flex-1 min-w-0">
                {/* Ім'я користувача з можливістю переходу на профіль */}
                <button
                  onClick={handleProfileClick}
                  className="text-left focus:outline-none hover:text-accent transition-colors duration-200 w-full"
                >
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {userProfile.username || currentUser.email || t('anonymous')}
                  </h3>
                </button>
                
                {/* Вид діяльності */}
                <p className="text-xs text-blue-600 font-medium truncate">
                  {userProfile.status || t('noStatus')}
                </p>
                
                {/* Країна */}
                <p className="text-sm text-gray-600 truncate">
                  {userProfile.country ? getCountryName(userProfile.country) : t('unknown')}
                </p>
              </div>
            </div>

            {/* Кнопка виходу */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-200 transition-all duration-200 mt-2"
            >
              <FaSignOutAlt className="w-3 h-3" />
              {t('logout') || 'Вийти'}
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}

export default Sidebar;