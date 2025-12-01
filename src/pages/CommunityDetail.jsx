// src/pages/CommunityDetail.jsx
import React, { useState, useEffect, Fragment } from 'react';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { FaUsers, FaLock, FaGlobe, FaCalendarAlt, FaPaperPlane, FaHeart, FaShare, FaComment, FaBookmark, FaTrash, FaEdit, FaSignOutAlt, FaPlus, FaMinus, FaTimes, FaCheckCircle, FaTimesCircle, FaEye, FaRetweet } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircle, XCircle, Eye, Reply, MoreVertical, Edit, Trash2, Coins, Plus } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { CommunityCommentsSection } from '../components/community/CommentsSection';
import { useCommunityComments } from '../hooks/useCommunityComments';

// Основний компонент CommunityDetail
function CommunityDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ content: '', media: null, mediaPreview: null });
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({});

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (user) {
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
        } else {
          setCurrentUser(null);
        }
        
        return user;
      } catch (err) {
        setError(t('authError'));
        setLoading(false);
        return null;
      }
    };

    const fetchCommunity = async () => {
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('*, community_members_aggregate:community_members!community_id(count)')
          .eq('id', id)
          .single();
        if (error) throw error;
        setCommunity({ ...data, member_count: data.community_members_aggregate[0]?.count || 0 });
      } catch (err) {
        setError(t('fetchCommunityError') + ': ' + err.message);
        console.error('Fetch community error:', err);
      }
    };

    const fetchMembers = async () => {
      try {
        const { data: membersData, error: membersError } = await supabase
          .from('community_members')
          .select('id, users(id, username, profile_picture)')
          .eq('community_id', id)
          .eq('status', 'approved');
        if (membersError) throw membersError;

        const uniqueMembers = [];
        const seenUserIds = new Set();
        for (const member of membersData || []) {
          if (member.users && !seenUserIds.has(member.users.id)) {
            seenUserIds.add(member.users.id);
            uniqueMembers.push(member);
          }
        }
        setMembers(uniqueMembers);
      } catch (err) {
        console.error('Fetch members error:', err);
      }
    };

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*, users(username, profile_picture), community_reactions(reaction_type, user_id)')
          .eq('community_id', id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPosts(data || []);
      } catch (err) {
        console.error('Fetch posts error:', err);
      }
    };

    const checkMembership = async (user) => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('community_members')
          .select('id, role')
          .eq('community_id', id)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .single();
        setIsMember(!!data);
        setUserRole(data?.role || '');
      } catch (err) {
        setIsMember(false);
        setUserRole('');
      }
    };

    const initializeData = async () => {
      const user = await fetchCurrentUser();
      if (user) {
        await Promise.all([
          fetchCommunity(),
          fetchMembers(),
          fetchPosts(),
          checkMembership(user)
        ]);
      } else {
        await Promise.all([
          fetchCommunity(),
          fetchMembers(),
          fetchPosts()
        ]);
      }
      setLoading(false);
    };

    initializeData();
  }, [id, t]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.menu-container')) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMenu = (postId) => {
    setActiveMenu(activeMenu === postId ? null : postId);
  };

  const togglePostComments = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postTime = new Date(date);
    const diffInSeconds = Math.floor((now - postTime) / 1000);

    if (diffInSeconds < 60) return t('justNow') || 'Щойно';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return t('minutesAgo', { count: diffInMinutes }) || `${diffInMinutes} хвилин тому`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('hoursAgo', { count: diffInHours }) || `${diffInHours} годин тому`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return t('daysAgo', { count: diffInDays }) || `${diffInDays} днів тому`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return t('monthsAgo', { count: diffInMonths }) || `${diffInMonths} місяців тому`;
    const diffInYears = Math.floor(diffInMonths / 12);
    return t('yearsAgo', { count: diffInYears }) || `${diffInYears} років тому`;
  };

  const handleJoinCommunity = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const { data: communityData, error: fetchError } = await supabase
        .from('communities')
        .select('privacy')
        .eq('id', id)
        .single();
      if (fetchError) throw fetchError;

      const { data: existingMember, error: memberError } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', id)
        .eq('user_id', currentUser.id)
        .single();
      
      if (memberError && memberError.code !== 'PGRST116') throw memberError;
      if (existingMember) {
        setError(t('alreadyMember'));
        return;
      }

      const status = communityData.privacy === 'public' ? 'approved' : 'pending';
      const { error: insertError } = await supabase
        .from('community_members')
        .insert({
          community_id: id,
          user_id: currentUser.id,
          role: 'member',
          status,
        });
      if (insertError) throw insertError;

      setIsMember(true);
      setUserRole('member');
      await fetchMembers();
      await fetchCommunity();

      if (status === 'approved') {
        setError(t('joinedCommunity'));
      } else {
        setError(t('joinRequestSent'));
      }
    } catch (err) {
      setError(t('joinCommunityError') + ': ' + err.message);
      console.error('Join community error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      return;
    }

    if (!confirm(t('confirmLeaveCommunity'))) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', id)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;

      setIsMember(false);
      setUserRole('');
      await fetchMembers();
      await fetchCommunity();
      setError(t('leftCommunity'));
    } catch (err) {
      setError(t('leaveCommunityError') + ': ' + err.message);
      console.error('Leave community error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPostMediaChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.type.match(/^(image\/|video\/|.+\.pdf$)/)) {
        setError(t('invalidFileType') || 'Дозволені формати: зображення, відео, PDF');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError(t('fileTooLarge') || 'Файл занадто великий (максимум 10MB)');
        return;
      }
      setNewPost({ 
        ...newPost, 
        media: selectedFile,
        mediaPreview: URL.createObjectURL(selectedFile)
      });
    }
  };

  const clearNewPostMedia = () => {
    setNewPost({ ...newPost, media: null, mediaPreview: null });
  };

  const handleCreatePost = async () => {
    if (!currentUser || !isMember) {
      setError(t('authRequired'));
      return;
    }
    if (!newPost.content.trim() && !newPost.media) {
      setError(t('postContentRequired'));
      return;
    }

    try {
      setPostLoading(true);
      
      let mediaUrl = null;
      let mediaType = 'text';
      
      if (newPost.media) {
        const fileExt = newPost.media.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}_${newPost.media.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, newPost.media);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        mediaUrl = publicUrl;
        mediaType = newPost.media.type.startsWith('image') ? 'image' : 
                   newPost.media.type.startsWith('video') ? 'video' : 'document';
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          community_id: id,
          user_id: currentUser.id,
          content: newPost.content.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
        });
      if (error) throw error;

      setNewPost({ content: '', media: null, mediaPreview: null });
      setIsCreatePostOpen(false);
      
      const { data, error: fetchError } = await supabase
        .from('community_posts')
        .select('*, users(username, profile_picture), community_reactions(reaction_type, user_id)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setPosts(data || []);
      
      setError(null);
    } catch (err) {
      setError(t('createPostError') + ': ' + err.message);
      console.error('Create post error:', err);
    } finally {
      setPostLoading(false);
    }
  };

  const handleEditPost = async (postId) => {
    if (!editContent.trim()) {
      setError(t('postContentRequired'));
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ content: editContent.trim() })
        .eq('id', postId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('community_posts')
        .select('*, users(username, profile_picture), community_reactions(reaction_type, user_id)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setPosts(data || []);
      
      setEditingPost(null);
      setEditContent('');
      setError(null);
    } catch (err) {
      setError(t('editPostError') + ': ' + err.message);
      console.error('Edit post error:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm(t('confirmDeletePost'))) return;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('community_posts')
        .select('*, users(username, profile_picture), community_reactions(reaction_type, user_id)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setPosts(data || []);
      
      setError(null);
    } catch (err) {
      setError(t('deletePostError') + ': ' + err.message);
      console.error('Delete post error:', err);
    }
  };

  const handleReaction = async (postId, reactionType) => {
    if (!currentUser) {
      setError(t('authRequired'));
      return;
    }

    try {
      const currentReaction = posts.find(p => p.id === postId)?.community_reactions?.find(r => r.user_id === currentUser.id);
      
      if (currentReaction && currentReaction.reaction_type === reactionType) {
        // Видалити реакцію
        const { error } = await supabase
          .from('community_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);
        if (error) throw error;
        
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                community_reactions: post.community_reactions.filter(r => r.user_id !== currentUser.id) 
              }
            : post
        ));
      } else {
        // Видалити стару реакцію (якщо є) і додати нову
        if (currentReaction) {
          const { error } = await supabase
            .from('community_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', currentUser.id);
          if (error) throw error;
        }
        
        // Додати нову реакцію
        const { error: insertError } = await supabase
          .from('community_reactions')
          .insert({ 
            post_id: postId, 
            user_id: currentUser.id, 
            reaction_type: reactionType 
          });
        if (insertError) throw insertError;
        
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                community_reactions: [
                  ...(post.community_reactions.filter(r => r.user_id !== currentUser.id)), 
                  { user_id: currentUser.id, reaction_type: reactionType }
                ]
              }
            : post
        ));
      }
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleSharePost = async (postId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      return;
    }

    try {
      const postUrl = `${window.location.origin}/community/${id}/post/${postId}`;
      await navigator.clipboard.writeText(postUrl);
      setError(t('linkCopied'));
    } catch (err) {
      console.error('Share post error:', err);
    }
  };

  const handleRepost = async (postId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      return;
    }

    try {
      const originalPost = posts.find(p => p.id === postId);
      const { error } = await supabase
        .from('community_posts')
        .insert({
          community_id: id,
          user_id: currentUser.id,
          content: `Репост: ${originalPost.content}`,
          media_url: originalPost.media_url,
          media_type: originalPost.media_type,
          original_post_id: postId
        });
      
      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('community_posts')
        .select('*, users(username, profile_picture), community_reactions(reaction_type, user_id)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setPosts(data || []);
      
    } catch (err) {
      console.error('Repost error:', err);
    }
  };

  const handleMemberClick = (userId) => {
    navigate(`/public/${userId}`);
  };

  if (loading) return <div className="p-4 text-center">{t('loading')}</div>;
  if (error && !community) return <div className="p-4 text-red-500 text-center">{t('error')}: {error}</div>;
  if (!community) return <div className="p-4 text-center">{t('communityNotFound')}</div>;

  const communityContent = (
    <div className="w-full max-w-4xl mx-auto px-4 flex-1 mt-4">
      <div className="space-y-6">
        {/* Community information */}
        <div className="bg-white/95 p-6 rounded-2xl shadow-lg border border-blue-100 backdrop-blur-sm">
          {community.cover_image && (
            <img 
              src={community.cover_image} 
              alt={community.name} 
              className="w-full h-48 object-cover rounded-xl mb-4" 
            />
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4 gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-blue-950 mb-2">{community.name}</h2>
              <p className="text-blue-800 mb-3">{community.description}</p>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-blue-700 mb-3">
                <span className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full">{community.category}</span>
                <span className="flex items-center gap-1">
                  {community.privacy === 'public' ? 
                    <FaGlobe className="inline" /> : 
                    <FaLock className="inline" />
                  }
                  {t(community.privacy)}
                </span>
                <span className="flex items-center gap-1">
                  <FaUsers className="inline" />
                  {community.member_count} {t('members')}
                </span>
              </div>
            </div>
            
            {currentUser && (
              isMember ? (
                <button
                  onClick={handleLeaveCommunity}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors text-sm whitespace-nowrap shadow-sm"
                  disabled={loading}
                >
                  <FaSignOutAlt />
                  {t('leaveCommunity')}
                </button>
              ) : (
                <button
                  onClick={handleJoinCommunity}
                  className="px-4 py-2 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 text-sm whitespace-nowrap shadow-md hover:shadow-lg"
                  disabled={loading}
                >
                  {t('joinCommunity')}
                </button>
              )
            )}
          </div>

          {community.rules && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-blue-950 mb-2">{t('rules')}</h3>
              <p className="text-blue-800 text-sm">{community.rules}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/community/${id}/events`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors text-sm shadow-sm"
            >
              <FaCalendarAlt />
              {t('viewEvents')}
            </button>
            <button
              onClick={() => setIsMembersModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors text-sm shadow-sm"
            >
              <FaUsers />
              {t('viewMembers')}
            </button>
          </div>
        </div>

        {/* Creating a post */}
       {isMember && (
  <div className="bg-white/95 p-6 rounded-2xl border border-blue-100 shadow-lg backdrop-blur-sm">
    <div 
      className="flex items-center justify-between cursor-pointer"
      onClick={() => setIsCreatePostOpen(!isCreatePostOpen)}
    >
      <h3 className="text-lg font-semibold text-blue-950">{t('createPost')}</h3>
      {isCreatePostOpen ? (
        <FaMinus className="text-blue-700" />
      ) : (
        <FaPlus className="text-blue-700" />
      )}
    </div>
    
    {isCreatePostOpen && (
      <div className="mt-4">
        <textarea
          value={newPost.content}
          onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
          placeholder={t('postPlaceholder')}
          className="w-full border border-gray-200 rounded-2xl p-4 text-blue-950 bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm shadow-sm mb-3"
          rows="4"
        />
        
        {/* Media upload and publish button row */}
        <div className="flex justify-between items-center mb-2">
          {/* Left side - media upload */}
          <div>
            <input
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={handleNewPostMediaChange}
              className="hidden"
              id="post-media"
            />
            <label
              htmlFor="post-media"
              className="cursor-pointer bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <FaPaperPlane />
              {t('addMedia')}
            </label>
          </div>

          {/* Right side - publish button */}
          <button
            onClick={handleCreatePost}
            disabled={postLoading || (!newPost.content.trim() && !newPost.media)}
            className="px-6 py-2 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap shadow-md hover:shadow-lg"
          >
            {postLoading ? t('posting') : t('post')}
          </button>
        </div>

        {/* Media preview (if any) */}
        {newPost.mediaPreview && (
          <div className="relative mb-2">
            {newPost.media?.type.startsWith('image/') ? (
              <img
                src={newPost.mediaPreview}
                alt="Preview"
                className="max-w-xs rounded-xl"
              />
            ) : newPost.media?.type.startsWith('video/') ? (
              <video
                src={newPost.mediaPreview}
                controls
                className="max-w-xs rounded-xl"
              />
            ) : (
              <div className="bg-gray-100 p-4 rounded-xl">
                <p className="text-blue-800">{newPost.media?.name}</p>
              </div>
            )}
            <button
              onClick={clearNewPostMedia}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}
      
      </div>
    )}
  </div>
)}

        {/* Community posts */}
        <div className="bg-white/95 p-6 rounded-2xl border border-blue-100 shadow-lg backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-blue-950 mb-4">{t('communityPosts')}</h3>
          {posts.length === 0 ? (
            <p className="text-blue-700 text-center py-8">{t('noPosts')}</p>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="border-b border-blue-100 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={post.users?.profile_picture || 'https://placehold.co/40x40'}
                        alt={post.users?.username}
                        className="w-10 h-10 rounded-full cursor-pointer"
                        onClick={() => handleMemberClick(post.user_id)}
                      />
                      <div>
                        <p 
                          className="font-semibold text-blue-950 cursor-pointer hover:text-blue-800"
                          onClick={() => handleMemberClick(post.user_id)}
                        >
                          {post.users?.username || t('anonymous')}
                        </p>
                        <p className="text-xs text-blue-700">
                          {formatTimeAgo(post.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    {(currentUser?.id === post.user_id || userRole === 'admin' || userRole === 'moderator') && (
                      <div className="menu-container relative">
                        <button
                          onClick={() => toggleMenu(post.id)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                        >
                          <FaEdit size={14} />
                        </button>
                        
                        {activeMenu === post.id && (
                          <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]">
                            <button
                              onClick={() => {
                                setEditingPost(post.id);
                                setEditContent(post.content);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                              <FaEdit className="h-4 w-4" />
                              <span>{t('edit')}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleDeletePost(post.id);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                              <FaTrash className="h-4 w-4" />
                              <span>{t('delete')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {editingPost === post.id ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full border border-gray-200 rounded-2xl p-4 text-blue-950 bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm shadow-sm mb-2"
                        rows="3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPost(post.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full text-sm hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                          {t('save')}
                        </button>
                        <button
                          onClick={() => setEditingPost(null)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors shadow-sm"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-blue-800 mb-3 whitespace-pre-wrap">{post.content}</p>
                  )}

                  {post.media_url && (
                    <div className="mb-3">
                      {post.media_type === 'image' && (
                        <img
                          src={post.media_url}
                          alt="Post media"
                          className="max-w-xs rounded-xl"
                        />
                      )}
                      {post.media_type === 'video' && (
                        <video
                          src={post.media_url}
                          controls
                          className="max-w-xs rounded-xl"
                        />
                      )}
                      {post.media_type === 'document' && (
                        <a
                          href={post.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {t('viewDocument')}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Reactions and actions */}
                  <div className="flex flex-wrap justify-between items-center mt-4">
                    {/* Left side - reactions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleReaction(post.id, 'true')}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          post.community_reactions?.some(r => r.user_id === currentUser?.id && r.reaction_type === 'true')
                            ? 'text-green-700 bg-green-100 font-semibold'
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                      >
                        <FaCheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          {t('true')} {post.community_reactions?.filter(r => r.reaction_type === 'true').length || 0}
                        </span>
                      </button>
                      <button
                        onClick={() => handleReaction(post.id, 'false')}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          post.community_reactions?.some(r => r.user_id === currentUser?.id && r.reaction_type === 'false')
                            ? 'text-red-700 bg-red-100 font-semibold'
                            : 'text-red-600 hover:bg-red-100'
                        }`}
                      >
                        <FaTimesCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          {t('false')} {post.community_reactions?.filter(r => r.reaction_type === 'false').length || 0}
                        </span>
                      </button>
                      <button
                        onClick={() => handleReaction(post.id, 'notice')}
                        className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          post.community_reactions?.some(r => r.user_id === currentUser?.id && r.reaction_type === 'notice')
                            ? 'text-blue-700 bg-blue-100 font-semibold'
                            : 'text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        <FaEye className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          {t('notice')} {post.community_reactions?.filter(r => r.reaction_type === 'notice').length || 0}
                        </span>
                      </button>
                    </div>

                    {/* Right side - other actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => togglePostComments(post.id)}
                        className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <FaComment className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          {expandedPosts[post.id] ? t('hideComments') : t('showComments')}
                        </span>
                      </button>
                      <button
                        onClick={() => handleSharePost(post.id)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <FaShare className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRepost(post.id)}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <FaRetweet className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800 transition-colors">
                        <FaBookmark className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Секція коментарів для поста - відображається лише при розгортанні */}
                  {expandedPosts[post.id] && (
                    <CommunityCommentsSection 
                      post={post} 
                      currentUser={currentUser} 
                      isMember={isMember}
                      formatTimeAgo={formatTimeAgo}
                      useCommunityCommentsHook={useCommunityComments}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MainLayout 
        currentUser={currentUser}
        showRightSidebar={true}
      >
        {communityContent}
      </MainLayout>

      {/* Members Modal */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-blue-950">
                {t('members')} ({members.length})
              </h3>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <div className="p-4">
              {members.length === 0 ? (
                <p className="text-blue-700 text-center py-8">{t('noMembers')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors border border-blue-100"
                      onClick={() => {
                        handleMemberClick(member.users.id);
                        setIsMembersModalOpen(false);
                      }}
                    >
                      <img
                        src={member.users?.profile_picture || 'https://placehold.co/40x40'}
                        alt={member.users?.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <span className="text-blue-950 font-medium block">
                          {member.users?.username || t('anonymous')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CommunityDetail;