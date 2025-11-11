import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { FaPaperclip, FaArrowLeft } from 'react-icons/fa';
import { ChevronDown } from 'lucide-react';
import countries from '../utils/countries';

function CreatePostPage({ currentUser }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        country_code: selectedCountry || null,
      }).select(`
        *,
        users(id, username, profile_picture, country),
        reactions(reaction_type, user_id),
        comments(count)
      `).single();

      if (error) throw error;

      const hashtags = newPostContent.match(/#[^\s#]+/g) || [];
      if (hashtags.length > 0) {
        const hashtagInserts = hashtags.map(tag => ({
          post_id: data.id,
          tag: tag.slice(1).toLowerCase(),
        }));
        const { error: hashtagError } = await supabase.from('post_hashtags').insert(hashtagInserts);
        if (hashtagError) throw hashtagError;
      }

      // Повертаємося на попередню сторінку після успішного створення
      navigate(-1);
      
    } catch (err) {
      console.error('Помилка створення поста:', err);
      setError(t('postError') || 'Помилка створення поста');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaChange = (e) => {
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

  const clearMedia = () => {
    setNewPostMedia(null);
    setMediaPreview(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{t('createPost')}</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* User Info */}
        <div className="flex items-center space-x-3 mb-6 p-4 bg-white rounded-lg shadow-sm">
          <img
            src={currentUser?.profile_picture || '/default-avatar.png'}
            alt={currentUser?.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-gray-900">{currentUser?.username}</p>
            <p className="text-sm text-gray-500">{t('createPost')}</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder={t('whatsOnYourMind') || "Що у вас на думці?"}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[200px] text-gray-900 placeholder-gray-500"
            rows="6"
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div className="mt-4 relative">
              {newPostMedia?.type?.startsWith('image/') ? (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-auto rounded-lg max-h-80 object-contain border"
                />
              ) : newPostMedia?.type?.startsWith('video/') ? (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full h-auto rounded-lg max-h-80 object-contain border"
                />
              ) : null}
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
              >
                <FaPaperclip className="w-4 h-4 rotate-45" />
              </button>
            </div>
          )}

          {/* Attachment and Country Selection */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="cursor-pointer flex items-center space-x-2 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                <FaPaperclip className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{t('attachFile') || 'Прикріпити файл'}</span>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf"
                  onChange={handleMediaChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-48 px-4 py-2.5 rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none bg-white text-gray-900 text-sm shadow-sm"
                aria-label={t('complaint.country') || 'Країна'}
              >
                <option value="">{t('selectCountry') || 'Виберіть країну'}</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name[i18n.language] || country.name.en}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Publish Button */}
        <button
          onClick={handleCreatePost}
          disabled={loading || (!newPostContent && !newPostMedia)}
          className={`w-full px-4 py-4 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-lg shadow-md hover:shadow-xl ${
            loading || (!newPostContent && !newPostMedia)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              {t('publishing') || 'Публікація...'}
            </>
          ) : (
            t('publish') || 'Опублікувати'
          )}
        </button>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            {t('createPostHelp') || 'Додайте текст, фото, відео або документ для вашого посту'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreatePostPage;