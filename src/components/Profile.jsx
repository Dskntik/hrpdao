import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { FaEdit, FaInfoCircle, FaUserPlus, FaUserMinus, FaTimes } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import SocialFeed from './SocialFeed';
import countries from '../utils/countries';
import MainLayout from './layout/MainLayout';

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
      setCurrentUser(user);
      
      // Fetch user profile to set default country
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Error loading profile:', profileError);
        setCurrentUser(user);
      } else {
        setCurrentUser({ ...user, ...userProfile });
      }

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

        const { data: ratingsData, error: ratingsError } = await supabase
          .from('freedom_ratings')
          .select('speech_freedom, economic_freedom, political_freedom, human_rights_freedom')
          .eq('user_id', fetchUserId)
          .eq('country_code', profileResult.country || 'ua')
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
      const { data: existingRating, error: fetchError } = await supabase
        .from('freedom_ratings')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('country_code', profile.country || 'ua')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const ratingData = {
        user_id: currentUser.id,
        country_code: profile.country || 'ua',
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

      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: editProfile.username,
          profile_picture: profilePictureUrl,
          country: editProfile.country,
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
  const countryName = countryData ? countryData.name[i18n.language] || countryData.name['en'] : t('unknown');
  const isOwnProfile = !userId || userId === currentUser?.id;

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
          <div className="flex items-start justify-between mb-3">
            <div className="w-full">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 text-center md:text-left">{profile.username || t('anonymous')}</h2>
              <p className="text-sm text-gray-600 mb-2 text-center md:text-left">
                {profile.city || t('unknown')}, {countryName}
              </p>
              <p className="text-sm text-blue-600 font-medium text-center md:text-left">{profile.status || t('noStatus')}</p>
            </div>
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-full font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center text-sm"
              >
                <FaEdit className="w-3 h-3 mr-1" />
                {t('editProfile')}
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`flex items-center px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-full font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${isFollowing
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
              <h3 className="text-sm font-medium text-gray-700 mb-2 text-center md:text-left">{t('socialLinks')}</h3>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {Object.entries(profile.social_links).map(([platform, url]) => (
                  url && (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
                    >
                      <img
                        src={`https://unpkg.com/simple-icons@v9/icons/${platform}.svg`}
                        alt={platform}
                        className="w-3 h-3 mr-1"
                      />
                      <span className="truncate max-w-[80px]">{url}</span>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isOwnProfile && (
        <div className="bg-gray-50 p-4 rounded-lg mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('freedomRatings')}</h2>
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
        className="bg-white/95 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100 backdrop-blur-sm mt-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center md:text-left">
          {isOwnProfile ? t('yourPosts') : t('userPosts')}
        </h2>
        <SocialFeed userId={userId || currentUser?.id} />
      </motion.div>

      {/* Edit Profile Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsEditModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {t('editProfile')}
                  </Dialog.Title>
                  <div className="mt-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('username')}
                        </label>
                        <input
                          type="text"
                          value={editProfile.username}
                          onChange={(e) => setEditProfile({ ...editProfile, username: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('profilePicture')}
                        </label>
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <img
                              src={filePreview || profile.profile_picture || 'https://placehold.co/96x96'}
                              alt={t('profilePicture')}
                              className="w-16 h-16 rounded-full object-cover border"
                            />
                            {filePreview && (
                              <button
                                type="button"
                                onClick={clearFile}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <FaTimes className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                              id="profile-picture"
                            />
                            <label
                              htmlFor="profile-picture"
                              className="cursor-pointer bg-blue-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                            >
                              {t('upload')}
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('country')}
                        </label>
                        <select
                          value={editProfile.country}
                          onChange={(e) => setEditProfile({ ...editProfile, country: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{t('selectCountry')}</option>
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
                          className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          {isLoading ? t('detecting') : t('detectLocation')}
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('city')}
                        </label>
                        <input
                          type="text"
                          value={editProfile.city}
                          onChange={(e) => setEditProfile({ ...editProfile, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('status')}
                        </label>
                        <select
                          value={editProfile.status}
                          onChange={(e) => setEditProfile({ ...editProfile, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {statuses.map((status, index) => (
                            <option key={index} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('bio')}
                        </label>
                        <textarea
                          value={editProfile.bio}
                          onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('socialLinks')}</h4>
                        {Object.keys(editProfile.social_links).map((platform) => (
                          <div key={platform} className="mb-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={`https://${platform}.com/username`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                      onClick={handleUpdateProfile}
                      disabled={loading}
                    >
                      {loading ? t('updating') : t('update')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </motion.div>
  );

  return (
    <MainLayout 
      currentUser={currentUser}
      showRightSidebar={true}
    >
      {profileContent}
      
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
