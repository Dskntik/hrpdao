import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import countries from '../utils/countries';
import MainLayout from '../components/layout/MainLayout';

// Lucide Icons
import { 
  Upload, 
  ChevronDown, 
  Check, 
  X,
  FileText,
  Shield,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  AlertTriangle,
  Settings,
  Search
} from 'lucide-react';

const geocodeAddress = async (address, countryCode = '') => {
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    if (countryCode) {
      url += `&countrycodes=${countryCode.toLowerCase()}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

const searchAddresses = async (query, countryCode = '') => {
  if (query.length < 3) return []; 
  
  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

    if (countryCode) {
      url += `&countrycodes=${countryCode.toLowerCase()}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
};

function Complaint() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    country: '',
    contact_info: '',
    violator_name: '',
    victims_info: '',
    violation_date: '',
    violation_time: '',
    violation_address: '',
    violation_action: '',
    violation_consequences: '',
    violation_tools: '',
    description: '',
  });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isModerator, setIsModerator] = useState(false);
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geocoding, setGeocoding] = useState(false);

  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [validAddressSelected, setValidAddressSelected] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error retrieving user', authError);
          setLoading(false);
          return;
        }

        if (user) {
          setUser(user);
          checkModeratorStatus(user);

          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error loading profile:', profileError);
            setCurrentUser(user);
          } else {
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

          const { data, error } = await supabase
            .from('users')
            .select('country')
            .eq('id', user.id)
            .single();
          if (error) throw error;
          const countryCode = data?.country || 'UA';
          setFormData((prev) => ({ ...prev, country: countryCode }));
        } else {
          setFormData((prev) => ({ ...prev, country: 'UA' }));
        }
      } catch (err) {
        setError(err.message || t('error'));
        setFormData((prev) => ({ ...prev, country: 'UA' }));
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [t]);

  const checkModeratorStatus = async (user) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setIsModerator(data.role === 'moderator' || data.role === 'admin');
      }
    } catch (err) {
      console.error('Moderator status check error:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'country') {
      setAddressQuery('');
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setValidAddressSelected(false);
    }
  };

  const handleAddressChange = async (e) => {
    const value = e.target.value;
    setAddressQuery(value);
    setFormData((prev) => ({ ...prev, violation_address: value }));
    setValidAddressSelected(false);

    if (value.length >= 3) {
      setSearchingAddress(true);

      const countryCode = formData.country;
      const suggestions = await searchAddresses(value, countryCode);
      
      setAddressSuggestions(suggestions);
      setShowSuggestions(true);
      setSearchingAddress(false);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddressSelect = (suggestion) => {
    setFormData((prev) => ({ 
      ...prev, 
      violation_address: suggestion.display_name 
    }));
    setAddressQuery(suggestion.display_name);
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setValidAddressSelected(true);
  };

  const validateAddress = async () => {
    // Адреса тепер обов'язкова
    if (!formData.violation_address || formData.violation_address.trim() === '') {
      return false;
    }

    if (!validAddressSelected && addressQuery.length > 0) {
      // Геокодуємо адресу для перевірки валідності
      const countryCode = formData.country;
      const geocodingResult = await geocodeAddress(formData.violation_address, countryCode);
      return geocodingResult !== null;
    }

    return validAddressSelected;
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter((file) => {
        const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf';
        const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
        if (!isValidType) setError(t('complaint.invalidFileType'));
        if (!isValidSize) setError(t('complaint.fileTooLarge'));
        return isValidType && isValidSize;
      });
      setEvidenceFiles(validFiles);
    }
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(t('authRequired'));
      navigate('/');
      setSubmitting(false);
      return;
    }

    if (!formData.description && !formData.violation_action) {
      setError(t('emptyComplaint'));
      setSubmitting(false);
      return;
    }

    const isAddressValid = await validateAddress();
    if (!isAddressValid) {
      setError(t('complaint.invalidAddress') || 'Please enter a valid address or select one from the suggestions');
      setSubmitting(false);
      return;
    }

    try {
      let coordinates = null;
      let geocodedAddress = null;
      
      if (formData.violation_address && formData.violation_address.trim() !== '') {
        setGeocoding(true);

        const countryCode = formData.country;
        const geocodingResult = await geocodeAddress(formData.violation_address, countryCode);
        
        if (geocodingResult) {
          coordinates = { lat: geocodingResult.lat, lng: geocodingResult.lng };
          geocodedAddress = geocodingResult.address;
        }
        setGeocoding(false);
      }

      let evidenceUrls = [];
      if (evidenceFiles.length > 0) {
        const fileUploads = evidenceFiles.map(async (file) => {
          const filePath = `complaints/${user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage.from('complaints').upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('complaints').getPublicUrl(filePath);
          return data.publicUrl;
        });
        evidenceUrls = await Promise.all(fileUploads);
      }

      const complaintData = {
        user_id: user.id,
        country: formData.country,
        contact_info: isAnonymous ? 'Hidden' : formData.contact_info, 
        violator_name: formData.violator_name, 
        victims_info: formData.victims_info, 
        violation_date: formData.violation_date || null,
        violation_time: formData.violation_time || null,
        violation_address: formData.violation_address,
        violation_action: formData.violation_action,
        violation_consequences: formData.violation_consequences,
        violation_tools: formData.violation_tools,
        content: formData.description,
        evidence_urls: evidenceUrls.length > 0 ? evidenceUrls : null,
        is_anonymous: isAnonymous,
        status: 'pending',
        created_at: new Date().toISOString(),
        coordinates: coordinates,
        geocoded_address: geocodedAddress,
      };

      const { error } = await supabase.from('complaints').insert(complaintData);
      if (error) throw error;

      setSuccess(true);
      setFormData({ 
        country: formData.country, 
        contact_info: '', 
        violator_name: '',
        victims_info: '',
        violation_date: '',
        violation_time: '',
        violation_address: '',
        violation_action: '',
        violation_consequences: '',
        violation_tools: '',
        description: '' 
      });
      setAddressQuery('');
      setEvidenceFiles([]);
      setIsAnonymous(false);
      setValidAddressSelected(false);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Complaint submission error:', err);
      setError(err.message || t('complaintError'));
    } finally {
      setSubmitting(false);
      setGeocoding(false);
    }
  };

  const navigateToModeration = () => {
    navigate('/moderation');
  };

  const navigateToViolators = () => {
    navigate('/violators');
  };

  const navigateToViolationsMap = () => {
    navigate('/violations-map');
  };

  const getCurrentCountryName = () => {
    const country = countries.find(c => c.code === formData.country);
    return country ? (country.name[i18n.language] || country.name.en) : '';
  };

  const complaintContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/95 p-6 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm"
    >
      {isModerator && (
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={navigateToModeration}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-md"
          >
            <Settings className="w-4 h-4" />
            Moderation
          </button>
          <button
            onClick={navigateToViolators}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-md"
          >
            <Shield className="w-4 h-4" />
            Verified
          </button>
        </div>
      )}

      <div className="relative z-10">
        <p className="text-center mt-2 mb-4 text-blue-950 text-sm opacity-80">
          {t('complaint.subtitle') || 'Share your complaints'}
        </p>
        
        <div>
          <h3 className="text-lg font-semibold mb-4 text-blue-950 text-center">
            {t('submitComplaint')}
          </h3>
          
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-green-50 text-green-800 rounded-full border border-green-100 flex items-start gap-3 shadow-sm"
            >
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{t('complaintSubmitted')}</p>
                <p className="text-sm mt-1 text-green-700 opacity-90">{t('complaint.thankYou') || 'Thank you for your feedback!'}</p>
              </div>
            </motion.div>
          )}
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 text-red-800 rounded-full border border-red-100 flex items-start gap-3 shadow-sm"
            >
              <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">{t('error') || 'Error'}</p>
                <p className="text-sm mt-1 text-red-700 opacity-90">{error}</p>
              </div>
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('complaint.country') || 'Country'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white text-blue-950 text-sm shadow-sm"
                  aria-label={t('complaint.country') || 'Country'}
                  required
                >
                  <option value="" disabled>
                    {t('complaint.selectCountry') || 'Choose a country'}
                  </option>
                  {countries.map(({ code, name }) => (
                    <option key={code} value={code}>
                      {name[i18n.language] || name.en}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('complaint.violatorName') || 'Possible name of the offender'}
              </label>
              <input
                type="text"
                name="violator_name"
                value={formData.violator_name}
                onChange={handleInputChange}
                placeholder={t('complaint.violatorNamePlaceholder') || 'Enter name or describe the offender'}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {t('complaint.victimsInfo') || 'Data of the affected persons'}
              </label>
              <textarea
                name="victims_info"
                value={formData.victims_info}
                onChange={handleInputChange}
                placeholder={t('complaint.victimsInfoPlaceholder') || 'Describe the affected persons (name, age, condition, etc.)'}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-vertical min-h-[40px] text-blue-950 text-sm shadow-sm"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-950 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('complaint.violationDate') || 'Violation date'}
                </label>
                <input
                  type="date"
                  name="violation_date"
                  value={formData.violation_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-950 mb-1.5 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('complaint.violationTime') || 'Violation time'}
                </label>
                <input
                  type="time"
                  name="violation_time"
                  value={formData.violation_time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-blue-950 mb-1.5 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('complaint.violationAddress') || 'Violation location'}
                <span className="text-red-500 ml-1">*</span>
                {formData.country && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">
                    {getCurrentCountryName()}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="violation_address"
                  value={addressQuery}
                  onChange={handleAddressChange}
                  placeholder={
                    formData.country 
                      ? `${t('complaint.violationAddressPlaceholder') || 'Enter address in'} ${getCurrentCountryName()}` 
                      : t('complaint.violationAddressPlaceholder') || 'Enter address or location of the incident'
                  }
                  className={`w-full px-4 py-2.5 rounded-full border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm pr-10 ${
                    addressQuery && !validAddressSelected && addressSuggestions.length === 0 
                      ? 'border-orange-500' 
                      : addressQuery && validAddressSelected 
                      ? 'border-green-500' 
                      : 'border-gray-200'
                  }`}
                  disabled={!formData.country}
                  required
                />
                {!formData.country && (
                  <div className="absolute inset-0 bg-gray-50/50 rounded-full flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Select country first</span>
                  </div>
                )}
                {searchingAddress && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
                {!searchingAddress && addressQuery.length > 0 && formData.country && (
                  <>
                    {validAddressSelected ? (
                      <Check className="w-4 h-4 text-green-500 absolute right-3 top-3" />
                    ) : (
                      <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                    )}
                  </>
                )}
              </div>
 
              {showSuggestions && addressSuggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto"
                >
                  <div className="p-2 bg-blue-50 text-blue-700 text-xs font-medium border-b border-blue-100">
                    Searching in {getCurrentCountryName()}
                  </div>
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAddressSelect(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0 text-sm text-blue-950"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>{suggestion.display_name}</span>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                {formData.country 
                  ? `${t('complaint.addressGeocodingInfo') || 'Start typing address (min 3 characters) - searching in'} ${getCurrentCountryName()}`
                  : t('complaint.selectCountryFirst') || 'Please select a country first to enable address search'
                }
                <span className="text-red-500 ml-1">*</span>
              </p>
              {addressQuery && !validAddressSelected && addressSuggestions.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {t('complaint.selectValidAddress') || 'Please select a valid address from the suggestions or enter a complete address'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t('complaint.violationAction') || 'Action or inaction that led to the violation'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                name="violation_action"
                value={formData.violation_action}
                onChange={handleInputChange}
                placeholder={t('complaint.violationActionPlaceholder') || 'Describe in detail the action or inaction that led to the rights violation'}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-vertical min-h-[50px] text-blue-950 text-sm shadow-sm"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('complaint.violationConsequences') || 'Consequences of the violation'}
              </label>
              <textarea
                name="violation_consequences"
                value={formData.violation_consequences}
                onChange={handleInputChange}
                placeholder={t('complaint.violationConsequencesPlaceholder') || 'Describe the consequences of the rights violation'}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-vertical min-h-[40px] text-blue-950 text-sm shadow-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('complaint.violationTools') || 'Tools, means of committing the offense'}
              </label>
              <input
                type="text"
                name="violation_tools"
                value={formData.violation_tools}
                onChange={handleInputChange}
                placeholder={t('complaint.violationToolsPlaceholder') || 'Describe the tools used for the violation'}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('complaint.description')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={t('complaint.descriptionPlaceholder') || 'General description of the situation...'}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-vertical min-h-[100px] text-blue-950 text-sm shadow-sm"
                rows={4}
              />
            </div>

            <div className="flex items-center">
              <label className="relative flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full ${isAnonymous ? 'bg-blue-500' : 'bg-gray-300'} transition-colors duration-200 shadow-inner`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white border border-gray-200 rounded-full h-4 w-4 transition-transform duration-200 shadow-sm ${isAnonymous ? 'transform translate-x-5' : ''}`}></div>
              </label>
              <span className="ml-3 text-sm text-blue-950">
                {t('complaint.anonymous')}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('complaint.contactInfo')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="contact_info"
                value={isAnonymous ? 'Hidden' : formData.contact_info}
                onChange={handleInputChange}
                disabled={isAnonymous}
                placeholder={t('complaint.contactPlaceholder') || 'Email or phone'}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-500 text-blue-950 text-sm shadow-sm"
                required={!isAnonymous}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('complaint.contactInfoDescription') || 'This information will be hidden if you choose to submit anonymously'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('complaint.evidence')}
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-full cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 p-4">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="w-5 h-5 mb-2 text-gray-500" />
                    <p className="text-sm text-gray-600 text-center">
                      <span className="font-medium">{t('complaint.clickToUpload') || 'Click to upload'}</span>
                      <br />
                      <span className="text-xs opacity-80">{t('complaint.uploadRestrictions') || 'PNG, JPG, GIF, MP4, PDF (max. 5MB)'}</span>
                    </p>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*,video/*,application/pdf" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>
              
              {evidenceFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-blue-950">{t('complaint.uploadedFiles') || 'Uploaded files:'}</p>
                  {evidenceFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-full text-sm shadow-sm">
                      <span className="text-gray-700 truncate max-w-xs">{file.name}</span>
                      <button 
                        type="button" 
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                        aria-label={t('removeFile') || 'Remove file'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={submitting || geocoding}
              className={`w-full px-4 py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-xl ${
                submitting || geocoding
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800'
              }`}
            >
              {(submitting || geocoding) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {geocoding ? t('complaint.geocoding') || 'Geocoding address...' : t('complaint.submitting')}
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {t('submitComplaint')}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={navigateToViolationsMap}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                View Violations Map
              </button>
              <button
                onClick={navigateToViolators}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                View verified complaints
              </button>
              {isModerator && (
                <button
                  onClick={navigateToModeration}
                  className="text-orange-600 hover:text-orange-800 text-sm font-medium transition-colors"
                >
                  Moderation Panel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
      {complaintContent}
    </MainLayout>
  );
}

export default Complaint;
