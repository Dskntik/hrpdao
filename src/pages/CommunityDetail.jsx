// src/pages/CommunityDetail.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { FaUsers, FaLock, FaGlobe, FaCalendarAlt, FaPaperPlane, FaHeart, FaShare, FaComment, FaBookmark, FaTrash, FaEdit, FaSignOutAlt, FaPlus, FaMinus, FaTimes } from 'react-icons/fa';
import MainLayout from '../components/layout/MainLayout';

function CommunityDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ content: '', media: [] });
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

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
          .select('*, users(username, profile_picture)')
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

  const handleCreatePost = async () => {
    if (!currentUser || !isMember) {
      setError(t('authRequired'));
      return;
    }
    if (!newPost.content.trim()) {
      setError(t('postContentRequired'));
      return;
    }

    try {
      setPostLoading(true);
      const { error } = await supabase
        .from('community_posts')
        .insert({
          community_id: id,
          user_id: currentUser.id,
          content: newPost.content.trim(),
          media: newPost.media,
        });
      if (error) throw error;

      setNewPost({ content: '', media: [] });
      setIsCreatePostOpen(false);
      
      const { data, error: fetchError } = await supabase
        .from('community_posts')
        .select('*, users(username, profile_picture)')
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
        .select('*, users(username, profile_picture)')
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
        .select('*, users(username, profile_picture)')
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

  const handleLikePost = async (postId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ likes: (posts.find(p => p.id === postId)?.likes || 0) + 1 })
        .eq('id', postId);
      
      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('community_posts')
        .select('*, users(username, profile_picture)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setPosts(data || []);
      
    } catch (err) {
      console.error('Like post error:', err);
    }
  };

  const handleSharePost = async (postId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ shares: (posts.find(p => p.id === postId)?.shares || 0) + 1 })
        .eq('id', postId);
      
      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('community_posts')
        .select('*, users(username, profile_picture)')
        .eq('community_id', id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setPosts(data || []);
      
    } catch (err) {
      console.error('Share post error:', err);
    }
  };

  const handleMemberClick = (userId) => {
    navigate(`/public/${userId}`);
  };

  if (loading) return <div className="p-4 text-center">{t('loading')}</div>;
  if (error) return <div className="p-4 text-red-500 text-center">{t('error')}: {error}</div>;
  if (!community) return <div className="p-4 text-center">{t('communityNotFound')}</div>;

  const communityContent = (
    <div className="w-full max-w-4xl mx-auto px-4 flex-1 mt-4">
      {/* Central panel - тепер займає всю доступну ширину */}
      <div className="space-y-6">
        {/* Community information */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
          {community.cover_image && (
            <img 
              src={community.cover_image} 
              alt={community.name} 
              className="w-full h-48 object-cover rounded-lg mb-4" 
            />
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4 gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{community.name}</h2>
              <p className="text-gray-600 mb-3">{community.description}</p>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                <span className="bg-gray-100 px-3 py-1 rounded-md">{community.category}</span>
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
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm whitespace-nowrap"
                  disabled={loading}
                >
                  <FaSignOutAlt />
                  {t('leaveCommunity')}
                </button>
              ) : (
                <button
                  onClick={handleJoinCommunity}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm whitespace-nowrap"
                  disabled={loading}
                >
                  {t('joinCommunity')}
                </button>
              )
            )}
          </div>

          {community.rules && (
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('rules')}</h3>
              <p className="text-gray-600 text-sm">{community.rules}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/community/${id}/events`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <FaCalendarAlt />
              {t('viewEvents')}
            </button>
            <button
              onClick={() => setIsMembersModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <FaUsers />
              {t('viewMembers')}
            </button>
          </div>
        </div>

        {/* Creating a post */}
        {isMember && (
          <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsCreatePostOpen(!isCreatePostOpen)}
            >
              <h3 className="text-lg font-medium text-gray-900">{t('createPost')}</h3>
              {isCreatePostOpen ? (
                <FaMinus className="text-gray-500" />
              ) : (
                <FaPlus className="text-gray-500" />
              )}
            </div>
            
            {isCreatePostOpen && (
              <div className="mt-4">
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder={t('postPlaceholder')}
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 resize-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none mb-3"
                  rows="4"
                />
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FaPaperPlane />
                    {t('postWillBeVisible')}
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={postLoading || !newPost.content.trim()}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                  >
                    {postLoading ? t('posting') : t('post')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Community posts */}
        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('communityPosts')}</h3>
          {posts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noPosts')}</p>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="border-b border-gray-100 pb-6 last:border-b-0">
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
                          className="font-medium text-gray-900 cursor-pointer hover:text-gray-700"
                          onClick={() => handleMemberClick(post.user_id)}
                        >
                          {post.users?.username || t('anonymous')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {(currentUser?.id === post.user_id || userRole === 'admin' || userRole === 'moderator') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPost(post.id);
                            setEditContent(post.content);
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                          title={t('edit')}
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                          title={t('delete')}
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingPost === post.id ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 resize-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none mb-2"
                        rows="3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPost(post.id)}
                          className="px-3 py-1 bg-gray-900 text-white rounded text-sm hover:bg-gray-800 transition-colors"
                        >
                          {t('save')}
                        </button>
                        <button
                          onClick={() => setEditingPost(null)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                  )}

                  {post.media && post.media.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {post.media.map((mediaUrl, index) => (
                        <img
                          key={index}
                          src={mediaUrl}
                          alt={`Media ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLikePost(post.id)}
                      className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <FaHeart />
                      <span>{post.likes || 0}</span>
                    </button>
                    <button
                      onClick={() => handleSharePost(post.id)}
                      className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <FaShare />
                      <span>{post.shares || 0}</span>
                    </button>
                    <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
                      <FaComment />
                      <span>0</span>
                    </button>
                    <button className="flex items-center gap-1 text-gray-500 hover:text-yellow-500 transition-colors">
                      <FaBookmark />
                    </button>
                  </div>
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
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
                <p className="text-gray-500 text-center py-8">{t('noMembers')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-gray-100"
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
                        <span className="text-gray-900 font-medium block">
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
