import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FaPlus,
  FaTimes,
  FaSearch,
} from 'react-icons/fa';
import { IoMdMegaphone } from 'react-icons/io';
import { BiSolidDonateHeart } from 'react-icons/bi';
import { FaGraduationCap, FaExclamationTriangle } from 'react-icons/fa';
import Sidebar from '../Sidebar';

function MobileLayout({ 
  children, 
  currentUser,
  searchQuery, 
  setSearchQuery,
  isSidebarOpen,
  setIsSidebarOpen,
  isSearchVisible,
  setIsSearchVisible 
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePage = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { icon: FaGraduationCap, label: 'Education', path: '/education' },
    { icon: IoMdMegaphone, label: 'Complaints', path: '/complaint' },
    { icon: FaPlus, label: 'Create', path: '/create-post' },
    { icon: BiSolidDonateHeart, label: 'Donations', path: '/donation' },
    { icon: FaExclamationTriangle, label: 'Violators', path: '/violators' },
  ];

  const quickActions = [
    { 
      icon: IoMdMegaphone, 
      label: t('complaint') || 'Complaint', 
      onClick: () => navigate('/complaint'),
      color: 'text-red-500'
    },
    { 
      icon: BiSolidDonateHeart, 
      label: t('donate') || 'Donate', 
      onClick: () => navigate('/donation'),
      color: 'text-green-500'
    },
    { 
      icon: FaGraduationCap, 
      label: t('education') || 'Education', 
      onClick: () => navigate('/education'),
      color: 'text-purple-500'
    },
    { 
      icon: FaExclamationTriangle, 
      label: t('violators') || 'Violators', 
      onClick: () => navigate('/violators'),
      color: 'text-orange-500'
    },
  ];

  return (
    <>
      {isSearchVisible && (
        <div className="lg:hidden bg-white p-3 border-b">
          <div className="flex items-center">
            <input
              type="text"
              placeholder={t('searchPlaceholder') || 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button className="bg-accent text-white px-4 py-2 rounded-r-lg">
              <FaSearch />
            </button>
            <button 
              onClick={() => setIsSearchVisible(false)}
              className="ml-2 p-2 rounded-full hover:bg-gray-100"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
 
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className="absolute left-0 top-0 h-full w-3/4 max-w-xs bg-white shadow-lg transform transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('menu') || 'Menu'}</h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="p-4">
              <Sidebar currentUser={currentUser} />
            </div>
          </div>
        </div>
      )}
      
      <div className="pb-16 lg:pb-0">
        {children}
        
        {location.pathname === '/feed' && (
          <div className="bg-white p-3 mt-3 rounded-lg shadow">
            <div className="flex justify-between">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button 
                    key={index}
                    onClick={action.onClick}
                    className="flex items-center text-gray-500 text-xs sm:text-sm font-medium"
                  >
                    <Icon className={`mr-1 ${action.color} text-sm sm:text-base`} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between py-3 px-6 z-30 lg:hidden">
        <button 
          className={`flex flex-col items-center text-xs ${
            isActivePage('/education') ? 'text-blue-600' : 'text-gray-600'
          }`}
          onClick={() => navigate('/education')}
        >
          <FaGraduationCap className={`w-5 h-5 mb-1 ${
            isActivePage('/education') ? 'text-blue-600' : 'text-gray-600'
          }`} />
          <span>Education</span>
        </button>

        <button 
          className={`flex flex-col items-center text-xs ${
            isActivePage('/complaint') ? 'text-blue-600' : 'text-gray-600'
          }`}
          onClick={() => navigate('/complaint')}
        >
          <IoMdMegaphone className={`w-5 h-5 mb-1 ${
            isActivePage('/complaint') ? 'text-blue-600' : 'text-gray-600'
          }`} />
          <span>Complaints</span>
        </button>
        
        <button 
          className={`flex flex-col items-center text-xs ${
            isActivePage('/create-post') ? 'text-blue-600' : 'text-gray-600'
          }`}
          onClick={() => navigate('/create-post')}
        >
          <FaPlus className={`w-5 h-5 mb-1 ${
            isActivePage('/create-post') ? 'text-blue-600' : 'text-gray-600'
          }`} />
          <span>Create</span>
        </button>
        
        <button 
          className={`flex flex-col items-center text-xs ${
            isActivePage('/donation') ? 'text-blue-600' : 'text-gray-600'
          }`}
          onClick={() => navigate('/donation')}
        >
          <BiSolidDonateHeart className={`w-5 h-5 mb-1 ${
            isActivePage('/donation') ? 'text-blue-600' : 'text-gray-600'
          }`} />
          <span>Donations</span>
        </button>

        <button 
          className={`flex flex-col items-center text-xs ${
            isActivePage('/violators') ? 'text-blue-600' : 'text-gray-600'
          }`}
          onClick={() => navigate('/violators')}
        >
          <FaExclamationTriangle className={`w-5 h-5 mb-1 ${
            isActivePage('/violators') ? 'text-blue-600' : 'text-gray-600'
          }`} />
          <span>Violators</span>
        </button>
      </div>
    </>
  );
}

export default MobileLayout;
