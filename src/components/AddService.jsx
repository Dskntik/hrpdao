import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import countries from '../utils/countries';
import MainLayout from '../components/layout/MainLayout';

const AddService = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    service_type: '',
    company_name: '',
    phone: '',
    address: '',
    cost: '',
    description: '',
    country: id || '',
  });
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const serviceTypes = [
    { key: 'administrative', name: t('services.administrative') },
    { key: 'education-culture', name: t('services.educationCulture') },
    { key: 'healthcare', name: t('services.healthcare') },
    { key: 'security-law', name: t('services.securityLaw') },
    { key: 'infrastructure-utilities', name: t('services.infrastructureUtilities') },
    { key: 'economic-financial', name: t('services.economicFinancial') },
    { key: 'digital-information', name: t('services.digitalInformation') },
    { key: 'environmental', name: t('services.environmental') },
    { key: 'international', name: t('services.international') },
    { key: 'social-community', name: t('services.socialCommunity') },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          console.error('Помилка автентифікації:', authError);
          setError(t('errors.userNotAuthenticated'));
          setLoading(false);
          return;
        }
        
        if (user) {
          // Отримуємо повну інформацію про профіль користувача
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error('Error loading profile:', profileError);
            // Якщо профіль не знайдено, використовуємо тільки дані з auth
            setCurrentUser(user);
          } else {
            // Об'єднуємо дані з auth і профілю
            setCurrentUser({ 
              ...user, 
              username: profile.username,
              profile_picture: profile.profile_picture,
              country: profile.country,
              city: profile.city,
              status: profile.status,
              bio: profile.bio,
              social_links: profile.social_links
            });
          }

          // Встановлюємо країну для форми
          if (!id) {
            if (profile && profile.country) {
              setFormData((prev) => ({ ...prev, country: profile.country.toLowerCase() }));
            }
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Помилка:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id, t]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setError(t('errors.userNotAuthenticated'));
      return;
    }
    if (!formData.service_type || !formData.company_name || !formData.country) {
      setError(t('errors.requiredFields'));
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .insert({
          service_type: formData.service_type,
          company_name: formData.company_name,
          phone: formData.phone,
          address: formData.address,
          cost: formData.cost,
          description: formData.description,
          country: formData.country.toLowerCase(),
          user_id: currentUser.id,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      navigate(`/services/${formData.country.toLowerCase()}/${formData.service_type}`);
    } catch (err) {
      console.error('Помилка додавання сервісу:', err);
      setError(t('errors.addServiceFailed'));
    }
  };

  const countryOptions = countries.map(({ code, name }) => ({
    value: code.toLowerCase(),
    label: name[i18n.language] || name['en'],
  }));

  const addServiceContent = (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white/95 p-6 rounded-2xl shadow-lg border border-blue-100 backdrop-blur-sm mb-6">
          <h1 className="text-3xl font-bold text-blue-950 mb-6">{t('services.addService')}</h1>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-2">
                {t('services.serviceType')}
              </label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              >
                <option value="">{t('services.selectServiceType')}</option>
                {serviceTypes.map((type) => (
                  <option key={type.key} value={type.key}>{type.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-2">
                {t('services.country')}
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              >
                <option value="">{t('services.searchCountry')}</option>
                {countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-2">
                {t('services.companyName')}
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-2">
                {t('services.phone')}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-2">
                {t('services.address')}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-2">
                {t('services.cost')}
              </label>
              <input
                type="text"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-2">
                {t('services.description')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                rows={4}
              />
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 flex items-start gap-3 shadow-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              {t('services.addServiceButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout 
      currentUser={currentUser}
    >
      {addServiceContent}
    </MainLayout>
  );
};

export default AddService;