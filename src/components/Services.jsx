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
  Plus
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

  const services = [
    {
      name: t('services.administrative'),
      path: (countryId) => `/services/${countryId}/administrative`,
      key: 'administrative',
      description: [
        t('services.administrativeDesc.citizenship'),
        t('services.administrativeDesc.documents'),
        t('services.administrativeDesc.taxes'),
        t('services.administrativeDesc.socialPayments'),
        t('services.administrativeDesc.businessReg'),
      ],
      icon: <FileText className="w-6 h-6" />,
    },
    {
      name: t('services.educationCulture'),
      path: (countryId) => `/services/${countryId}/education-culture`,
      key: 'education-culture',
      description: [
        t('services.educationCultureDesc.education'),
        t('services.educationCultureDesc.culturalPrograms'),
        t('services.educationCultureDesc.languageCourses'),
      ],
      icon: <GraduationCap className="w-6 h-6" />,
    },
    {
      name: t('services.healthcare'),
      path: (countryId) => `/services/${countryId}/healthcare`,
      key: 'healthcare',
      description: [
        t('services.healthcareDesc.medical'),
        t('services.healthcareDesc.insurance'),
        t('services.healthcareDesc.telemedicine'),
      ],
      icon: <Heart className="w-6 h-6" />,
    },
    {
      name: t('services.securityLaw'),
      path: (countryId) => `/services/${countryId}/security-law`,
      key: 'security-law',
      description: [
        t('services.securityLawDesc.police'),
        t('services.securityLawDesc.judicial'),
        t('services.securityLawDesc.cybersecurity'),
      ],
      icon: <Scale className="w-6 h-6" />,
    },
    {
      name: t('services.infrastructureUtilities'),
      path: (countryId) => `/services/${countryId}/infrastructure-utilities`,
      key: 'infrastructure-utilities',
      description: [
        t('services.infrastructureUtilitiesDesc.transport'),
        t('services.infrastructureUtilitiesDesc.utilities'),
        t('services.infrastructureUtilitiesDesc.housing'),
      ],
      icon: <Building className="w-6 h-6" />,
    },
    {
      name: t('services.economicFinancial'),
      path: (countryId) => `/services/${countryId}/economic-financial`,
      key: 'economic-financial',
      description: [
        t('services.economicFinancialDesc.businessSupport'),
        t('services.economicFinancialDesc.trade'),
      ],
      icon: <Briefcase className="w-6 h-6" />,
    },
    {
      name: t('services.digitalInformation'),
      path: (countryId) => `/services/${countryId}/digital-information`,
      key: 'digital-information',
      description: [
        t('services.digitalInformationDesc.egovernment'),
        t('services.digitalInformationDesc.news'),
        t('services.digitalInformationDesc.stats'),
      ],
      icon: <Monitor className="w-6 h-6" />,
    },
    {
      name: t('services.environmental'),
      path: (countryId) => `/services/${countryId}/environmental`,
      key: 'environmental',
      description: [
        t('services.environmentalDesc.protection'),
        t('services.environmentalDesc.greenInitiatives'),
      ],
      icon: <Leaf className="w-6 h-6" />,
    },
    {
      name: t('services.international'),
      path: (countryId) => `/services/${countryId}/international`,
      key: 'international',
      description: [
        t('services.internationalDesc.consular'),
        t('services.internationalDesc.peacekeeping'),
      ],
      icon: <Globe className="w-6 h-6" />,
    },
    {
      name: t('services.socialCommunity'),
      path: (countryId) => `/services/${countryId}/social-community`,
      key: 'social-community',
      description: [
        t('services.socialCommunityDesc.volunteering'),
        t('services.socialCommunityDesc.forums'),
        t('services.socialCommunityDesc.minorities'),
      ],
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
          // Отримуємо повні дані профілю з бази даних
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error loading profile:', profileError);
            // Якщо профіль не знайдено, використовуємо тільки дані з auth
            setCurrentUser(user);
            setUserCountry('ua');
            setSelectedCountry('ua');
          } else {
            // Об'єднуємо дані з auth і профілю
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

    fetchUserData();
  }, []);

  const displayCountry = userCountry || 'ua';
  const countryData = countries.find((c) => c.code.toLowerCase() === displayCountry?.toLowerCase());
  const countryName = countryData ? countryData.name[i18n.language] || countryData.name['en'] : 'Unknown';

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
            className="bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors"
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
            <p className="text-blue-800">
              {t('yourCountry')}: <Link to="/country" className="font-medium text-blue-600 hover:text-blue-800 transition-colors">{countryName}</Link>
            </p>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
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
            ))}
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