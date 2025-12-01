// CreatePostModal.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import { FaTimes, FaPaperclip } from 'react-icons/fa';
import countries from '../utils/countries';
import { createPortal } from 'react-dom';

function CreatePostModal({
  showCreateModal,
  setShowCreateModal,
  newPostContent,
  setNewPostContent,
  newPostMedia,
  setNewPostMedia,
  mediaPreview,
  setMediaPreview,
  error,
  setError,
  loading,
  setLoading,
  currentUser,
  navigate,
}) {
  const { t, i18n } = useTranslation();
  
  const [userCountry, setUserCountry] = useState(null);

  // Завантажуємо країну користувача
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;
      
      try {
        // Завантажуємо країну
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('country')
          .eq('id', currentUser.id)
          .single();

        if (profileError) throw profileError;

        setUserCountry(profileData?.country || null);
        
      } catch (err) {
        console.error('Помилка завантаження даних користувача:', err);
        setUserCountry(null);
      }
    };

    if (showCreateModal) {
      fetchUserData();
    }
  }, [currentUser, showCreateModal]);

  const handleCreatePost = async () => {
    if (!currentUser) {
      setError(t('authRequired') || 'Потрібна авторизація');
      navigate('/');
      return;
    }

    if (!newPostContent && !newPostMedia) {
      setError(t('emptyPost') || 'Пост не може бути порожнім');
      return;
    }

    try {
      setLoading(true);

      let mediaUrl = null;
      let mediaType = 'text';
      if (newPostMedia) {
        const fileExt = newPostMedia.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}_${newPostMedia.name}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, newPostMedia);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
        mediaUrl = publicUrl;
        mediaType = newPostMedia.type.startsWith('image') ? 'image' : newPostMedia.type.startsWith('video') ? 'video' : 'document';
      }

      const { data, error } = await supabase.from('posts').insert({
        user_id: currentUser.id,
        content: newPostContent,
        media_url: mediaUrl,
        media_type: mediaType,
        country_code: userCountry,
      }).select(`
        *,
        users(id, username, profile_picture, country),
        reactions(reaction_type, user_id),
        comments(count)
      `).single();

      if (error) throw error;

      
      setNewPostContent('');
      setNewPostMedia(null);
      setMediaPreview(null);
      setShowCreateModal(false);
      setError(null);

      window.location.reload();
    } catch (err) {
      console.error('Помилка створення поста:', err);
      setError(t('postError') || 'Помилка створення поста');
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
      setNewPostMedia(selectedFile);
      if (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) {
        setMediaPreview(URL.createObjectURL(selectedFile));
      } else {
        setMediaPreview(null);
      }
    }
  };

  const clearNewPostMedia = () => {
    setNewPostMedia(null);
    setMediaPreview(null);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">{t('createPost')}</h2>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setNewPostContent('');
              setNewPostMedia(null);
              setMediaPreview(null);
              setError(null);
            }}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Відображення країни користувача */}
          {userCountry && (
            <div className="mb-3 p-2 bg-green-50 rounded-lg text-sm text-green-700">
              {t('postWillBePublishedIn') || 'Пост буде опубліковано в'}:
              <span className="font-semibold ml-1">
                {countries.find(c => c.code === userCountry)?.name[i18n.language] || userCountry}
              </span>
            </div>
          )}

          <div className="mb-4">
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={t('whatsOnYourMind')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[120px]"
              rows="4"
            />
          </div>

          {mediaPreview && (
            <div className="mb-4 relative">
              {newPostMedia?.type?.startsWith('image/') ? (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg max-h-60 object-contain"
                />
              ) : newPostMedia?.type?.startsWith('video/') ? (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full h-auto rounded-lg max-h-60 object-contain"
                />
              ) : null}
              <button
                onClick={clearNewPostMedia}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <FaPaperclip className="w-5 h-5 text-gray-600" />
                <input
                  type="file"
                  accept="image/*,video/*,.pdf"
                  onChange={handleNewPostMediaChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            onClick={handleCreatePost}
            disabled={loading || (!newPostContent && !newPostMedia)}
            className={`w-full px-4 py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-xl ${
              loading || (!newPostContent && !newPostMedia)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('publishing')}
              </>
            ) : (
              t('publish')
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CreatePostModal;