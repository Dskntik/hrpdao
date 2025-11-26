// hooks/useComments.js
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';

// Функція для завантаження балансу поінтів
const fetchUserPoints = async (userId) => {
  if (!userId) return 0;
  
  try {
    // Завантажуємо нараховані поінти
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', userId);

    if (pointsError) throw pointsError;

    // Завантажуємо витрати поінтів
    const { data: deductionsData, error: deductionsError } = await supabase
      .from('user_points_deductions')
      .select('points_used')
      .eq('user_id', userId);

    if (deductionsError) throw deductionsError;

    // Обчислюємо загальну суму нарахованих поінтів
    const totalEarned = pointsData.reduce(
      (sum, record) => sum + parseInt(record.points),
      0
    );

    // Обчислюємо загальну суму витрачених поінтів
    const totalSpent = deductionsData.reduce(
      (sum, record) => sum + record.points_used,
      0
    );

    // Обчислюємо поточний баланс
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
        description: 'Оплата за створення коментаря'
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

export const useComments = () => {
  const { t } = useTranslation();
  const { postId } = useParams();
  const navigate = useNavigate();
  
  const [post, setPost] = useState(null);
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
  const [isEditPostModalOpen, setIsEditPostModalOpen] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostMedia, setEditPostMedia] = useState(null);
  const [editMediaPreview, setEditMediaPreview] = useState(null);
  const [followStatus, setFollowStatus] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
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
        setActiveMenu(null);
        setActiveCommentMenu(null);
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

  const toggleCommentMenu = (commentId) => {
    setActiveCommentMenu(activeCommentMenu === commentId ? null : commentId);
  };

  const handleFollow = async (followingId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    try {
      if (followStatus[followingId]) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', followingId);
        if (error) throw error;
        setFollowStatus({ ...followStatus, [followingId]: false });
        alert(t('unfollowed') || 'Відписано');
      } else {
        const { error: insertError } = await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, following_id: followingId });
        if (insertError) throw insertError;
        setFollowStatus({ ...followStatus, [followingId]: true });
        alert(t('followed') || 'Підписано');
      }
    } catch (err) {
      console.error('Помилка підписки:', err);
      setError(t('followError') || 'Помилка підписки');
    }
  };

  const handleRepost = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.from('posts').insert({
        user_id: currentUser.id,
        content: `Репост: ${post.content}`,
        media_url: post.media_url,
        media_type: post.media_type,
        country_code: post.country_code,
        original_post_id: postId
      }).select(`
        *,
        users(id, username, profile_picture, country),
        reactions(reaction_type, user_id)
      `).single();
      
      if (error) throw error;

      alert(t('postReposted') || 'Пост успішно репостнуто');
      navigate('/country');
    } catch (err) {
      console.error('Помилка репосту:', err);
      setError(t('repostError') || 'Помилка репосту');
    } finally {
      setLoading(false);
    }
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

        // Fetch post with reactions and comment count
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(`
            *,
            users(username, profile_picture, country),
            reactions(reaction_type, user_id),
            comments(count)
          `)
          .eq('id', postId)
          .single();
        if (postError) throw postError;
        setPost(postData);
        setEditPostContent(postData.content);
        setEditMediaPreview(postData.media_url);

        // Fetch comments with reactions and replies
        const { data: commentData, error: commentError } = await supabase
          .from('comments')
          .select(`
            id, content, created_at, user_id, parent_comment_id,
            users(username, profile_picture, country),
            comment_reactions(reaction_type, user_id)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        if (commentError) throw commentError;
        setComments(commentData || []);

        // Update follow status for post author
        if (user && postData) {
          const { data: followData, error: followError } = await supabase
            .from('follows')
            .select('follower_id, following_id')
            .eq('follower_id', user.id)
            .eq('following_id', postData.user_id)
            .single();
          
          if (!followError && followData) {
            setFollowStatus(prev => ({
              ...prev,
              [postData.user_id]: true
            }));
          }
        }
      } catch (err) {
        console.error('Помилка:', err);
        setError(err.message || t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [postId, t]);

  const handleEditPost = (post) => {
    setEditPostContent(post.content);
    setEditPostMedia(null);
    setEditMediaPreview(post.media_url);
    setIsEditPostModalOpen(true);
    setActiveMenu(null);
  };

  const handleUpdatePost = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!editPostContent && !editPostMedia && !editMediaPreview) {
      setError(t('emptyPost'));
      return;
    }
    try {
      setLoading(true);
      let mediaUrl = editMediaPreview;
      let mediaType = post?.media_type || 'text';

      if (editPostMedia) {
        if (!editPostMedia.type.match(/^(image\/|video\/|.+\.pdf$)/)) {
          setError(t('invalidFileType'));
          setLoading(false);
          return;
        }
        if (editPostMedia.size > 10 * 1024 * 1024) {
          setError(t('fileTooLarge'));
          setLoading(false);
          return;
        }
        const currentPost = post;
        if (currentPost?.media_url) {
          const oldFilePath = currentPost.media_url.split('/media/')[1];
          if (oldFilePath) {
            const { error: deleteError } = await supabase.storage
              .from('media')
              .remove([oldFilePath]);
            if (deleteError) {
              console.error('Помилка видалення попереднього медіа:', deleteError);
            }
          }
        }
        const fileExt = editPostMedia.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}_${editPostMedia.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, editPostMedia);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        mediaUrl = publicUrl;
        mediaType = editPostMedia.type.startsWith('image') ? 'image' : editPostMedia.type.startsWith('video') ? 'video' : 'document';
      } else if (!editPostMedia && !editMediaPreview) {
        const currentPost = post;
        if (currentPost?.media_url) {
          const oldFilePath = currentPost.media_url.split('/media/')[1];
          if (oldFilePath) {
            const { error: deleteError } = await supabase.storage
              .from('media')
              .remove([oldFilePath]);
            if (deleteError) {
              console.error('Помилка видалення попереднього медіа:', deleteError);
            }
          }
        }
        mediaUrl = null;
        mediaType = 'text';
      }

      const { error } = await supabase
        .from('posts')
        .update({
          content: editPostContent,
          media_url: mediaUrl,
          media_type: mediaType,
        })
        .eq('id', postId);
      if (error) throw error;

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          users(username, profile_picture, country),
          reactions(reaction_type, user_id),
          comments(count)
        `)
        .eq('id', postId)
        .single();
      if (postError) throw postError;
      setPost(postData);

      setIsEditPostModalOpen(false);
      alert(t('postUpdated') || 'Пост успішно оновлено');
    } catch (err) {
      console.error('Помилка редагування поста:', err);
      setError(t('postError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!window.confirm(t('confirmDeletePost'))) return;
    try {
      setLoading(true);
      const currentPost = post;
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      alert(t('postDeleted'));
      navigate(-1);
      if (currentPost?.media_url) {
        const filePath = currentPost.media_url.split('/media/')[1];
        if (filePath) {
          const { error: deleteError } = await supabase.storage
            .from('media')
            .remove([filePath]);
          if (deleteError) {
            console.error('Помилка видалення медіа:', deleteError);
          }
        }
      }
    } catch (err) {
      console.error('Помилка видалення поста:', err);
      setError(t('postError'));
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!newComment) {
      setError(t('emptyComment'));
      return;
    }

    // Перевірка наявності поінтів
    if (userPoints < 2) {
      setError(t('insufficientPointsForComment') || 'Недостатньо поінтів для створення коментаря. Потрібно 2 поінти.');
      return;
    }

    try {
      // Списуємо поінти ПЕРШ ніж створювати коментар
      await deductPointsForComment(currentUser.id, 'comment_creation');
      
      // Оновлюємо баланс поінтів
      const updatedPoints = await fetchUserPoints(currentUser.id);
      setUserPoints(updatedPoints);

      const { data: commentData, error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUser.id,
        content: newComment,
      }).select().single();
      
      if (error) throw error;
      setNewComment('');
      
      if (post && post.user_id !== currentUser.id) {
        await createNotification(
          post.user_id,
          'comment',
          `${currentUser.email || t('anonymous')} ${t('commentedOnYourPost')}`,
          { postId, commentId: commentData.id }
        );
      }

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          users(username, profile_picture, country),
          reactions(reaction_type, user_id),
          comments(count)
        `)
        .eq('id', postId)
        .single();
      if (postError) throw postError;
      setPost(postData);

      const { data: commentDataUpdated, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          comment_reactions(reaction_type, user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (commentError) throw commentError;
      setComments(commentDataUpdated || []);
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
    if (!newReply) {
      setError(t('emptyComment'));
      return;
    }

    // Перевірка наявності поінтів
    if (userPoints < 2) {
      setError(t('insufficientPointsForComment') || 'Недостатньо поінтів для створення відповіді. Потрібно 2 поінти.');
      return;
    }

    try {
      // Списуємо поінти ПЕРШ ніж створювати відповідь
      await deductPointsForComment(currentUser.id, 'reply_creation');
      
      // Оновлюємо баланс поінтів
      const updatedPoints = await fetchUserPoints(currentUser.id);
      setUserPoints(updatedPoints);

      const parentComment = comments.find(comment => comment.id === parentCommentId);
      
      const { data: replyData, error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUser.id,
        content: newReply,
        parent_comment_id: parentCommentId,
      }).select().single();
      
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

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          users(username, profile_picture, country),
          reactions(reaction_type, user_id),
          comments(count)
        `)
        .eq('id', postId)
        .single();
      if (postError) throw postError;
      setPost(postData);

      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          comment_reactions(reaction_type, user_id)
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
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          users(username, profile_picture, country),
          reactions(reaction_type, user_id),
          comments(count)
        `)
        .eq('id', postId)
        .single();
      if (postError) throw postError;
      setPost(postData);

      setComments(comments.filter((comment) => comment.id !== commentId));
      setActiveCommentMenu(null);
      alert(t('commentDeleted'));
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
    if (!editCommentContent) {
      setError(t('emptyComment'));
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from('comments')
        .update({ content: editCommentContent })
        .eq('id', editCommentId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          comment_reactions(reaction_type, user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (commentError) throw commentError;
      setComments(commentData || []);
      
      setIsEditCommentModalOpen(false);
      setEditCommentId(null);
      setEditCommentContent('');
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
        .from('comment_reactions')
        .select('reaction_type')
        .eq('comment_id', commentId)
        .eq('user_id', currentUser.id)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          const { error: deleteError } = await supabase
            .from('comment_reactions')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', currentUser.id);
          if (deleteError) throw deleteError;
        } else {
          const { error: updateError } = await supabase
            .from('comment_reactions')
            .update({ reaction_type: reactionType })
            .eq('comment_id', commentId)
            .eq('user_id', currentUser.id);
          if (updateError) throw updateError;
        }
      } else {
        const { error: insertError } = await supabase.from('comment_reactions').insert({
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
      
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture, country),
          comment_reactions(reaction_type, user_id)
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

  const handleReaction = async (postId, reactionType) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    try {
      const { data: existingReaction, error: fetchError } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (existingReaction) {
        if (existingReaction.reaction_type === reactionType) {
          const { error: deleteError } = await supabase
            .from('reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', currentUser.id);
          if (deleteError) throw deleteError;
        } else {
          const { error: updateError } = await supabase
            .from('reactions')
            .update({ reaction_type: reactionType })
            .eq('post_id', postId)
            .eq('user_id', currentUser.id);
          if (updateError) throw updateError;
        }
      } else {
        const { error: insertError } = await supabase.from('reactions').insert({
          post_id: postId,
          user_id: currentUser.id,
          reaction_type: reactionType,
        });
        if (insertError) throw insertError;
        
        if (post && post.user_id !== currentUser.id) {
          let reactionText = '';
          switch (reactionType) {
            case 'true':
              reactionText = t('likedYourPost');
              break;
            case 'false':
              reactionText = t('dislikedYourPost');
              break;
            case 'notice':
              reactionText = t('noticedYourPost');
              break;
            default:
              reactionText = t('reactedToYourPost');
          }
          
          await createNotification(
            post.user_id,
            'like',
            `${currentUser.email || t('anonymous')} ${reactionText}`,
            { postId }
          );
        }
      }
      
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          *,
          users(username, profile_picture, country),
          reactions(reaction_type, user_id),
          comments(count)
        `)
        .eq('id', postId)
        .single();
      if (postError) throw postError;
      setPost(postData);
    } catch (err) {
      console.error('Помилка обробки реакції:', err);
      setError(err.message || t('reactionError'));
    }
  };

  const handleShare = async () => {
    try {
      const shareText = `${post.content}\n${post.media_url || ''}`;
      if (navigator.share) {
        await navigator.share({
          title: t('sharePost'),
          text: shareText,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(shareText);
        alert(t('copiedToClipboard'));
      }
    } catch (err) {
      console.error('Помилка шарингу:', err);
      setError(t('shareError'));
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    try {
      const { data: existingSave, error: fetchError } = await supabase
        .from('saved_posts')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('post_id', postId)
        .single();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      if (existingSave) {
        const { error: deleteError } = await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('post_id', postId);
        if (deleteError) throw deleteError;
        alert(t('postUnsaved'));
      } else {
        const { error: insertError } = await supabase
          .from('saved_posts')
          .insert({ user_id: currentUser.id, post_id: postId });
        if (insertError) throw insertError;
        alert(t('postSaved'));
        
        if (post && post.user_id !== currentUser.id) {
          await createNotification(
            post.user_id,
            'like',
            `${currentUser.email || t('anonymous')} ${t('savedYourPost')}`,
            { postId }
          );
        }
      }
    } catch (err) {
      console.error('Помилка збереження поста:', err);
      setError(t('saveError'));
    }
  };

  return {
    // States
    post,
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
    isEditPostModalOpen,
    editPostContent,
    editPostMedia,
    editMediaPreview,
    followStatus,
    activeMenu,
    activeCommentMenu,
    userPoints,
    
    // Setters
    setNewComment,
    setEditCommentContent,
    setIsEditCommentModalOpen,
    setReplyCommentId,
    setNewReply,
    setIsEditPostModalOpen,
    setEditPostContent,
    setEditPostMedia,
    setEditMediaPreview,
    
    // Functions
    toggleMenu,
    toggleCommentMenu,
    handleFollow,
    handleRepost,
    handleEditPost,
    handleUpdatePost,
    handleDeletePost,
    handleComment,
    handleReply,
    handleDeleteComment,
    handleEditComment,
    handleUpdateComment,
    handleCommentReaction,
    handleReaction,
    handleShare,
    handleSave,
  };
};