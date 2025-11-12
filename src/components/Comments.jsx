import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Trophy, MessageSquare, Share, Bookmark, Trash2, Edit, Reply, Plus } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import MainLayout from '../components/layout/MainLayout';
import EditPostModal from '../components/EditPostModal';

function Comments() {
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (user) {
          // We get additional profile data from the database
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
            users(username, profile_picture),
            comment_reactions(reaction_type, user_id)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        if (commentError) throw commentError;
        setComments(commentData || []);
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

      const hashtags = editPostContent.match(/#[^\s#]+/g) || [];
      const { error: deleteHashtagError } = await supabase
        .from('post_hashtags')
        .delete()
        .eq('post_id', postId);
      if (deleteHashtagError) throw deleteHashtagError;

      if (hashtags.length > 0) {
        const hashtagInserts = hashtags.map(tag => ({
          post_id: postId,
          tag: tag.slice(1).toLowerCase(),
        }));
        const { error: hashtagError } = await supabase.from('post_hashtags').insert(hashtagInserts);
        if (hashtagError) throw hashtagError;
      }

      // Update post data
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
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      navigate('/');
      alert(t('postDeleted'));
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
    try {
      const { data: commentData, error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUser.id,
        content: newComment,
      }).select().single();
      
      if (error) throw error;
      setNewComment('');
      
      // Creating a notification for the post author
      if (post && post.user_id !== currentUser.id) {
        await createNotification(
          post.user_id,
          'comment',
          `${currentUser.email || t('anonymous')} ${t('commentedOnYourPost')}`,
          { postId, commentId: commentData.id }
        );
      }

      // Updating the number of comments on a post
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

      // Updating the list of comments
      const { data: commentDataUpdated, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture),
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
    try {
      // We find the parent comment to get information about the author
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
      
      // Create a notification for the author of a parent comment
      if (parentComment && parentComment.user_id !== currentUser.id) {
        await createNotification(
          parentComment.user_id,
          'comment',
          `${currentUser.email || t('anonymous')} ${t('repliedToYourComment')}`,
          { postId, commentId: replyData.id }
        );
      }

      // Updating the number of comments on a post
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

      // Updating the list of comments
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture),
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
      
      // Updating the number of comments on a post
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

      // Updating the list of comments
      setComments(comments.filter((comment) => comment.id !== commentId));
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
      
      // Updating the list of comments
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture),
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
      // We find a comment to get information about the author
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
        
        // Create a notification for the author of a comment about a like
        if (comment && comment.user_id !== currentUser.id) {
          let reactionText = '';
          switch (reactionType) {
            case 'true':
              reactionText = t('likedYourComment');
              break;
            case 'false':
              reactionText = t('dislikedYourComment');
              break;
            case 'top':
              reactionText = t('toppedYourComment');
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
      
      // Updating the list of comments
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id,
          users(username, profile_picture),
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
        
        // Creating a notification for the post author about a reaction
        if (post && post.user_id !== currentUser.id) {
          let reactionText = '';
          switch (reactionType) {
            case 'true':
              reactionText = t('likedYourPost');
              break;
            case 'false':
              reactionText = t('dislikedYourPost');
              break;
            case 'top':
              reactionText = t('toppedYourPost');
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
      
      // We are updating the post with current reactions.
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
        
        // Create a notification for the author of a post about saving
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

  const renderComments = (comments, parentId = null, depth = 0) => {
    const filteredComments = comments.filter((comment) => comment.parent_comment_id === parentId);
    
    if (filteredComments.length === 0) return null;

    return filteredComments.map((comment) => (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''} mt-3 bg-white p-4 rounded-lg shadow-md relative`}>
                
        {currentUser?.id === comment.user_id && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => handleEditComment(comment.id, comment.content)}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
              aria-label={t('editComment')}
            >
              <Edit className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => handleDeleteComment(comment.id)}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
              aria-label={t('deleteComment')}
            >
              <Trash2 className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        )}
        
        <div className="flex items-center mb-2">
          <img
            src={comment.users?.profile_picture || 'https://placehold.co/40x40'}
            alt={t('profilePicture')}
            className="w-8 h-8 rounded-full mr-2"
          />
          <div>
            <p className="font-bold text-sm text-gray-800">{comment.users?.username || t('anonymous')}</p>
            <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 mb-3">{comment.content}</p>
        
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => handleCommentReaction(comment.id, 'true')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comment.comment_reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'true')
                ? 'text-green-700 bg-green-100 font-semibold'
                : 'text-green-600 hover:bg-green-100'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {t('true')} {comment.comment_reactions?.filter((r) => r.reaction_type === 'true').length || 0}
            </span>
          </button>
          
          <button
            onClick={() => handleCommentReaction(comment.id, 'false')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comment.comment_reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'false')
                ? 'text-red-700 bg-red-100 font-semibold'
                : 'text-red-600 hover:bg-red-100'
            }`}
          >
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {t('false')} {comment.comment_reactions?.filter((r) => r.reaction_type === 'false').length || 0}
            </span>
          </button>

          <button
            onClick={() => handleCommentReaction(comment.id, 'top')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comment.comment_reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'top')
                ? 'text-yellow-700 bg-yellow-100 font-semibold'
                : 'text-yellow-600 hover:bg-yellow-100'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span className="text-xs font-medium">
              {t('top')} {comment.comment_reactions?.filter((r) => r.reaction_type === 'top').length || 0}
            </span>
          </button>
          
          <button
            onClick={() => setReplyCommentId(comment.id)}
            className="flex items-center text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            <Reply className="h-3 w-3 mr-1" /> {t('reply')}
          </button>
        </div>

        {/* Answer form */}
        {replyCommentId === comment.id && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder={t('newReplyPlaceholder')}
              className="w-full resize-y border border-gray-300 rounded-md p-2 text-sm"
              rows="2"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleReply(comment.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {t('postReply')}
              </button>
              <button
                onClick={() => setReplyCommentId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Recursively display answers */}
        {renderComments(comments, comment.id, depth + 1)}
      </div>
    ));
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return <div className="p-4 text-red-500">{t('error')}: {error}</div>;
  if (!post) return <div className="p-4">{t('noPost')}</div>;

  const commentsContent = (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      {/* Post */}
      <div className="bg-white p-4 rounded-lg shadow-md relative mb-6">
        {currentUser?.id === post.user_id && (
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              onClick={() => handleEditPost(post)}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
              aria-label={t('editPost')}
            >
              <Edit className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={() => handleDeletePost()}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
              aria-label={t('deletePost')}
            >
              <Trash2 className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        )}
        <div className="flex items-center mb-2">
          <img
            src={post.users?.profile_picture || 'https://placehold.co/40x40'}
            alt={t('profilePicture')}
            className="w-10 h-10 rounded-full mr-2"
          />
          <div>
            <p className="font-bold">{post.users?.username || t('anonymous')}</p>
            <p className="text-sm text-gray-500">{post.users?.country || t('unknown')} • {new Date(post.created_at).toLocaleString()}</p>
          </div>
        </div>
        <p>{post.content}</p>
        {post.media_url && (
          post.media_type === 'image' ? (
            <img src={post.media_url} alt={t('postMedia')} className="w-full mt-2 rounded-lg" />
          ) : (
            <video src={post.media_url} controls className="w-full mt-2 rounded-lg" aria-label={t('postMedia')} />
          )
        )}
        <div className="flex flex-wrap justify-between items-center mt-4">
          {/* Left side - reactions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleReaction(post.id, 'true')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                post.reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'true')
                  ? 'text-green-700 bg-green-100 font-semibold'
                  : 'text-green-600 hover:bg-green-100'
              }`}
              aria-label={`${t('true')} ${t('reaction')}`}
            >
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('true')} {post.reactions?.filter((r) => r.reaction_type === 'true').length || 0}
              </span>
            </button>
            <button
              onClick={() => handleReaction(post.id, 'false')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                post.reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'false')
                  ? 'text-red-700 bg-red-100 font-semibold'
                  : 'text-red-600 hover:bg-red-100'
              }`}
              aria-label={`${t('false')} ${t('reaction')}`}
            >
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('false')} {post.reactions?.filter((r) => r.reaction_type === 'false').length || 0}
              </span>
            </button>
            <button
              onClick={() => handleReaction(post.id, 'top')}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                post.reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'top')
                  ? 'text-yellow-700 bg-yellow-100 font-semibold'
                  : 'text-yellow-600 hover:bg-yellow-100'
              }`}
              aria-label={`${t('top')} ${t('reaction')}`}
            >
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('top')} {post.reactions?.filter((r) => r.reaction_type === 'top').length || 0}
              </span>
            </button>
          </div>

          {/* Right side - other actions */}
          <div className="flex flex-wrap gap-2">
            <button
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
              aria-label={t('comment')}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">{post.comments?.count || 0}</span>
            </button>
            <button
              onClick={() => handleShare()}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              aria-label={t('share')}
            >
              <Share className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSave()}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              aria-label={t('save')}
            >
              <Bookmark className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* New Comment Input */}
      {currentUser && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t('addComment')}</h3>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('newCommentPlaceholder')}
            className="w-full resize-y border border-gray-300 rounded-md p-2 mb-2 text-sm"
            rows="3"
            aria-label={t('newCommentPlaceholder')}
          />
          <button
            onClick={handleComment}
            className="w-full px-4 py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800"
            disabled={loading}
            aria-label={t('postComment')}
          >
            <Plus className="w-4 h-4" />
            {t('postComment')}
          </button>
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          {t('comments')} ({comments.length})
        </h3>
        
        {comments.filter(comment => !comment.parent_comment_id).length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('noComments')}</p>
        ) : (
          <div className="space-y-4">
            {renderComments(comments)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <MainLayout 
      currentUser={currentUser}
    >
      {commentsContent}

      {/* Edit Comment Modal */}
      <Transition appear show={isEditCommentModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsEditCommentModalOpen(false)}>
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
                    {t('editComment')}
                  </Dialog.Title>
                  <div className="mt-2">
                    <textarea
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      className="w-full resize-y border border-gray-300 rounded-md p-2 text-sm"
                      rows="4"
                      aria-label={t('editComment')}
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={handleUpdateComment}
                    >
                      {t('save')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsEditCommentModalOpen(false)}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={isEditPostModalOpen}
        onClose={() => setIsEditPostModalOpen(false)}
        editPostContent={editPostContent}
        setEditPostContent={setEditPostContent}
        editPostMedia={editPostMedia}
        setEditPostMedia={setEditPostMedia}
        editMediaPreview={editMediaPreview}
        setEditMediaPreview={setEditMediaPreview}
        handleUpdatePost={handleUpdatePost}
        loading={loading}
      />
    </MainLayout>
  );
}

export default Comments;