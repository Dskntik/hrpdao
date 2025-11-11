import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers,
  FaEye
} from 'react-icons/fa';
import SocialFeed from './SocialFeed';
import CreatePostModal from './CreatePostModal';
import MainLayout from '../components/layout/MainLayout';

function Feed() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [communities, setCommunities] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [createPostError, setCreatePostError] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting user:', error);
        setError(t('authError'));
        setLoading(false);
        return;
      }
      
      if (user) {
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
          if (userProfile.country) {
            setSelectedCountry(userProfile.country);
          }
        }
        
        fetchUnreadNotificationsCount(user.id);
        fetchSuggestedCommunities();
      }
      
      setLoading(false);
    };

    fetchCurrentUser();
  }, [t]);

  const fetchUnreadNotificationsCount = async (userId) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting notifications:', error);
        return;
      }

      if (count !== null) {
        setUnreadNotifications(count);
      }
    } catch (error) {
      console.error('Error getting notifications:', error);
    }
  };

  const fetchSuggestedCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('id, name, description, cover_image, privacy, creator_id, created_at, rules, category, community_members(count)')
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error loading communities:', error);
        setCommunities(generateDemoCommunities());
        return;
      }

      const processedCommunities = data.map(community => ({
        id: community.id,
        name: community.name,
        description: community.description,
        cover_image: community.cover_image,
        privacy: community.privacy,
        member_count: community.community_members?.[0]?.count || 0,
        category: community.category,
        isDemo: false
      }));

      setCommunities(processedCommunities.length > 0 ? processedCommunities : generateDemoCommunities());
    } catch (error) {
      console.error('Error loading communities:', error);
      setCommunities(generateDemoCommunities());
    }
  };

  const generateDemoCommunities = () => {
    return [
      {
        id: 'demo-1',
        name: t('community') + ' 1',
        description: t('demoCommunityDescription'),
        member_count: 1200,
        privacy: 'public',
        category: 'general',
        isDemo: true
      },
      {
        id: 'demo-2',
        name: t('community') + ' 2',
        description: t('demoCommunityDescription'),
        member_count: 850,
        privacy: 'public',
        category: 'technology',
        isDemo: true
      },
      {
        id: 'demo-3',
        name: t('community') + ' 3',
        description: t('demoCommunityDescription'),
        member_count: 650,
        privacy: 'private',
        category: 'art',
        isDemo: true
      }
    ];
  };

  const handleViewCommunity = (communityId) => {
    navigate(`/community/${communityId}`);
  };

  const handleCreatePostFromSidebar = () => {
    setShowCreateModal(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-lg mx-4 text-center">
        <h2 className="text-xl font-semibold text-navy mb-2">{t('error')}</h2>
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-accent text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors"
        >
          {t('tryAgain')}
        </button>
      </div>
    </div>
  );

  const feedContent = (
    <div className="w-full overflow-y-auto space-y-3 sm:space-y-4">
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
        <SocialFeed currentUser={currentUser} />
      </div>
    </div>
  );

  return (
    <MainLayout 
      currentUser={currentUser}
      showRightSidebar={true}
    >
      {feedContent}

      {/* Post creation modal window */}
      {showCreateModal && (
        <CreatePostModal
          showCreateModal={showCreateModal}
          setShowCreateModal={setShowCreateModal}
          newPostContent={newPostContent}
          setNewPostContent={setNewPostContent}
          newPostMedia={newPostMedia}
          setNewPostMedia={setNewPostMedia}
          mediaPreview={mediaPreview}
          setMediaPreview={setMediaPreview}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          error={createPostError}
          setError={setCreatePostError}
          loading={createPostLoading}
          setLoading={setCreatePostLoading}
          currentUser={currentUser}
          navigate={navigate}
        />
      )}
    </MainLayout>
  );
}

export default Feed;
