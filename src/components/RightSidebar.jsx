// src/components/RightSidebar.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Heart, 
  GraduationCap, 
  Shield
} from 'lucide-react';

function RightSidebar({ currentUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'complaint',
      icon: FileText,
      label: t('submitComplaint') || 'Submit Complaint',
      description: t('complaint.subtitle') || 'Share your complaints and help us improve our service',
      path: '/complaint',
      baseColor: 'blue'
    },
    {
      id: 'donation',
      icon: Heart,
      label: t('donation') || 'Support Project',
      description: t('donationDescription') || 'Your support helps us continue fighting for human rights',
      path: '/donation',
      baseColor: 'green'
    },
    {
      id: 'education',
      icon: GraduationCap,
      label: t('educationCenter') || 'Education Center',
      description: t('education.description') || 'Interactive courses and educational materials',
      path: '/education',
      baseColor: 'purple'
    },
    {
      id: 'violators',
      icon: Shield,
      label: t('violators') || 'Violation Cases',
      description: t('violators.description') || 'Database of documented human rights violations',
      path: '/violators',
      baseColor: 'red'
    }
  ];

  // Функція для перевірки, чи поточна сторінка відповідає пункту меню
  const isActivePage = (path) => {
    return location.pathname === path;
  };

  // Функція для отримання класів кольору
  const getColorClasses = (baseColor, isActive) => {
    const colorMap = {
      blue: {
        gradient: 'from-blue-900 via-blue-800 to-blue-700',
        hover: 'hover:from-blue-950 hover:via-blue-900 hover:to-blue-800',
        active: 'from-blue-600 via-blue-500 to-blue-400'
      },
      green: {
        gradient: 'from-green-900 via-green-800 to-green-700',
        hover: 'hover:from-green-950 hover:via-green-900 hover:to-green-800',
        active: 'from-green-600 via-green-500 to-green-400'
      },
      purple: {
        gradient: 'from-purple-900 via-purple-800 to-purple-700',
        hover: 'hover:from-purple-950 hover:via-purple-900 hover:to-purple-800',
        active: 'from-purple-600 via-purple-500 to-purple-400'
      },
      red: {
        gradient: 'from-red-900 via-red-800 to-red-700',
        hover: 'hover:from-red-950 hover:via-red-900 hover:to-red-800',
        active: 'from-red-600 via-red-500 to-red-400'
      }
    };

    const colors = colorMap[baseColor];
    return {
      gradient: isActive ? colors.active : colors.gradient,
      hover: colors.hover
    };
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions Section */}
      <div className="bg-white/95 p-6 rounded-2xl shadow-lg border border-blue-100 backdrop-blur-sm">
        <h3 className="font-semibold text-blue-950 mb-4 text-center text-lg">
          {t('actions') || 'Actions'}
        </h3>
        <div className="space-y-3">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = isActivePage(item.path);
            const colorClasses = getColorClasses(item.baseColor, isActive);
            
            return (
              <div key={item.id} className="relative z-10">
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full px-4 py-5 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-3 text-sm bg-gradient-to-r ${colorClasses.gradient} ${colorClasses.hover} text-white transform shadow-md hover:shadow-xl ring-2 ${
                    isActive 
                      ? 'ring-white ring-opacity-80 scale-105' 
                      : 'ring-transparent hover:scale-105'
                  } ${
                    !isActive ? 'hover:ring-white hover:ring-opacity-60' : ''
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {item.label}
                </button>
                <p className="text-center mt-2 text-blue-950 text-xs opacity-80">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RightSidebar;