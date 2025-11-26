// hooks/useCommunityComments.js
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';

// Функція для завантаження балансу поінтів
const fetchUserPoints = async (userId) => {
  if (!userId) return 0;
  
  try {
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', userId);

    if (pointsError) throw pointsError;

    const { data: deductionsData, error: deductionsError } = await supabase
      .from('user_points_deductions')
      .select('points_used')
      .eq('user_id', userId);

    if (deductionsError) throw deductionsError;

    const totalEarned = pointsData.reduce(
      (sum, record) => sum + parseInt(record.points),
      0
    );

    const totalSpent = deductionsData.reduce(
      (sum, record) => sum + record.points_used,
      0
    );

    return totalEarned - totalSpent;
    
  } catch (error) {
    console.error('❌ Error loading points:', error);
    return 0;
  }
};

// Функція для списання поінтів за коментар
const deductPointsForComment = async (userId, commentType = 'comment') => {
  try {
    const { data, error } = await supabase
      .from('user_points_deductions')
      .insert({
        user_id: userId,
        points_used: 2,
        type: commentType,
        description: 'Оплата за створення коментаря в спільноті'
      })
      .select()
      .single();

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Помилка списання поінтів за коментар:', err);
    throw err;
  }
};

export const useCommunityComments = (postId) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editCommentId, setEditCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [isEditCommentModalOpen, setIsEditCommentModalOpen] = useState(false);
  const [replyCommentId, setReplyCommentId] = useState(null);
  const [newReply, setNewReply] = useState('');
  const [activeCommentMenu, setActiveCommentMenu] = useState(null);
  const [userPoints, setUserPoints] = useState(0);

  // Notification creation feature
  const createNotification = async (userId, type, message, data = {}) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          sender_id: currentUser.id,
          type,
          message,
          post_id: data.postId || null,
          comment_id: data.commentId || null,
          is_read: false
        });

      if (error) {
        console.error('Помилка створення сповіщення:', error);
      }
    } catch (err) {
      console.error('Помилка у createNotification:', err);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.menu-container')) {
        setActiveCommentMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleCommentMenu = (commentId) => {
    setActiveCommentMenu(activeCommentMenu === commentId ? null : commentId);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
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

          // Завантажуємо поінти користувача
          const points = await fetchUserPoints(user.id);
          setUserPoints(points);
        } else {
          setCurrentUser(null);
        }

        // Fetch comments with reactions and user data
        const { data: commentData, error: commentError } = await supabase
          .from('community_post_comments')
          .select(`
            id, content, created_at, user_id, parent_comment_id,
            users(username, profile_picture, country),
            community_comment_reactions(reaction_type, user_id)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        
        if (commentError) throw commentError;
        setComments(commentData || []);

      } catch (err) {
        console.error('Помилка завантаження коментарів:', err);
        setError(err.message || t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchData();
    }
  }, [postId, t]);

  const handleComment = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!newComment.trim()) {
      setError(t('emptyComment'));
      return;
    }

    // Перевірка наявності поінтів
    if (userPoints < 2) {
      setError(t('insufficientPointsForComment') || 'Недостатньо поінтів для створення коментаря. Потрібно 2 поінти.');
      return;
    }

    try {
      // Списуємо поінти
      await deductPointsForComment(currentUser.id, 'community_comment_creation');
      
      // Оновлюємо баланс поінтів
      const updatedPoints = await fetchUserPoints(currentUser.id);
      setUserPoints(updatedPoints);

      const { data: commentData, error } = await supabase
        .from('community_post_comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: newComment.trim(),
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setNewComment('');
      
      // Оновлюємо список коментарів
      const { data: commentDataUpdated, error: commentError } = await supabase
        .from('community_post_comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          community_comment_reactions(reaction_type, user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (commentError) throw commentError;
      setComments(commentDataUpdated || []);

      setError(null);
    } catch (err) {
      console.error('Помилка додавання коментаря:', err);
      setError(err.message || t('commentError'));
    }
  };

  const handleReply = async (parentCommentId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!newReply.trim()) {
      setError(t('emptyComment'));
      return;
    }

    // Перевірка наявності поінтів
    if (userPoints < 2) {
      setError(t('insufficientPointsForComment') || 'Недостатньо поінтів для створення відповіді. Потрібно 2 поінти.');
      return;
    }

    try {
      // Списуємо поінти
      await deductPointsForComment(currentUser.id, 'community_reply_creation');
      
      // Оновлюємо баланс поінтів
      const updatedPoints = await fetchUserPoints(currentUser.id);
      setUserPoints(updatedPoints);

      const parentComment = comments.find(comment => comment.id === parentCommentId);
      
      const { data: replyData, error } = await supabase
        .from('community_post_comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: newReply.trim(),
          parent_comment_id: parentCommentId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setNewReply('');
      setReplyCommentId(null);
      
      if (parentComment && parentComment.user_id !== currentUser.id) {
        await createNotification(
          parentComment.user_id,
          'comment',
          `${currentUser.email || t('anonymous')} ${t('repliedToYourComment')}`,
          { postId, commentId: replyData.id }
        );
      }

      // Оновлюємо список коментарів
      const { data: commentData, error: commentError } = await supabase
        .from('community_post_comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          community_comment_reactions(reaction_type, user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (commentError) throw commentError;
      setComments(commentData || []);

    } catch (err) {
      console.error('Помилка додавання відповіді:', err);
      setError(err.message || t('commentError'));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!window.confirm(t('confirmDeleteComment'))) return;
    
    try {
      const { error } = await supabase
        .from('community_post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      setComments(comments.filter((comment) => comment.id !== commentId));
      setActiveCommentMenu(null);
      setError(null);
    } catch (err) {
      console.error('Помилка видалення коментаря:', err);
      setError(t('deleteCommentError'));
    }
  };

  const handleEditComment = (commentId, content) => {
    setEditCommentId(commentId);
    setEditCommentContent(content);
    setIsEditCommentModalOpen(true);
    setActiveCommentMenu(null);
  };

  const handleUpdateComment = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!editCommentContent.trim()) {
      setError(t('emptyComment'));
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('community_post_comments')
        .update({ content: editCommentContent.trim() })
        .eq('id', editCommentId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      // Оновлюємо список коментарів
      const { data: commentData, error: commentError } = await supabase
        .from('community_post_comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          community_comment_reactions(reaction_type, user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (commentError) throw commentError;
      setComments(commentData || []);
      
      setIsEditCommentModalOpen(false);
      setEditCommentId(null);
      setEditCommentContent('');
      setError(null);
    } catch (err) {
      console.error('Помилка оновлення коментаря:', err);
      setError(t('updateCommentError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCommentReaction = async (commentId, reactionType) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    
    try {
      const comment = comments.find(c => c.id === commentId);
      
      const { data: existingReaction, error: fetchError } = await supabase
        .from('community_comment_reactions')
        .select('reaction_type')
        .eq('comment_id', commentId)
        .eq('user_id', currentUser.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          // Видалити реакцію
          const { error: deleteError } = await supabase
            .from('community_comment_reactions')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', currentUser.id);
          if (deleteError) throw deleteError;
        } else {
          // Оновити реакцію
          const { error: updateError } = await supabase
            .from('community_comment_reactions')
            .update({ reaction_type: reactionType })
            .eq('comment_id', commentId)
            .eq('user_id', currentUser.id);
          if (updateError) throw updateError;
        }
      } else {
        // Додати нову реакцію
        const { error: insertError } = await supabase
          .from('community_comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: currentUser.id,
            reaction_type: reactionType,
          });
        if (insertError) throw insertError;
        
        if (comment && comment.user_id !== currentUser.id) {
          let reactionText = '';
          switch (reactionType) {
            case 'true':
              reactionText = t('likedYourComment');
              break;
            case 'false':
              reactionText = t('dislikedYourComment');
              break;
            case 'notice':
              reactionText = t('noticedYourComment');
              break;
            default:
              reactionText = t('reactedToYourComment');
          }
          await createNotification(
            comment.user_id,
            'comment_like',
            `${currentUser.email || t('anonymous')} ${reactionText}`,
            { postId, commentId }
          );
        }
      }
      
      // Оновлюємо список коментарів
      const { data: commentData, error: commentError } = await supabase
        .from('community_post_comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          community_comment_reactions(reaction_type, user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (commentError) throw commentError;
      setComments(commentData || []);
      
    } catch (err) {
      console.error('Помилка обробки реакції на коментар:', err);
      setError(err.message || t('reactionError'));
    }
  };

  return {
    // States
    comments,
    newComment,
    currentUser,
    error,
    loading,
    editCommentId,
    editCommentContent,
    isEditCommentModalOpen,
    replyCommentId,
    newReply,
    activeCommentMenu,
    userPoints,
    
    // Setters
    setNewComment,
    setEditCommentContent,
    setIsEditCommentModalOpen,
    setReplyCommentId,
    setNewReply,
    
    // Functions
    toggleCommentMenu,
    handleComment,
    handleReply,
    handleDeleteComment,
    handleEditComment,
    handleUpdateComment,
    handleCommentReaction,
  };
};