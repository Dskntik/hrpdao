import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase } from '../utils/supabase';
import countries from '../utils/countries';
import SocialFeed from './SocialFeed';
import CreatePostModal from './CreatePostModal';
import MainLayout from '../components/layout/MainLayout';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaInfoCircle, FaMapMarkerAlt, FaUsers } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
 
// Lucide Icons for map
import { 
  MapPin, 
  Clock, 
  Calendar, 
  User, 
  CheckCircle
} from 'lucide-react';

const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
  shadowSize: [41, 41],
});

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

const countryCoordinates = {
  UA: [48.3794, 31.1656],
  AE: [23.4241, 53.8478],
  GB: [55.3781, -3.4360],
  US: [37.0902, -95.7129],
  UY: [-32.5228, -55.7658],
  UZ: [41.3775, 64.5853],
  VU: [-15.3767, 166.9592],
  VA: [41.9029, 12.4534],
  VE: [6.4238, -66.5897],
  VN: [14.0583, 108.2772],
  YE: [15.5527, 48.5164],
  ZM: [-13.1339, 27.8493],
  ZW: [-19.0154, 29.1549],
  CD: [-4.0383, 21.7587],
  CG: [-0.2280, 15.8277],
  GH: [7.9465, -1.0232],
  SO: [5.1521, 46.1996],
};

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

