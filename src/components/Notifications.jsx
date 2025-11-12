import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  FaHeart, 
  FaComment, 
  FaUserPlus, 
  FaUsers, 
  FaBell, 
  FaTrash, 
  FaCheck,
  FaExclamationCircle,
  FaInfoCircle,
  FaSync,
  FaThumbsUp,
  FaThumbsDown,
  FaStar,
  FaGlobe,
  FaBuilding,
  FaReply,
  FaShare
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import MainLayout from '../components/layout/MainLayout';

function Notifications() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [retryCount, setRetryCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const locale = i18n.language === 'uk' ? uk : enUS;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (user) {
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error('Error loading profile:', profileError);
            return user;
          }
          
          return { ...user, ...userProfile };
        }
        
        return null;
      } catch (err) {
        console.error('Error retrieving user:', err);
        setError(t('authError'));
        navigate('/');
        return null;
      }
    };

    const initializeData = async () => {
      const user = await fetchCurrentUser();
      if (user) {
        setCurrentUser(user);
        await fetchNotifications(user.id);
        setupRealtimeNotifications(user.id);
      }
      setLoading(false);
    };

    initializeData();

    return () => {
      const subscription = supabase
        .channel('notifications-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          if (currentUser) {
            fetchNotifications(currentUser.id);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    };
  }, [t, navigate, retryCount]);

  const setupRealtimeNotifications = (userId) => {
    const notificationsSubscription = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('Нове сповіщення:', payload.new);
          fetchNotifications(userId);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Оновлене сповіщення:', payload.new);
          fetchNotifications(userId);
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Видалене сповіщення:', payload.old);
          fetchNotifications(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsSubscription);
    };
  };

  const fetchNotifications = async (userId) => {
    try {
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (notificationsError) {
        console.error('Помилка завантаження сповіщень:', notificationsError);
        setError(t('notificationsError'));
        return;
      }

      const senderIds = [...new Set(notificationsData.map(n => n.sender_id).filter(Boolean))];
      let senders = {};
      
      if (senderIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, profile_picture')
          .in('id', senderIds);
        
        if (usersData) {
          usersData.forEach(user => {
            senders[user.id] = user;
          });
        }
      }

      const enrichedNotifications = notificationsData.map(notification => ({
        ...notification,
        sender: senders[notification.sender_id] || null
      }));

      setNotifications(enrichedNotifications);
    } catch (err) {
      console.error('Помилка завантаження сповіщень:', err);
      setError(t('notificationsError'));
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error('Помилка оновлення сповіщення:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(notif => !notif.is_read);
      
      if (unreadNotifications.length === 0) return;

      const unreadIds = unreadNotifications.map(notif => notif.id);

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (err) {
      console.error('Помилка оновлення всіх сповіщень:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (err) {
      console.error('Помилка видалення сповіщення:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'comment_like':
        if (notification.post_id) {
          navigate(`/comments/${notification.post_id}`);
        }
        break;
      case 'follow':
        if (notification.sender_id) {
          navigate(`/public/${notification.sender_id}`);
        }
        break;
      case 'community_invite':
      case 'community_request':
      case 'community_approved':
      case 'community_post':
        if (notification.community_id) {
          navigate(`/community/${notification.community_id}`);
        }
        break;
      case 'service_comment':
        if (notification.service_id) {
          navigate(`/services/${notification.service_id}`);
        }
        break;
      case 'new_follower_post':
        if (notification.sender_id) {
          navigate(`/public/${notification.sender_id}`);
        }
        break;
      case 'message':
        if (notification.chat_id) {
          navigate('/chat', { state: { selectedChatId: notification.chat_id } });
        }
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <FaHeart className="text-red-500" />;
      case 'comment':
        return <FaComment className="text-blue-500" />;
      case 'comment_like':
        return <FaThumbsUp className="text-green-500" />;
      case 'follow':
        return <FaUserPlus className="text-purple-500" />;
      case 'community_invite':
      case 'community_request':
      case 'community_approved':
      case 'community_post':
        return <FaUsers className="text-indigo-500" />;
      case 'service_comment':
        return <FaBuilding className="text-orange-500" />;
      case 'new_follower_post':
        return <FaShare className="text-teal-500" />;
      case 'message':
        return <FaBell className="text-yellow-500" />;
      case 'system':
        return <FaInfoCircle className="text-gray-500" />;
      case 'warning':
        return <FaExclamationCircle className="text-orange-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification, t) => {
    if (notification.message) return notification.message;
    
    const senderName = notification.sender?.username || t('anonymous');
    
    switch (notification.type) {
      case 'like':
        return t('notifications.like', { user: senderName });
      case 'comment':
        return t('notifications.comment', { user: senderName });
      case 'comment_like':
        return t('notifications.commentLike', { user: senderName });
      case 'follow':
        return t('notifications.follow', { user: senderName });
      case 'community_invite':
        return t('notifications.communityInvite', { 
          user: senderName, 
          community: t('unknownCommunity')
        });
      case 'community_request':
        return t('notifications.communityRequest', { 
          user: senderName, 
          community: t('unknownCommunity')
        });
      case 'community_approved':
        return t('notifications.communityApproved', { 
          community: t('unknownCommunity')
        });
      case 'community_post':
        return t('notifications.communityPost', {
          user: senderName,
          community: t('unknownCommunity')
        });
      case 'service_comment':
        return t('notifications.serviceComment', {
          user: senderName,
          service: t('unknownService')
        });
      case 'new_follower_post':
        return t('notifications.newFollowerPost', { user: senderName });
      case 'message':
        return t('notifications.message', { user: senderName });
      case 'system':
        return t('notifications.system');
      case 'warning':
        return t('notifications.warning');
      default:
        return t('notifications.default');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    if (filter === 'read') return notif.is_read;
    return true;
  });

  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

  const notificationsContent = (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="bg-white/95 p-4 sm:p-6 rounded-2xl shadow-lg border border-blue-100 backdrop-blur-sm">
          {/* Заголовок та керування - оптимізовано для мобільного */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-950 text-center sm:text-left">
              {t('notifications')}
            </h1>
            
            <div className="flex flex-col xs:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full xs:w-auto">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="flex-1 xs:flex-none px-3 py-2 text-sm rounded-full border border-gray-200 bg-gray-50 text-blue-950 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="all">{t('allNotifications')}</option>
                  <option value="unread">{t('unreadNotifications')}</option>
                  <option value="read">{t('readNotifications')}</option>
                </select>
                
                <button
                  onClick={retryFetch}
                  className="p-2 text-blue-600 hover:text-blue-800 transition-colors rounded-full hover:bg-blue-100 flex-shrink-0 border border-blue-200"
                  title={t('retry')}
                >
                  <FaSync className="text-sm sm:text-base" />
                </button>
              </div>
              
              <div className="flex items-center gap-2 w-full xs:w-auto justify-center sm:justify-start">
                {notifications.some(notif => !notif.is_read) && (
                  <button
                    onClick={markAllAsRead}
                    className="flex-1 xs:flex-none px-3 py-2 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full text-xs sm:text-sm hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg whitespace-nowrap"
                  >
                    {isMobile ? t('markAll') : t('markAllAsRead')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 sm:p-4 mb-6">
              <div className="flex items-center">
                <FaExclamationCircle className="text-red-500 mr-3 flex-shrink-0" />
                <span className="text-red-700 text-sm sm:text-base">{error}</span>
              </div>
              <button
                onClick={retryFetch}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                {t('retry')}
              </button>
            </div>
          )}

          {/* Список сповіщень з оптимізацією прокрутки */}
          <div className="max-h-[60vh] sm:max-h-none overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
                {filter === 'unread' 
                  ? t('noUnreadNotifications') 
                  : filter === 'read' 
                  ? t('noReadNotifications') 
                  : t('noNotifications')
                }
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer group backdrop-blur-sm ${
                      notification.is_read
                        ? 'bg-white/95 border-blue-100 hover:border-blue-200'
                        : 'bg-blue-50/95 border-blue-200 hover:border-blue-300'
                    } hover:shadow-lg`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 mt-0.5 sm:mt-1 text-base sm:text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-blue-950 leading-relaxed break-words">
                          {getNotificationMessage(notification, t)}
                        </p>
                        
                        <p className="text-xs text-blue-600 mt-1 sm:mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale
                          })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1.5 sm:p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors shadow-sm"
                            title={t('markAsRead')}
                          >
                            <FaCheck size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1.5 sm:p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors shadow-sm"
                          title={t('deleteNotification')}
                        >
                          <FaTrash size={12} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
      showRightSidebar={!isMobile} // Приховуємо праву панель на мобільних
    >
      {notificationsContent}
    </MainLayout>
  );
}

export default Notifications;