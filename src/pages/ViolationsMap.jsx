import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase } from '../utils/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MainLayout from '../components/layout/MainLayout';
import countries from '../utils/countries';

// Lucide Icons
import { 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter
} from 'lucide-react';

const verifiedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

const countryViewConfigs = {
  'UA': { center: [49.0, 32.0], zoom: 6 },
  'PL': { center: [52.0, 19.0], zoom: 6 },
  'DE': { center: [51.0, 10.0], zoom: 6 },
  'FR': { center: [46.0, 2.0], zoom: 6 },
  'US': { center: [39.5, -98.0], zoom: 4 },
  'GB': { center: [54.0, -2.0], zoom: 6 },
  'CA': { center: [60.0, -95.0], zoom: 4 },
  'RU': { center: [60.0, 100.0], zoom: 3 },
  'BY': { center: [53.0, 28.0], zoom: 6 },
};

const defaultCountryView = { center: [50.0, 10.0], zoom: 4 };
const worldView = { center: [20, 0], zoom: 2 };

function MapController({ filteredViolations, userCountry, initialCenter, initialZoom }) {
  const map = useMap();
  const prevFilteredRef = useRef([]);

  useEffect(() => {
    if (filteredViolations.length > 0) {
      const points = filteredViolations.map(v => [v.coordinates.lat, v.coordinates.lng]);
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else {
      const config = userCountry ? (countryViewConfigs[userCountry] || defaultCountryView) : worldView;
      map.setView(config.center, config.zoom);
    }

    const currentIds = filteredViolations.map(v => v.id).sort().join(',');
    const prevIds = prevFilteredRef.current.map(v => v.id).sort().join(',');
    if (currentIds !== prevIds) {
      prevFilteredRef.current = filteredViolations;
    }
  }, [filteredViolations, userCountry, map]);

  // Початкове центрування
  useEffect(() => {
    map.setView(initialCenter, initialZoom);
  }, [initialCenter, initialZoom, map]);

  return null;
}

function ViolationsMap() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userCountry, setUserCountry] = useState(null); // null = невідомо
  const [initialCenter, setInitialCenter] = useState([20, 0]);
  const [initialZoom, setInitialZoom] = useState(2);

  // Фільтри
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchViolations();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) return;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('username, profile_picture, country, city, status, bio, social_links')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setCurrentUser(user);
        return;
      }

      const userData = { ...user, ...profile };
      setCurrentUser(userData);

      // Встановлюємо країну
      if (profile.country) {
        setUserCountry(profile.country);
        const config = countryViewConfigs[profile.country] || defaultCountryView;
        setInitialCenter(config.center);
        setInitialZoom(config.zoom);
      } else {
        setUserCountry(null);
        setInitialCenter(worldView.center);
        setInitialZoom(worldView.zoom);
      }
    } catch (err) {
      console.error('Error retrieving user data:', err);
    }
  };

  const fetchViolations = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          users:user_id (
            username,
            profile_picture
          )
        `)
        .eq('status', 'verified')
        .not('coordinates', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validViolations = (data || []).filter(violation => 
        violation.coordinates?.lat && violation.coordinates?.lng
      );

      setViolations(validViolations);

      // Якщо немає userCountry і є порушення — центруємо на першому
      if (!userCountry && validViolations.length > 0) {
        const first = validViolations[0];
        setInitialCenter([first.coordinates.lat, first.coordinates.lng]);
        setInitialZoom(10);
      }
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    return {
      text: t('violationsMap.verified') || 'Verified',
      class: 'bg-red-100 text-red-800 border-red-200',
      icon: <CheckCircle className="w-3 h-3" />
    };
  };

  const formatDate = (dateString) => !dateString ? 'N/A' : new Date(dateString).toLocaleDateString();
  const formatTime = (timeString) => !timeString ? 'N/A' : timeString;

  // Фільтрація
  const filteredViolations = violations.filter(violation => {
    if (selectedCountry !== 'all' && violation.country !== selectedCountry) return false;

    if (dateFilter !== 'all' && violation.violation_date) {
      const vDate = new Date(violation.violation_date);
      const today = new Date();
      switch (dateFilter) {
        case 'today':
          const todayStart = new Date(today.setHours(0, 0, 0, 0));
          const todayEnd = new Date(today.setHours(23, 59, 59, 999));
          if (!(vDate >= todayStart && vDate <= todayEnd)) return false;
          break;
        case 'week':
          const weekAgo = new Date(today.setDate(today.getDate() - 7));
          if (vDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(today.setMonth(today.getMonth() - 1));
          if (vDate < monthAgo) return false;
          break;
      }
    }

    if (searchQuery && violation.violator_name) {
      if (!violation.violator_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }

    return true;
  });

  const getCurrentCountryName = (code) => {
    const country = countries.find(c => c.code === code);
    return country ? (country.name[i18n.language] || country.name.en) : code;
  };

  const clearFilters = () => {
    setSelectedCountry('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  const handleCountryFilterChange = (countryCode) => {
    setSelectedCountry(countryCode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const mapContent = (
    <div className="space-y-6">
      {/* Заголовок та фільтри */}
      <div className="bg-white/95 p-6 rounded-2xl shadow-lg border border-gray-100 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('violationsMap.title') || 'Verified Violations Map'}
            </h1>
            <p className="text-gray-600">
              {t('violationsMap.subtitle') || 'View all verified human rights violations on the map'}
            </p>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('violationsMap.searchViolator') || 'Search by violator name'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('violationsMap.searchPlaceholder') || 'Enter violator name...'}
                    className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('violationsMap.filterByCountry') || 'Filter by country'}
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => handleCountryFilterChange(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">{t('violationsMap.allCountries') || 'All Countries'}</option>
                  {Array.from(new Set(violations.map(v => v.country))).map(code => (
                    <option key={code} value={code}>
                      {getCurrentCountryName(code)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('violationsMap.filterByDate') || 'Filter by date'}
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">{t('violationsMap.allDates') || 'All Dates'}</option>
                  <option value="today">{t('violationsMap.today') || 'Today'}</option>
                  <option value="week">{t('violationsMap.thisWeek') || 'This Week'}</option>
                  <option value="month">{t('violationsMap.thisMonth') || 'This Month'}</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors text-sm font-medium"
                >
                  {t('violationsMap.clearFilters') || 'Clear Filters'}
                </button>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredViolations.length} of {violations.length} verified violations
              {selectedCountry !== 'all' && ` in ${getCurrentCountryName(selectedCountry)}`}
              {dateFilter !== 'all' && ` from ${dateFilter}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          </div>
        )}
      </div>

      {/* Мапа */}
      <div className="bg-white/95 p-6 rounded-2xl shadow-lg border border-gray-100 backdrop-blur-sm">
        <div className="h-96 lg:h-[500px] rounded-lg overflow-hidden border border-gray-200">
          <MapContainer
            center={initialCenter}
            zoom={initialZoom}
            style={{ height: '100%', width: '100%' }}
            className="rounded-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MapController
              filteredViolations={filteredViolations}
              userCountry={userCountry}
              initialCenter={initialCenter}
              initialZoom={initialZoom}
            />

            {filteredViolations.map((violation) => (
              <Marker
                key={violation.id}
                position={[violation.coordinates.lat, violation.coordinates.lng]}
                icon={verifiedIcon}
              >
                <Popup>
                  <div className="p-3 max-w-xs">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {violation.violation_action?.substring(0, 80)}
                        {violation.violation_action?.length > 80 ? '...' : ''}
                      </h3>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusBadge(violation.status).class}`}>
                        {getStatusBadge(violation.status).icon}
                        <span>{getStatusBadge(violation.status).text}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-600">
                      {(violation.violation_date || violation.violation_time) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{formatDate(violation.violation_date)}</span>
                          {violation.violation_time && (
                            <>
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{formatTime(violation.violation_time)}</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      {violation.violation_address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="leading-tight">{violation.violation_address}</span>
                        </div>
                      )}
                      
                      {violation.violator_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-gray-400" />
                          <span><strong>{t('violationsMap.violator') || 'Violator'}:</strong> {violation.violator_name}</span>
                        </div>
                      )}
                      
                      {violation.is_anonymous && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <User className="w-3 h-3" />
                          <span>{t('violationsMap.anonymous') || 'Anonymous Report'}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span><strong>{t('violationsMap.country') || 'Country'}:</strong> {getCurrentCountryName(violation.country)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={() => navigate(`/complaint-details/${violation.id}`)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded text-xs transition-colors text-center"
                      >
                        {t('violationsMap.viewDetails') || 'View Details'}
                      </button>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-400 text-center">
                      {t('violationsMap.reported') || 'Reported'} {formatDate(violation.created_at)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Статистика */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">{filteredViolations.length}</p>
                <p className="text-sm text-red-700">{t('violationsMap.filteredCases') || 'Filtered Cases'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {Array.from(new Set(violations.map(v => v.country))).length}
                </p>
                <p className="text-sm text-green-700">{t('violationsMap.countries') || 'Countries'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MainLayout currentUser={currentUser}>
      {mapContent}
    </MainLayout>
  );
}

export default ViolationsMap;