function MapController({ filteredViolations, userCountry, initialCenter, initialZoom, showAllCountries }) {
  const map = useMap();
  const prevFilteredRef = useRef([]);

  useEffect(() => {
    if (showAllCountries) {
      map.setView(worldView.center, worldView.zoom);
    } else if (filteredViolations.length > 0) {
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
  }, [filteredViolations, userCountry, map, showAllCountries]);

  useEffect(() => {
    map.setView(initialCenter, initialZoom);
  }, [initialCenter, initialZoom, map]);

  return null;
}

// Modal component for displaying country users
function CountryUsersModal({ isOpen, onClose, users, countryName }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUserClick = (userId) => {
    navigate(`/public/${userId}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {t('usersFromCountry', { country: countryName }) || `Users from ${countryName}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh] p-6">
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('noUsersInCountry') || 'No users found in this country'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => handleUserClick(user.id)}
                >
                  <img
                    src={user.profile_picture || '/default-avatar.png'}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{user.username}</h3>
                    {user.status && (
                      <p className="text-sm text-gray-600 truncate">{user.status}</p>
                    )}
                    {user.city && (
                      <p className="text-xs text-gray-500 truncate">{user.city}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            {t('close') || 'Close'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Country() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [country, setCountry] = useState('');
  const [userCountry, setUserCountry] = useState(null);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [freedomRatings, setFreedomRatings] = useState({
    speech_freedom: 0,
    economic_freedom: 0,
    political_freedom: 0,
    human_rights_freedom: 0,
    overall_freedom: 0,
  });
  const [users, setUsers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [createPostError, setCreatePostError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [violations, setViolations] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [initialCenter, setInitialCenter] = useState([20, 0]);
  const [initialZoom, setInitialZoom] = useState(2);

  // New state for users modal
  const [showUsersModal, setShowUsersModal] = useState(false);

  // New state for all countries data
  const [allUsers, setAllUsers] = useState([]);
  const [allViolations, setAllViolations] = useState([]);
  const [allFreedomRatings, setAllFreedomRatings] = useState({
    speech_freedom: 0,
    economic_freedom: 0,
    political_freedom: 0,
    human_rights_freedom: 0,
    overall_freedom: 0,
  });

  // Use geolocation hook
  const { getGeolocation, isLoading: geolocationLoading, error: geolocationError } = useGeolocation();

  const centerColumnRef = useRef(null);

  const geoUrl = 'https://raw.githubusercontent.com/datasets/geo-boundaries-world-110m/master/countries.geojson';

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error retrieving user:', authError);
          setLoading(false);
          return;
        }

        if (user) {
          // We get additional profile data from the database
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error loading profile:', profileError);
            // If the profile is not found, we use only data from auth
            setCurrentUser(user);
          } else {
            // Combining data from auth and profile
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
        }
      } catch (err) {
        console.error('Error retrieving user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, profile_picture, country, city, status, bio');
      
      if (usersError) throw usersError;
      setAllUsers(usersData || []);
    } catch (err) {
      console.error('Error loading all users:', err);
    }
  };

  const fetchAllFreedomRatings = async () => {
    try {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('freedom_ratings')
        .select('speech_freedom, economic_freedom, political_freedom, human_rights_freedom');

      if (ratingsError && ratingsError.code !== 'PGRST116') throw ratingsError;

      if (ratingsData && ratingsData.length > 0) {
        const validRatings = ratingsData.filter(rating => 
          rating.speech_freedom !== null && rating.economic_freedom !== null && 
          rating.political_freedom !== null && rating.human_rights_freedom !== null
        );

        if (validRatings.length > 0) {
          const averages = validRatings.reduce(
            (acc, curr) => ({
              speech_freedom: acc.speech_freedom + (parseInt(curr.speech_freedom) || 0),
              economic_freedom: acc.economic_freedom + (parseInt(curr.economic_freedom) || 0),
              political_freedom: acc.political_freedom + (parseInt(curr.political_freedom) || 0),
              human_rights_freedom: acc.human_rights_freedom + (parseInt(curr.human_rights_freedom) || 0),
            }),
            { speech_freedom: 0, economic_freedom: 0, political_freedom: 0, human_rights_freedom: 0 }
          );

          const count = validRatings.length;
          const updatedRatings = {
            speech_freedom: (averages.speech_freedom / count).toFixed(1),
            economic_freedom: (averages.economic_freedom / count).toFixed(1),
            political_freedom: (averages.political_freedom / count).toFixed(1),
            human_rights_freedom: (averages.human_rights_freedom / count).toFixed(1),
            overall_freedom: (
              (averages.speech_freedom + averages.economic_freedom + 
               averages.political_freedom + averages.human_rights_freedom) /
              (count * 4)
            ).toFixed(1)
          };
          
          setAllFreedomRatings(updatedRatings);
        }
      }
    } catch (err) {
      console.error('Error loading all freedom ratings:', err);
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
        .eq('hidden', false)
        .not('coordinates', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validViolations = (data || []).filter(violation => 
        violation.coordinates?.lat && violation.coordinates?.lng
      );

      setViolations(validViolations);
      setAllViolations(validViolations);

      if (!userCountry && validViolations.length > 0) {
        const first = validViolations[0];
        setInitialCenter([first.coordinates.lat, first.coordinates.lng]);
        setInitialZoom(10);
      }
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
    fetchAllUsers();
    fetchAllFreedomRatings();
  }, [country]); 

  const handleGeolocation = async () => {
    try {
      const countryCode = await getGeolocation();
      if (countryCode) {
        setCountry(countryCode);
        await fetchCountryData(countryCode);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchCountryData = async (countryCode) => {
    setIsLoadingData(true);
    try {
      // Виправлення: якщо вибрано "EARTH" або пусте значення, завантажуємо всіх користувачів
      let usersQuery = supabase
        .from('users')
        .select('id, username, profile_picture, country, city, status, bio');
      
      if (countryCode && countryCode !== 'EARTH' && countryCode !== '') {
        usersQuery = usersQuery.eq('country', countryCode);
      }
      
      const { data: usersData, error: usersError } = await usersQuery;
      
      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Виправлення: для "EARTH" або пустого значення завантажуємо рейтинги всіх країн
      let ratingsQuery = supabase
        .from('freedom_ratings')
        .select('speech_freedom, economic_freedom, political_freedom, human_rights_freedom');

      if (countryCode && countryCode !== 'EARTH' && countryCode !== '') {
        ratingsQuery = ratingsQuery.eq('country_code', countryCode);
      }

      const { data: ratingsData, error: ratingsError } = await ratingsQuery;

      if (ratingsError && ratingsError.code !== 'PGRST116') throw ratingsError;

      console.log('Ratings data for country', countryCode, ':', ratingsData);

      if (ratingsData && ratingsData.length > 0) {
        const validRatings = ratingsData.filter(rating => 
          rating.speech_freedom !== null && rating.economic_freedom !== null && 
          rating.political_freedom !== null && rating.human_rights_freedom !== null
        );

        console.log('Valid ratings:', validRatings);

        if (validRatings.length > 0) {
          const averages = validRatings.reduce(
            (acc, curr) => ({
              speech_freedom: acc.speech_freedom + (parseInt(curr.speech_freedom) || 0),
              economic_freedom: acc.economic_freedom + (parseInt(curr.economic_freedom) || 0),
              political_freedom: acc.political_freedom + (parseInt(curr.political_freedom) || 0),
              human_rights_freedom: acc.human_rights_freedom + (parseInt(curr.human_rights_freedom) || 0),
            }),
            { speech_freedom: 0, economic_freedom: 0, political_freedom: 0, human_rights_freedom: 0 }
          );

          const count = validRatings.length;
          const updatedRatings = {
            speech_freedom: (averages.speech_freedom / count).toFixed(1),
            economic_freedom: (averages.economic_freedom / count).toFixed(1),
            political_freedom: (averages.political_freedom / count).toFixed(1),
            human_rights_freedom: (averages.human_rights_freedom / count).toFixed(1),
            overall_freedom: (
              (averages.speech_freedom + averages.economic_freedom + 
               averages.political_freedom + averages.human_rights_freedom) /
              (count * 4)
            ).toFixed(1)
          };
          
          console.log('Calculated averages:', updatedRatings);
          setFreedomRatings(updatedRatings);
        } else {
          setFreedomRatings({
            speech_freedom: 0,
            economic_freedom: 0,
            political_freedom: 0,
            human_rights_freedom: 0,
            overall_freedom: 0,
          });
        }
      } else {
        setFreedomRatings({
          speech_freedom: 0,
          economic_freedom: 0,
          political_freedom: 0,
          human_rights_freedom: 0,
          overall_freedom: 0,
        });
      }
    } catch (err) {
      console.error('Error loading country data:', err);
      setError(t('dataError') || 'Error loading data');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('Authorization error:', authError);
          return;
        }
        const { data, error } = await supabase
          .from('users')
          .select('country')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (data && data.country) {
          setUserCountry(data.country);
          setCountry(data.country);
          fetchCountryData(data.country);
        }
      } catch (err) {
        console.error('Error loading user country:', err);
      }
    };

    fetchUserCountry();
  }, [t]);

  const handleMemberClick = (userId) => {
    navigate(`/public/${userId}`);
  };

  // Виправлення: для "EARTH" або пустого значення показуємо "Planet Earth"
  const countryName = country === 'EARTH' || country === '' || country === 'all'
    ? (t('planetEarth') || 'Planet Earth')
    : countries.find((c) => c.code === country)?.name[i18n.language] || t('unknown');

  const getStatusBadge = (status) => {
    return {
      text: t('violationsMap.verified') || 'Verified',
      class: 'bg-red-100 text-red-800 border-red-200',
      icon: <CheckCircle className="w-3 h-3" />
    };
  };

  const formatDate = (dateString) => !dateString ? 'N/A' : new Date(dateString).toLocaleDateString();
  const formatTime = (timeString) => !timeString ? 'N/A' : timeString;

  const getCurrentCountryName = (code) => {
    const country = countries.find(c => c.code === code);
    return country ? (country.name[i18n.language] || country.name.en) : code;
  };

  // Виправлення: для "EARTH" або пустого значення показуємо всі порушення та користувачів
  const filteredViolations = country === 'EARTH' || country === '' || country === 'all' 
    ? allViolations 
    : violations.filter(violation => violation.country === country);

  const currentUsers = country === 'EARTH' || country === '' || country === 'all' ? allUsers : users;
  const currentFreedomRatings = country === 'EARTH' || country === '' || country === 'all' ? allFreedomRatings : freedomRatings;

  // Add debug for verification
  console.log('Country currentUser:', currentUser);
  console.log('Country loading:', loading);

  const countryContent = (
    <div className="space-y-4">
      {(country || country === 'EARTH' || country === '' || country === 'all') && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/95 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div className="flex flex-wrap gap-2">
              <Link 
                to={{
                  pathname: "/violations-map",
                  search: country && country !== 'EARTH' && country !== '' && country !== 'all' ? `?country=${country}` : ''
                }}
                className="px-4 py-2 rounded-full border border-red-200 hover:bg-red-100 transition-colors no-underline hover:no-underline"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-800 font-semibold text-sm">
                    {filteredViolations.length} {t('violationsMap.verifiedCases') || 'Verified Cases'}
                  </span>
                </div>
              </Link>
              
              {/* View Users button in blue style next to violations count */}
              <button
                onClick={() => setShowUsersModal(true)}
                className=" px-4 py-2 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FaUsers className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800 font-semibold text-sm">
                    {currentUsers.length} {t('viewUsers') || 'Users'}
                  </span>
                </div>
              </button>
            </div>
            
            {/* Country selection and geolocation button positioned on the right */}
            <div className="flex items-center gap-2 mt-4 md:mt-0">
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => {
                    const selectedCountry = e.target.value;
                    setCountry(selectedCountry);
                    if (selectedCountry && selectedCountry !== 'all') {
                      fetchCountryData(selectedCountry);
                    }
                  }}
                  className="w-full md:w-48 px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white text-blue-950 text-sm shadow-sm"
                  aria-label={t('selectCountry')}
                >
                  <option value="EARTH">{t('planetEarth') || 'Planet Earth'}</option>
                  {countries.map(({ code, name }) => (
                    <option key={code} value={code}>{name[i18n.language] || name.en}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
              </div>
              
              <button
                onClick={handleGeolocation}
                className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                disabled={geolocationLoading}
                title={t('useGeolocation')}
              >
                <FaMapMarkerAlt className="text-blue-600 w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="h-48 lg:h-64 rounded-lg overflow-hidden border border-gray-200">
            <MapContainer
              center={initialCenter}
              zoom={initialZoom}
              style={{ height: '100%', width: '100%' }}
              className="rounded-lg"
              worldCopyJump={false}
              maxBounds={[[-90, -180], [90, 180]]}
              maxBoundsViscosity={1.0}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                noWrap={true}
                bounds={[[-90, -180], [90, 180]]}
              />

              <MapController
                filteredViolations={filteredViolations}
                userCountry={userCountry}
                initialCenter={initialCenter}
                initialZoom={initialZoom}
                showAllCountries={country === 'EARTH' || country === '' || country === 'all'}
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
                                                                 
                        {violation.violator_name && (
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-gray-400" />
                            <span><strong>{t('violationsMap.violator') || 'Violator'}:</strong> {violation.violator_name}</span>
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
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {(error || geolocationError) && (
            <div className="mt-2 text-red-500 text-sm text-center">
              {error || geolocationError}
            </div>
          )}
        </motion.div>
      )}

      {/* Freedom ratings */}
      {(country || country === 'EARTH' || country === '' || country === 'all') && (
        <>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/95 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100 backdrop-blur-sm"
          >
            {isLoadingData ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">{t('loading')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {['overall_freedom', 'speech_freedom', 'economic_freedom', 'political_freedom', 'human_rights_freedom'].map((key) => (
                  <div key={key} className="relative group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">{t(key)}</span>
                      <span className="text-sm font-semibold text-blue-600">{currentFreedomRatings[key]}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 ">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(parseFloat(currentFreedomRatings[key]) / 10) * 100}%` }}
                      ></div>
                    </div>
                    <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white shadow-lg p-3 rounded-lg z-10 border border-gray-200 min-w-[200px]">
                      <FaInfoCircle className="text-blue-600 text-sm inline mr-1" />
                      <span className="text-xs text-gray-700">{t(`${key}Tooltip`)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Social feed for the country */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            
          >
            <h2 className="text-ls font-bold text-gray-900 mb-4">
              {country === 'EARTH' || country === '' || country === 'all' 
                ? (t('postsFromPlanetEarth') || 'Posts from Planet Earth')
                : t('postsFromCountry', { country: countryName })
              }
            </h2>
            <SocialFeed userId={null} countryCode={country === 'EARTH' || country === '' || country === 'all' ? null : country} />
          </motion.div>
        </>
      )}

      {/* Country Users Modal */}
      <CountryUsersModal
        isOpen={showUsersModal}
        onClose={() => setShowUsersModal(false)}
        users={currentUsers}
        countryName={countryName}
      />
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
      {countryContent}
    </MainLayout>
  );
}

export default Country;