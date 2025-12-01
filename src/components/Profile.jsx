import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { FaEdit, FaInfoCircle, FaUserPlus, FaUserMinus, FaTimes, FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';
import SocialFeed from './SocialFeed';
import countries from '../utils/countries';
import MainLayout from './layout/MainLayout';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  MessageCircle,
  Linkedin,
  Github,
  MessageSquare,
  Phone
} from 'lucide-react';

function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState({
    username: '',
    profile_picture: '',
    country: '',
    city: '',
    status: '',
    bio: '',
    social_links: { facebook: '', twitter: '', instagram: '', youtube: '', telegram: '' }
  });
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState({
    username: '',
    profile_picture: null,
    country: '',
    city: '',
    status: '',
    bio: '',
    social_links: { facebook: '', twitter: '', instagram: '', youtube: '', telegram: '' }
  });
  const [freedomRatings, setFreedomRatings] = useState({
    speech_freedom: 1,
    economic_freedom: 1,
    political_freedom: 1,
    human_rights_freedom: 1
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const statuses = [
    t('statusNotSelected'),
    t('statusDoctor'),
    t('statusTeacher'),
    t('statusLawyer'),
    t('statusNurse'),
    t('statusEngineer'),
    t('statusProgrammer'),
    t('statusDesigner'),
    t('statusArtist'),
    t('statusMusician'),
    t('statusWriter'),
    t('statusJournalist'),
    t('statusJudge'),
    t('statusPoliceOfficer'),
    t('statusFirefighter'),
    t('statusSoldier'),
    t('statusPilot'),
    t('statusDriver'),
    t('statusChef'),
    t('statusFarmer'),
    t('statusScientist'),
    t('statusResearcher'),
    t('statusArchitect'),
    t('statusBuilder'),
    t('statusMechanic'),
    t('statusElectrician'),
    t('statusPlumber'),
    t('statusAccountant'),
    t('statusEconomist'),
    t('statusManager'),
    t('statusSalesperson'),
    t('statusMarketer'),
    t('statusEntrepreneur'),
    t('statusConsultant'),
    t('statusTranslator'),
    t('statusAthlete'),
    t('statusCoach'),
    t('statusPhotographer'),
    t('statusVideographer'),
    t('statusActor'),
    t('statusDirector'),
    t('statusProducer')
  ];

  // Функція для отримання іконки соцмережі
  const getSocialIcon = (platform) => {
    const iconProps = { className: "w-5 h-5", size: 20 };
    
    switch (platform) {
      case 'facebook':
        return <Facebook {...iconProps} />;
      case 'twitter':
        return <Twitter {...iconProps} />;
      case 'instagram':
        return <Instagram {...iconProps} />;
      case 'youtube':
        return <Youtube {...iconProps} />;
      case 'telegram':
        return <MessageCircle {...iconProps} />;
      case 'linkedin':
        return <Linkedin {...iconProps} />;
      case 'github':
        return <Github {...iconProps} />;
      case 'discord':
        return <MessageSquare {...iconProps} />;
      case 'whatsapp':
        return <Phone {...iconProps} />;
      default:
        return <Instagram {...iconProps} />;
    }
  };

  // Функція для отримання градієнту для кожної соцмережі
  const getSocialIconWithGradient = (platform) => {
    const getGradientClass = (platform) => {
      const gradients = {
        facebook: 'from-blue-600 to-blue-800',
        twitter: 'from-blue-400 to-blue-600',
        instagram: 'from-purple-500 to-pink-500',
        youtube: 'from-red-500 to-red-700',
        telegram: 'from-blue-400 to-blue-600',
        linkedin: 'from-blue-700 to-blue-900',
        github: 'from-gray-700 to-gray-900',
        discord: 'from-indigo-500 to-indigo-700',
        whatsapp: 'from-green-500 to-green-600'
      };
      return gradients[platform] || 'from-gray-500 to-gray-700';
    };

    return (
      <div className={`bg-gradient-to-br ${getGradientClass(platform)} rounded-full p-2 text-white`}>
        {getSocialIcon(platform)}
      </div>
    );
  };

  // Функція для гарантування наявності профілю користувача
  const ensureUserProfile = async (user) => {
    try {
      const { data: existingProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Профіль не знайдено - створюємо новий
        const username = user.user_metadata?.username || 
                        user.email?.split('@')[0] || 
                        `user_${user.id.slice(0, 8)}`;
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: username,
            email: user.email,
            profile_picture: user.user_metadata?.avatar_url || '',
            created_at: new Date().toISOString(),
            referral_code: `HR${Math.random().toString(36).substr(2, 8).toUpperCase()}`
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          return null;
        }

        // Повторно отримуємо створений профіль
        const { data: newProfile, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError) throw fetchError;
        return newProfile;
      }

      if (error) throw error;
      return existingProfile;
    } catch (err) {
      console.error('Error ensuring user profile:', err);
      return null;
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error(t('authError'), error);
        setError(t('authError'));
        setLoading(false);
        return;
      }
      if (!user) {
        navigate('/');
        return;
      }

      // Гарантуємо, що профіль існує
      const userProfile = await ensureUserProfile(user);
      
      if (userProfile) {
        setCurrentUser({ ...user, ...userProfile });
        await fetchProfile(userId || user.id);
        await fetchStats(userId || user.id);
        
        if (userId && userId !== user.id) {
          const { data: followData, error: followError } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .single();
          setIsFollowing(!!followData && !followError);
        }

        fetchUnreadNotificationsCount(user.id);
      } else {
        setError(t('profileError'));
      }
      
      setLoading(false);
    };

    const fetchProfile = async (fetchUserId) => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('username, profile_picture, country, city, status, bio, social_links')
          .eq('id', fetchUserId)
          .single();

        if (profileError) throw profileError;

        const profileResult = profileData || {
          username: '',
          profile_picture: '',
          country: '',
          city: '',
          status: '',
          bio: '',
          social_links: { facebook: '', twitter: '', instagram: '', youtube: '', telegram: '' }
        };

        setProfile(profileResult);
        setEditProfile({
          ...profileResult,
          profile_picture: null,
        });

        // Отримуємо рейтинги свобод для користувача
        // Для користувачів з країною EARTH/planetEarth, зберігаємо рейтинги з country_code = 'EARTH'
        const countryCodeForRatings = (profileResult.country === '' || profileResult.country === 'EARTH') ? 'EARTH' : (profileResult.country || 'ua');
        
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('freedom_ratings')
          .select('speech_freedom, economic_freedom, political_freedom, human_rights_freedom')
          .eq('user_id', fetchUserId)
          .eq('country_code', countryCodeForRatings)
          .single();

        if (ratingsError && ratingsError.code !== 'PGRST116') throw ratingsError;

        if (ratingsData) {
          setFreedomRatings({
            speech_freedom: ratingsData.speech_freedom || 1,
            economic_freedom: ratingsData.economic_freedom || 1,
            political_freedom: ratingsData.political_freedom || 1,
            human_rights_freedom: ratingsData.human_rights_freedom || 1,
          });
        }
      } catch (err) {
        console.error(t('profileError'), err);
        setError(t('profileError'));
      }
    };

    const fetchStats = async (fetchUserId) => {
      try {
        const { count: postCount, error: postError } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', fetchUserId);
        if (postError) throw postError;

        const { count: followerCount, error: followerError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', fetchUserId);
        if (followerError) throw followerError;

        const { count: followingCount, error: followingError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', fetchUserId);
        if (followingError) throw followingError;

        setStats({
          posts: postCount || 0,
          followers: followerCount || 0,
          following: followingCount || 0,
        });
      } catch (err) {
        console.error(t('statsError'), err);
        setError(t('statsError'));
      }
    };

    fetchCurrentUser();
  }, [userId, navigate, t, i18n.language]);

  const getGeolocation = () => {
    setIsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${i18n.language}`
            );
            const data = await response.json();
            const countryCode = countries.find(c => c.name[i18n.language] === data.countryName)?.code || '';
            setEditProfile({ ...editProfile, country: countryCode });
            setIsLoading(false);
            toast.success(t('geolocationSuccess'));
          } catch (err) {
            setError(t('geolocationError'));
            setIsLoading(false);
            toast.error(t('geolocationError'));
          }
        },
        (err) => {
          setError(t('geolocationNotSupported'));
          setIsLoading(false);
          toast.error(t('geolocationNotSupported'));
        }
      );
    } else {
      setError(t('geolocationNotSupported'));
      setIsLoading(false);
      toast.error(t('geolocationNotSupported'));
    }
  };

  const fetchUnreadNotificationsCount = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('read', false);

      if (!error && count) {
        setUnreadNotifications(count);
      }
    } catch (error) {
      console.error(t('notificationError'), error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    const targetUserId = userId || currentUser.id;
    if (currentUser.id === targetUserId) {
      setError(t('cannotFollowSelf'));
      toast.error(t('cannotFollowSelf'));
      return;
    }
    try {
      setLoading(true);
      const { data: existingFollow, error: fetchError } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (existingFollow) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);
        if (deleteError) throw deleteError;
        setIsFollowing(false);
        setStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        const { error: insertError } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: targetUserId,
          });
        if (insertError) throw insertError;
        setIsFollowing(true);
        setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (err) {
      console.error(t('followError'), err);
      setError(t('followError'));
      toast.error(t('followError'));
    } finally {
      setLoading(false);
    }
  };

  const updateFreedomRatings = async (updatedRatings) => {
    if (!currentUser) return;
    try {
      // Визначаємо country_code для рейтингів
      // Для користувачів з країною EARTH/planetEarth, зберігаємо рейтинги з country_code = 'EARTH'
      const countryCodeForRatings = (profile.country === '' || profile.country === 'EARTH') ? 'EARTH' : (profile.country || 'ua');

      const { data: existingRating, error: fetchError } = await supabase
        .from('freedom_ratings')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('country_code', countryCodeForRatings)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const ratingData = {
        user_id: currentUser.id,
        country_code: countryCodeForRatings,
        speech_freedom: updatedRatings.speech_freedom,
        economic_freedom: updatedRatings.economic_freedom,
        political_freedom: updatedRatings.political_freedom,
        human_rights_freedom: updatedRatings.human_rights_freedom,
      };

      if (existingRating) {
        const { error: updateError } = await supabase
          .from('freedom_ratings')
          .update(ratingData)
          .eq('id', existingRating.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('freedom_ratings')
          .insert(ratingData);
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error(t('ratingError'), err);
      setError(t('ratingError'));
      toast.error(t('ratingError'));
    }
  };

  const handleRatingChange = (key, value) => {
    const updatedRatings = { ...freedomRatings, [key]: parseInt(value, 10) };
    setFreedomRatings(updatedRatings);
    updateFreedomRatings(updatedRatings);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError(t('invalidFileType'));
        toast.error(t('invalidFileType'));
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError(t('fileTooLarge'));
        toast.error(t('fileTooLarge'));
        return;
      }
      setEditProfile({ ...editProfile, profile_picture: selectedFile });
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  const clearFile = () => {
    setEditProfile({ ...editProfile, profile_picture: null });
    setFilePreview(null);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      let profilePictureUrl = profile.profile_picture;

      if (editProfile.profile_picture) {
        if (!editProfile.profile_picture.type.startsWith('image/')) {
          setError(t('invalidFileType'));
          toast.error(t('invalidFileType'));
          setLoading(false);
          return;
        }
        if (editProfile.profile_picture.size > 5 * 1024 * 1024) {
          setError(t('fileTooLarge'));
          toast.error(t('fileTooLarge'));
          setLoading(false);
          return;
        }

        if (profile.profile_picture) {
          const oldFilePath = profile.profile_picture.split('/profile-pictures/')[1];
          if (oldFilePath) {
            const { error: deleteError } = await supabase.storage
              .from('profile-pictures')
              .remove([oldFilePath]);
            if (deleteError) {
              console.error(t('deleteAvatarError'), deleteError);
            }
          }
        }

        const fileExt = editProfile.profile_picture.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}_${editProfile.profile_picture.name}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, editProfile.profile_picture);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);
        profilePictureUrl = publicUrlData.publicUrl;
      }

      // Виправлення: якщо країна пуста (планета Земля), встановлюємо значення 'EARTH'
      const countryValue = editProfile.country === '' ? 'EARTH' : editProfile.country;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: editProfile.username,
          profile_picture: profilePictureUrl,
          country: countryValue, // Використовуємо виправлене значення
          city: editProfile.city,
          status: editProfile.status,
          bio: editProfile.bio,
          social_links: editProfile.social_links,
        })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfile({
        ...editProfile,
        profile_picture: profilePictureUrl,
        country: countryValue, // Оновлюємо стан з виправленим значенням
      });
      setIsEditModalOpen(false);
      setFilePreview(null);
      toast.success(t('profileUpdated'));
    } catch (err) {
      console.error(t('updateError'), err);
      setError(t('updateError'));
      toast.error(t('updateError'));
    } finally {
      setLoading(false);
    }
  };

  // Функція для обробки зміни країни в формі редагування
  const handleCountryChange = (countryCode) => {
    setEditProfile({ ...editProfile, country: countryCode });
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-lg text-red-500 text-center">
        {t('error')}: {error}
      </div>
    </div>
  );

  const countryData = countries.find((c) => c.code === profile.country);
  const countryName = countryData ? countryData.name[i18n.language] || countryData.name['en'] : t('planetEarth');
  const isOwnProfile = !userId || userId === currentUser?.id;
  
  // Визначаємо, чи може користувач редагувати рейтинги свобод
  // Користувачі з країною EARTH/planetEarth можуть редагувати рейтинги
  const canEditFreedomRatings = isOwnProfile && (profile.country === '' || profile.country === 'EARTH');

  // Edit Profile Modal Content - Updated styles to match Complaint page
  const editProfileContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-4 overflow-x-hidden"
    >
      <div className="max-w-4xl mx-auto w-full min-w-0">
        <div className="bg-white/95 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-blue-100 backdrop-blur-sm min-w-0">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <FaArrowLeft className="text-gray-600 w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-950">
                {t('editProfile')}
              </h1>
              <p className="text-gray-600 text-sm">
                Update your profile information
              </p>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('username')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={editProfile.username}
                onChange={(e) => setEditProfile({ ...editProfile, username: e.target.value })}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm"
                placeholder={t('username')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('profilePicture')}
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={filePreview || profile.profile_picture || 'https://placehold.co/96x96'}
                    alt={t('profilePicture')}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                  />
                  {filePreview && (
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="profile-picture"
                  />
                  <label
                    htmlFor="profile-picture"
                    className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors text-center shadow-sm"
                  >
                    {t('upload')}
                  </label>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, max 5MB
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('country')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <select
                  value={editProfile.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white text-blue-950 text-sm shadow-sm pr-12"
                  required
                >
                  <option value="">{t('planetEarth')}</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name[i18n.language] || country.name['en']}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={getGeolocation}
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors disabled:opacity-50"
                  title={t('detectLocation')}
                >
                  <FaMapMarkerAlt className="text-blue-600 w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={getGeolocation}
                disabled={isLoading}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
              >
                {isLoading ? t('detecting') : t('detectLocation')}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('city')}
              </label>
              <input
                type="text"
                value={editProfile.city}
                onChange={(e) => setEditProfile({ ...editProfile, city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm"
                placeholder={t('city')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('status')}
              </label>
              <select
                value={editProfile.status}
                onChange={(e) => setEditProfile({ ...editProfile, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white text-blue-950 text-sm shadow-sm"
              >
                {statuses.map((status, index) => (
                  <option key={index} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {t('bio')}
              </label>
              <textarea
                value={editProfile.bio}
                onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                rows="4"
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none text-blue-950 text-sm shadow-sm"
                placeholder={t('bio')}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-3">{t('socialLinks')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(editProfile.social_links).map((platform) => (
                  <div key={platform}>
                    <label className="block text-sm font-medium text-blue-950 mb-1.5 capitalize">
                      {platform}
                    </label>
                    <input
                      type="url"
                      value={editProfile.social_links[platform]}
                      onChange={(e) => setEditProfile({
                        ...editProfile,
                        social_links: {
                          ...editProfile.social_links,
                          [platform]: e.target.value
                        }
                      })}
                      className="w-full px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-blue-950 text-sm shadow-sm"
                      placeholder={`https://${platform}.com/username`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium shadow-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-md hover:shadow-lg"
              >
                {loading ? t('updating') : t('update')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Main Profile Content
  const profileContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/95 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100 backdrop-blur-sm"
    >
      <div className="flex flex-col md:flex-row items-start mb-6">
        <img
          src={profile.profile_picture || 'https://placehold.co/96x96'}
          alt={t('profilePicture')}
          className="w-20 h-20 md:w-24 md:h-24 rounded-full mr-0 md:mr-6 mb-4 md:mb-0 object-cover border-4 border-white shadow-md self-center md:self-auto"
        />
        <div className="flex-1 w-full">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-3">
            <div className="w-full text-center md:text-left mb-3 md:mb-0">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{profile.username || t('anonymous')}</h2>
              <p className="text-sm text-gray-600 mb-2">
                {profile.city || t('unknown')}, {countryName}
              </p>
              <p className="text-sm text-blue-600 font-medium">{profile.status || t('noStatus')}</p>
            </div>
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center text-sm w-full md:w-auto"
              >
                <FaEdit className="w-3 h-3 mr-1" />
                {t('editProfile')}
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`flex items-center justify-center px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-full font-semibold transition-all duration-300 shadow-md hover:shadow-lg w-full md:w-auto ${isFollowing
                  ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                  }`}
              >
                {isFollowing ? (
                  <>
                    <FaUserMinus className="w-3 h-3 mr-1" />
                    {t('unfollow')}
                  </>
                ) : (
                  <>
                    <FaUserPlus className="w-3 h-3 mr-1" />
                    {t('follow')}
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4 md:gap-6 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.posts}</div>
              <div className="text-sm text-gray-600">{t('posts')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.followers}</div>
              <div className="text-sm text-gray-600">{t('followers')}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.following}</div>
              <div className="text-sm text-gray-600">{t('following')}</div>
            </div>
          </div>

          {profile.bio && (
            <p className="text-gray-700 mb-4 leading-relaxed text-center md:text-left">{profile.bio}</p>
          )}

          {Object.entries(profile.social_links).some(([_, url]) => url) && (
            <div className="mt-4">
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {Object.entries(profile.social_links).map(([platform, url]) => (
                  url && (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-12 h-12 rounded-full hover:scale-110 transition-all duration-300 shadow-md hover:shadow-lg"
                      title={platform}
                    >
                      {getSocialIconWithGradient(platform)}
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Freedom Ratings Section - Only show for Earth users */}
      {canEditFreedomRatings && (
        <div className="bg-gray-50 p-4 rounded-lg mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 text-center md:text-left">
            {t('globalFreedomRatings')}
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center md:text-left">
            {t('globalFreedomRatingsDescription')}
          </p>
          <div className="space-y-3">
            {['speech_freedom', 'economic_freedom', 'political_freedom', 'human_rights_freedom'].map((key) => (
              <div key={key} className="relative group">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-900">{t(key)}</span>
                  <span className="text-xs text-gray-600">{freedomRatings[key]}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={freedomRatings[key]}
                  onChange={(e) => handleRatingChange(key, e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
                  aria-label={t(key)}
                />
                <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white shadow-md p-2 rounded z-10">
                  <FaInfoCircle className="text-blue-600 text-sm inline mr-1" />
                  <span className="text-xs text-gray-600">{t(`${key}Tooltip`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-6"
      >
        <SocialFeed userId={userId || currentUser?.id} />
      </motion.div>
    </motion.div>
  );

  return (
    <MainLayout 
      currentUser={currentUser}
      showRightSidebar={true}
    >
      <AnimatePresence mode="wait">
        {isEditModalOpen ? (
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {editProfileContent}
          </motion.div>
        ) : (
          <motion.div
            key="profile-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {profileContent}
          </motion.div>
        )}
      </AnimatePresence>
      
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </MainLayout>
  );
}

export default Profile;