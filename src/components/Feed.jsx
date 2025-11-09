import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  FaTimes,
  FaUserCircle,
  FaPlus,
  FaUsers,
  FaEye,
  FaBars,
  FaSearch,
  FaHome,
  FaBell,
  FaComments,
  FaPaperclip,
  FaGraduationCap,
  FaExclamationTriangle
} from 'react-icons/fa';
import { BiSolidDonateHeart } from 'react-icons/bi';
import { IoMdMegaphone } from 'react-icons/io';
import Sidebar from './Sidebar';
// import Complaint from '../pages/Complaint';
// import Donation from '../pages/Donation';
import SocialFeed from './SocialFeed';
import PostForm from './PostForm';
import Navbar from './Navbar';
import countries from '../utils/countries';
import { ChevronDown } from 'lucide-react';
import CreatePostModal from './CreatePostModal';

function Feed() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [communities, setCommunities] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1023);
  const [activeSection, setActiveSection] = useState('feed');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [createPostError, setCreatePostError] = useState(null);

  const leftColumnRef = useRef(null);
  const centerColumnRef = useRef(null);
  const rightColumnRef = useRef(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1023);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    // if (!isMobile) {
    //   setTimeout(() => {
    //     setupSynchronizedScrolling();
    //   }, 100);
    // }

    return () => {
      if (leftColumnRef.current) {
        leftColumnRef.current.removeEventListener('scroll', handleLeftScroll);
      }
      if (centerColumnRef.current) {
        centerColumnRef.current.removeEventListener('scroll', handleCenterScroll);
      }
      if (rightColumnRef.current) {
        rightColumnRef.current.removeEventListener('scroll', handleRightScroll);
      }
    };
  }, [isMobile, loading]);

  const setupSynchronizedScrolling = () => {
    if (isMobile) return;

    const leftColumn = leftColumnRef.current;
    const centerColumn = centerColumnRef.current;
    const rightColumn = rightColumnRef.current;

    if (leftColumn && centerColumn && rightColumn) {
      leftColumn.addEventListener('scroll', handleLeftScroll);
      centerColumn.addEventListener('scroll', handleCenterScroll);
      rightColumn.addEventListener('scroll', handleRightScroll);
    }
  };

  const handleLeftScroll = (e) => {
    if (isScrolling.current) return;
    isScrolling.current = true;

    const leftColumn = leftColumnRef.current;
    const centerColumn = centerColumnRef.current;
    const rightColumn = rightColumnRef.current;

    if (leftColumn && centerColumn && rightColumn) {
      const scrollPercentage = leftColumn.scrollTop / (leftColumn.scrollHeight - leftColumn.clientHeight);
      
      centerColumn.scrollTop = scrollPercentage * (centerColumn.scrollHeight - centerColumn.clientHeight);
      rightColumn.scrollTop = scrollPercentage * (rightColumn.scrollHeight - rightColumn.clientHeight);
    }

    setTimeout(() => {
      isScrolling.current = false;
    }, 50);
  };

  const handleCenterScroll = (e) => {
    if (isScrolling.current) return;
    isScrolling.current = true;

    const leftColumn = leftColumnRef.current;
    const centerColumn = centerColumnRef.current;
    const rightColumn = rightColumnRef.current;

    if (leftColumn && centerColumn && rightColumn) {
      const scrollPercentage = centerColumn.scrollTop / (centerColumn.scrollHeight - centerColumn.clientHeight);
      
      leftColumn.scrollTop = scrollPercentage * (leftColumn.scrollHeight - leftColumn.clientHeight);
      rightColumn.scrollTop = scrollPercentage * (rightColumn.scrollHeight - rightColumn.clientHeight);
    }

    setTimeout(() => {
      isScrolling.current = false;
    }, 50);
  };

  const handleRightScroll = (e) => {
    if (isScrolling.current) return;
    isScrolling.current = true;

    const leftColumn = leftColumnRef.current;
    const centerColumn = centerColumnRef.current;
    const rightColumn = rightColumnRef.current;

    if (leftColumn && centerColumn && rightColumn) {
      const scrollPercentage = rightColumn.scrollTop / (rightColumn.scrollHeight - rightColumn.clientHeight);
      
      leftColumn.scrollTop = scrollPercentage * (leftColumn.scrollHeight - leftColumn.clientHeight);
      centerColumn.scrollTop = scrollPercentage * (centerColumn.scrollHeight - centerColumn.clientHeight);
    }

    setTimeout(() => {
      isScrolling.current = false;
    }, 50);
  };

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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
      setError(t('logoutError'));
    }
  };

  const markNotificationsAsRead = async () => {
    if (currentUser && unreadNotifications > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);
      
      if (error) {
        console.error('Error updating notifications:', error);
        return;
      }
      
      setUnreadNotifications(0);
    }
  };

  const handleComplaintClick = () => {
    navigate('/complaint');
  };

  const handleDonationClick = () => {
    navigate('/donation');
  };

  const handleEducationClick = () => {
    navigate('/education');
  };

  const handleViolatorsClick = () => {
    navigate('/violators');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex flex-col">
      <Navbar 
        currentUser={currentUser} 
        onShowCreateModal={handleCreatePostFromSidebar}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onToggleSearch={() => setIsSearchVisible(!isSearchVisible)}
        isMobile={isMobile}
      />
      
      {isSearchVisible && (
        <div className="lg:hidden bg-white p-3 border-b">
          <div className="flex items-center">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button className="bg-accent text-white px-4 py-2 rounded-r-lg">
              <FaSearch />
            </button>
          </div>
        </div>
      )}
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div 
            className="absolute left-0 top-0 h-full w-3/4 max-w-xs bg-white shadow-lg transform transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Меню</h2>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="p-4">
              <Sidebar currentUser={currentUser} onShowCreateModal={handleCreatePostFromSidebar} />
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full mx-auto px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 mt-2 sm:mt-4 pb-16 lg:pb-0">
        {!isMobile && (
          <div 
            ref={leftColumnRef}
            className="lg:col-span-3 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            <Sidebar currentUser={currentUser} onShowCreateModal={handleCreatePostFromSidebar} />
          </div>
        )}

        <div 
          ref={centerColumnRef}
          className={`${isMobile ? 'w-full' : 'lg:col-span-6 overflow-y-auto'} space-y-3 sm:space-y-4`}
          style={!isMobile ? { maxHeight: 'calc(100vh - 80px)' } : {}}
        >
          <div className="bg-white rounded-lg shadow p-3 sm:p-4">
            <button
              onClick={handleCreatePostFromSidebar}
              className="w-full text-left text-sm sm:text-base text-gray-500 bg-gray-100 rounded-full py-2 px-3 sm:px-4 hover:bg-gray-200"
            >
              {t('whatsOnYourMind')}
            </button>
            
            {isMobile && (
              <div className="flex justify-between mt-3">
                <button 
                  className="flex items-center text-gray-500 text-xs sm:text-sm font-medium"
                  onClick={handleComplaintClick}
                >
                  <IoMdMegaphone className="mr-1 text-red-500 text-sm sm:text-base" />
                  {t('complaint')}
                </button>
                <button 
                  className="flex items-center text-gray-500 text-xs sm:text-sm font-medium"
                  onClick={handleDonationClick}
                >
                  <BiSolidDonateHeart className="mr-1 text-green-500 text-sm sm:text-base" />
                  {t('donate')}
                </button>
                <button 
                  className="flex items-center text-gray-500 text-xs sm:text-sm font-medium"
                  onClick={handleEducationClick}
                >
                  <FaGraduationCap className="mr-1 text-purple-500 text-sm sm:text-base" />
                  {t('education')}
                </button>
                <button 
                  className="flex items-center text-gray-500 text-xs sm:text-sm font-medium"
                  onClick={handleViolatorsClick}
                >
                  <FaExclamationTriangle className="mr-1 text-orange-500 text-sm sm:text-base" />
                  {t('violators')}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md">
            <SocialFeed currentUser={currentUser} />
          </div>
        </div>

        {!isMobile && (
          <div 
            ref={rightColumnRef}
            className="lg:col-span-3 space-y-4 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          >
            <div className="bg-white/95 p-6 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm">
              <div className="relative z-10">
                <button
                  onClick={handleComplaintClick}
                  className="w-full px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-xl text-sm bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 text-white"
                >
                  <IoMdMegaphone className="w-4 h-4" />
                  {t('submitComplaint')}
                </button>
                
                <p className="text-center mt-2 mb-4 text-blue-950 text-sm opacity-80">
                  {t('complaint.subtitle') || 'Поділіться своїми скаргами та допоможіть нам покращити наш сервіс'}
                </p>
              </div>
            </div>
            
            <div className="bg-white/95 p-6 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm">
              <div className="relative z-10">
                <button
                  onClick={handleDonationClick}
                  className="w-full px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-xl text-sm bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 text-white"
                >
                  <BiSolidDonateHeart className="w-4 h-4" />
                  {t('donateNow')}
                </button>
                
                <p className="text-center mt-2 mb-4 text-blue-950 text-sm opacity-80">
                  {t('donationDescription') || 'Ваша підтримка допомагає нам продовжувати боротьбу за права людини'}
                </p>
              </div>
            </div>

            <div className="bg-white/95 p-6 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm">
              <div className="relative z-10">
                <button
                  onClick={handleEducationClick}
                  className="w-full px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-xl text-sm bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 text-white"
                >
                  <FaGraduationCap className="w-4 h-4" />
                  {t('viewEducationCourse')}
                </button>
                
                <p className="text-center mt-2 mb-4 text-blue-950 text-sm opacity-80">
                  {t('educationCourseDescription')}
                </p>
              </div>
            </div>

            <div className="bg-white/95 p-6 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm">
              <div className="relative z-10">
                <button
                  onClick={handleViolatorsClick}
                  className="w-full px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-xl text-sm bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 text-white"
                >
                  <FaExclamationTriangle className="w-4 h-4" />
                  {t('viewViolatorsList')}
                </button>
                
                <p className="text-center mt-2 mb-4 text-blue-950 text-sm opacity-80">
                  {t('violatorsListDescription')}
                </p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="font-semibold text-navy mb-3">{t('suggestedCommunities')}</h3>
              <div className="space-y-3">
                {communities.map(community => (
                  <div key={community.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {community.cover_image ? (
                        <img
                          src={community.cover_image}
                          alt={community.name}
                          className="h-10 w-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
                          <FaUsers className="text-gray-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-navy">{community.name}</p>
                        <p className="text-xs text-gray-500">
                          {community.member_count} {t('members')}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleViewCommunity(community.id)}
                      className="text-xs bg-primary text-blue-950 px-3 py-1 rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
                      title={t('viewCommunity')}
                    >
                      <FaEye className="text-xs" />
                      {t('view')}
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate('/community')}
                className="w-full mt-3 text-sm text-accent hover:text-blue-800 font-medium transition-colors"
              >
                {t('viewAllCommunities')}
              </button>
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-between py-3 px-6 z-30">
          <button 
            className="flex flex-col items-center text-xs text-gray-600"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <FaHome className="w-5 h-5 mb-1" />
            <span>Home</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-xs text-gray-600"
            onClick={handleComplaintClick}
          >
            <IoMdMegaphone className="w-5 h-5 mb-1" />
            <span>Complaints</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-xs text-gray-600"
            onClick={handleCreatePostFromSidebar}
          >
            <div className="relative">
              <FaPlus className="w-5 h-5 mb-1" />
            </div>
            <span>Create</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-xs text-gray-600"
            onClick={handleDonationClick}
          >
            <BiSolidDonateHeart className="w-5 h-5 mb-1" />
            <span>Donations</span>
          </button>
          
          <button 
            className="flex flex-col items-center text-xs text-gray-600"
            onClick={() => navigate('/chat')}
          >
            <FaComments className="w-5 h-5 mb-1" />
            <span>Chat</span>
          </button>
        </div>
      )}

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
    </div>
  );
}

export default Feed;
