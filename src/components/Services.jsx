import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import countries from '../utils/countries';
import MainLayout from '../components/layout/MainLayout';
import {
  FileText,
  GraduationCap,
  Heart,
  Scale,
  Building,
  Briefcase,
  Monitor,
  Leaf,
  Globe,
  Users,
  Plus,
  Search
} from 'lucide-react';

const Services = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [userCountry, setUserCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredService, setHoveredService] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allServices, setAllServices] = useState([]); // Додано стан для реальних сервісів

  const serviceCategories = [
    {
      name: t('services.administrative'),
      path: (countryId) => `/services/${countryId}/administrative`,
      key: 'administrative',
      description: [],
      icon: <FileText className="w-6 h-6" />,
    },
    {
      name: t('services.educationCulture'),
      path: (countryId) => `/services/${countryId}/education-culture`,
      key: 'education-culture',
      description: [],
      icon: <GraduationCap className="w-6 h-6" />,
    },
    {
      name: t('services.healthcare'),
      path: (countryId) => `/services/${countryId}/healthcare`,
      key: 'healthcare',
      description: [],
      icon: <Heart className="w-6 h-6" />,
    },
    {
      name: t('services.securityLaw'),
      path: (countryId) => `/services/${countryId}/security-law`,
      key: 'security-law',
      description: [],
      icon: <Scale className="w-6 h-6" />,
    },
    {
      name: t('services.infrastructureUtilities'),
      path: (countryId) => `/services/${countryId}/infrastructure-utilities`,
      key: 'infrastructure-utilities',
      description: [],
      icon: <Building className="w-6 h-6" />,
    },
    {
      name: t('services.economicFinancial'),
      path: (countryId) => `/services/${countryId}/economic-financial`,
      key: 'economic-financial',
      description: [],
      icon: <Briefcase className="w-6 h-6" />,
    },
    {
      name: t('services.digitalInformation'),
      path: (countryId) => `/services/${countryId}/digital-information`,
      key: 'digital-information',
      description: [],
      icon: <Monitor className="w-6 h-6" />,
    },
    {
      name: t('services.environmental'),
      path: (countryId) => `/services/${countryId}/environmental`,
      key: 'environmental',
      description: [],
      icon: <Leaf className="w-6 h-6" />,
    },
    {
      name: t('services.international'),
      path: (countryId) => `/services/${countryId}/international`,
      key: 'international',
      description: [],
      icon: <Globe className="w-6 h-6" />,
    },
    {
      name: t('services.socialCommunity'),
      path: (countryId) => `/services/${countryId}/social-community`,
      key: 'social-community',
      description: [],
      icon: <Users className="w-6 h-6" />,
    },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error loading profile:', profileError);
            setCurrentUser(user);
            setUserCountry('ua');
            setSelectedCountry('ua');
          } else {
            const userWithProfile = { 
              ...user, 
              username: profile.username,
              profile_picture: profile.profile_picture,
              country: profile.country,
              city: profile.city,
              status: profile.status,
              bio: profile.bio,
              social_links: profile.social_links
            };
            
            setCurrentUser(userWithProfile);
            setUserCountry(profile.country || 'ua');
            setSelectedCountry(profile.country || 'ua');
          }
        } else {
          setCurrentUser(null);
          setUserCountry('ua');
          setSelectedCountry('ua');
        }
      } catch (err) {
        setError(err.message);
        setCurrentUser(null);
        setUserCountry('ua');
        setSelectedCountry('ua');
      } finally {
        setLoading(false);
      }
    };

    const fetchAllServices = async () => {
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .order('created_at', { ascending: false });

        if (servicesError) throw servicesError;
        setAllServices(servicesData || []);
      } catch (error) {
        console.error('Помилка отримання сервісів:', error);
      }
    };

    fetchUserData();
    fetchAllServices();
  }, []);

  const displayCountry = userCountry || 'ua';
  const countryData = countries.find((c) => c.code.toLowerCase() === displayCountry?.toLowerCase());
  const countryName = countryData ? countryData.name[i18n.language] || countryData.name['en'] : 'Unknown';

  // Фільтрація категорій сервісів за пошуковим запитом
  const filteredCategories = serviceCategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Фільтрація реальних сервісів за пошуковим запитом
  const filteredServices = allServices.filter(service =>
    service.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.service_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg mx-4 text-center">
          <h2 className="text-xl font-semibold text-blue-950 mb-2">{t('error')}</h2>
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  const servicesContent = (
    <div className="w-full mx-auto px-2 sm:px-4 flex-1 mt-2 sm:mt-4 pb-4">
      <div className="space-y-3 sm:space-y-4">
        <div className="bg-white/95 p-6 rounded-2xl shadow-lg border border-blue-100 backdrop-blur-sm mb-6">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-3xl font-bold text-blue-950">
              {t('services.title', { country: countryName })}
            </h1>
          </div>
          
          {/* Пошук сервісів */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t('services.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          
          <div className="mb-8">
            <Link
              to={`/services/${displayCountry}/add`}
              className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 text-base font-medium shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('services.addService')}
            </Link>
          </div>

          {/* Результати пошуку реальних сервісів */}
          {searchQuery && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-blue-950 mb-4">
                {t('services.searchResults')} ({filteredServices.length})
              </h3>
              {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredServices.map((service) => (
                    <div 
                      key={service.id} 
                      className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-medium text-blue-900">
                            {service.company_name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {service.service_type} • {service.country}
                          </p>
                          {service.description && (
                            <p className="text-gray-700 mt-2 text-sm">
                              {service.description}
                            </p>
                          )}
                        </div>
                        <Link
                          to={`/services/${service.country}/${service.service_type}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {t('services.viewDetails')}
                        </Link>
                      </div>
                      {service.phone && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">{t('services.phone')}:</span> {service.phone}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">{t('services.noServicesFound')}</p>
              )}
            </div>
          )}
          
          {/* Категорії сервісів */}
          <div>
            <h3 className="text-xl font-semibold text-blue-950 mb-4">
              {searchQuery ? t('services.categories') : t('services.allCategories')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((service) => (
                  <div 
                    key={service.key} 
                    className="relative bg-white/95 rounded-2xl border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 overflow-hidden backdrop-blur-sm"
                    onMouseEnter={() => setHoveredService(service.key)}
                    onMouseLeave={() => setHoveredService(null)}
                  >
                    <Link
                      to={service.path(displayCountry)}
                      className="block p-5 h-full"
                    >
                      <div className="flex items-start">
                        <div className="text-blue-700 mr-4 mt-1">{service.icon}</div>
                        <div>
                          <h2 className="text-lg font-semibold text-blue-950 mb-2">{service.name}</h2>
                          {(hoveredService === service.key) && (
                            <ul className="text-sm text-blue-800 space-y-1 mt-2">
                              {service.description.map((desc, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="mr-2">•</span> 
                                  <span>{desc}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">{t('services.noCategoriesFound')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout 
      currentUser={currentUser}
      showRightSidebar={true}
    >
      {servicesContent}
    </MainLayout>
  );
};

export default Services;