import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import SocialFeed from './SocialFeed';
import countries from '../utils/countries';
import { FaPaperPlane, FaHeart, FaRegHeart, FaShare, FaEllipsisH } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from './layout/MainLayout';

function PublicProfile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState({
    username: '',
    profile_picture: '',
    country: '',
    city: '',
    status: '',
    bio: '',
    social_links: { facebook: '', twitter: '', instagram: '', youtube: '', telegram: '' }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const shareMenuRef = useRef(null);

  useEffect(() => {
    const fetchProfileAndUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Error retrieving user:', userError);
          setError(t('authError') || 'Помилка автентифікації');
          setLoading(false);
          return;
        }

        if (user) {
          // Get additional profile data from the database for current user
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

        if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
          setError(t('invalidUserId') || 'Недійсний ідентифікатор користувача');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('users')
          .select('username, profile_picture, country, city, status, bio, social_links')
          .eq('id', userId)
          .single();
        if (error) throw error;
        setProfile(data || {
          username: '',
          profile_picture: '',
          country: '',
          city: '',
          status: '',
          bio: '',
          social_links: { facebook: '', twitter: '', instagram: '', youtube: '', telegram: '' }
        });

        const [followersData, followingData, postsData] = await Promise.all([
          supabase
            .from('follows')
            .select('*', { count: 'exact' })
            .eq('following_id', userId),
          supabase
            .from('follows')
            .select('*', { count: 'exact' })
            .eq('follower_id', userId),
          supabase
            .from('posts')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
        ]);

        setFollowersCount(followersData.count || 0);
        setFollowingCount(followingData.count || 0);
        setPostsCount(postsData.count || 0);

        if (user) {
          const { data: followData, error: followError } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .maybeSingle();

          if (!followError) {
            setIsFollowing(!!followData);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(t('profileError') || 'Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndUser();
  }, [t, userId, i18n.language]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [loading]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      setError(t('authRequired') || 'Потрібна автентифікація');
      navigate('/');
      return;
    }
    if (currentUser.id === userId) {
      setError(t('cannotFollowSelf') || 'Ви не можете слідкувати за собою');
      return;
    }

    try {
      setFollowLoading(true);
      setError(null);

      if (isFollowing) {
        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);

        if (deleteError) throw deleteError;
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        const { error: insertError } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId,
            created_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Помилка оновлення підписки:', err);
      setError(t('followError') || 'Помилка оновлення підписки');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      setError(t('authRequired') || 'Потрібна автентифікація');
      navigate('/');
      return;
    }
    if (currentUser.id === userId) {
      setError(t('cannotMessageSelf') || 'Ви не можете надіслати повідомлення собі');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: targetUserChats, error: targetUserError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', userId);
      if (targetUserError) throw targetUserError;

      const targetChatIds = targetUserChats.map(chat => chat.chat_id);

      const { data: chatMembers, error: chatError } = await supabase
        .from('chat_members')
        .select('chat_id, chats!inner(is_group)')
        .eq('user_id', currentUser.id)
        .in('chat_id', targetChatIds.length ? targetChatIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('chats.is_group', false) 
        .limit(1)
        .maybeSingle();

      if (chatError) throw chatError;

      let chatId;
      if (chatMembers) {
        chatId = chatMembers.chat_id;
      } else {
        const { data: targetUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();
        if (userError || !targetUser) {
          setError(t('userNotFound') || 'Користувача не знайдено');
          return;
        }

        const { data: newChat, error: createChatError } = await supabase
          .from('chats')
          .insert({ is_group: false, created_by: currentUser.id })
          .select()
          .single();
        if (createChatError) throw createChatError;

        chatId = newChat.id;

        const members = [
          { chat_id: chatId, user_id: currentUser.id },
          { chat_id: chatId, user_id: userId }
        ];
        const { error: memberError } = await supabase.from('chat_members').insert(members);
        if (memberError) throw memberError;
      }

      navigate('/chat', { state: { selectedChatId: chatId } });
    } catch (err) {
      console.error('Помилка створення чату:', err);
      setError(t('createChatError') || 'Помилка створення чату');
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${profile.username} - ${t('profile')}`,
        text: `${t('checkOutProfile')} ${profile.username} ${t('onHumanRightsPlatform')}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      setError(t('linkCopied') || 'Посилання скопійовано в буфер обміну');
      setTimeout(() => setError(null), 2000);
    }
    setShowShareMenu(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setError(t('linkCopied') || 'Посилання скопійовано в буфер обміну');
    setTimeout(() => setError(null), 2000);
    setShowShareMenu(false);
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

  const profileContent = (
    <div className="max-w-4xl mx-auto space-y-4">
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
                  {profile.city || t('unknown')}, {countries.find(c => c.code === profile.country)?.name[i18n.language] || t('unknown')}
                </p>
                <p className="text-sm text-blue-600 font-medium text-center md:text-left">{profile.status || t('noStatus')}</p>
              </div>
              <div className="relative hidden md:block" ref={shareMenuRef}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label={t('share')}
                >
                  <FaEllipsisH className="w-5 h-5 text-gray-600" />
                </button>
                
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50"
                    >
                      <button
                        onClick={handleShareProfile}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <FaShare className="w-4 h-4 text-gray-600" />
                        {t('shareProfile')}
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <FaPaperPlane className="w-4 h-4 text-gray-600" />
                        {t('copyLink')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="flex items-center justify-center md:justify-start gap-4 md:gap-6 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{postsCount}</div>
                <div className="text-sm text-gray-600">{t('posts')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{followersCount}</div>
                <div className="text-sm text-gray-600">{t('followers')}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{followingCount}</div>
                <div className="text-sm text-gray-600">{t('following')}</div>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4 leading-relaxed text-center md:text-left">{profile.bio || t('noBio')}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
              {currentUser && currentUser.id !== userId && (
                <>
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex items-center px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-full font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${isFollowing 
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'
                    }`}
                    aria-label={isFollowing ? t('unfollow') : t('follow')}
                  >
                    {followLoading ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    ) : isFollowing ? (
                      <FaHeart className="w-3 h-3 mr-1 text-red-500" />
                    ) : (
                      <FaRegHeart className="w-3 h-3 mr-1" />
                    )}
                    {followLoading ? t('loading') : (isFollowing ? t('unfollow') : t('follow'))}
                  </button>
                  <button
                    onClick={handleSendMessage}
                    className="flex items-center bg-gradient-to-r from-green-600 to-green-500 text-white px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-full font-semibold hover:from-green-700 hover:to-green-600 transition-all duration-300 shadow-md hover:shadow-lg"
                    aria-label={t('sendMessage')}
                  >
                    <FaPaperPlane className="w-3 h-3 mr-1" />
                    {t('sendMessage')}
                  </button>
                </>
              )}
            </div>
            
            {/* Social links as icons with text */}
            {Object.entries(profile.social_links).some(([_, value]) => value) && (
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

            {/* Mobile menu share */}
            <div className="md:hidden mt-4 flex justify-center">
              <div className="relative" ref={shareMenuRef}>
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center"
                  aria-label={t('share')}
                >
                  <FaShare className="w-4 h-4 text-gray-600 mr-1" />
                  <span className="text-sm">{t('share')}</span>
                </button>
                
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-48 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50"
                    >
                      <button
                        onClick={handleShareProfile}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <FaShare className="w-4 h-4 text-gray-600" />
                        {t('shareProfile')}
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                      >
                        <FaPaperPlane className="w-4 h-4 text-gray-600" />
                        {t('copyLink')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* User posts */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/95 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100 backdrop-blur-sm"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center md:text-left">{t('posts')}</h2>
        <SocialFeed userId={userId} />
      </motion.div>
    </div>
  );

  return (
    <MainLayout 
      currentUser={currentUser}
      showRightSidebar={true}
    >
      {profileContent}
    </MainLayout>
  );
}

export default PublicProfile;
