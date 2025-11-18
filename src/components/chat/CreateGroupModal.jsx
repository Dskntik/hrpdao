import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroupChat } from '../../hooks/useGroupChat';
import { X, Search, Upload, Image } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { toast } from 'react-toastify';

function CreateGroupModal({ isOpen, onClose, currentUser, onGroupCreated }) {
  const { t } = useTranslation();
  const { creatingGroup, createGroupChat, getAvailableUsers } = useGroupChat();
  
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableUsers();
    }
  }, [isOpen]);

  const loadAvailableUsers = async () => {
    const users = await getAvailableUsers(currentUser.id);
    setAvailableUsers(users);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(t('onlyImagesAllowed'));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('fileTooLarge'));
        return;
      }
      
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;

    try {
      setUploadingAvatar(true);
      
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `group-avatars/${fileName}`;

      // Завантажуємо файл
      const { error: uploadError } = await supabase.storage
        .from('group-pictures')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Отримуємо публічний URL
      const { data: { publicUrl } } = supabase.storage
        .from('group-pictures')
        .getPublicUrl(filePath);

      console.log('Avatar uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(t('errorUploadingAvatar'));
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error(t('groupNameRequired'));
      return;
    }

    try {
      let groupAvatarUrl = null;
      
      // Завантажуємо аватар якщо він є
      if (avatarFile) {
        console.log('Uploading group avatar...');
        groupAvatarUrl = await uploadAvatar();
        if (!groupAvatarUrl) {
          toast.error(t('avatarUploadFailed'));
          return;
        }
      }

      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        group_avatar_url: groupAvatarUrl // Використовуємо правильне поле з бази даних
      };

      console.log('Creating group with data:', groupData);
      const chatData = await createGroupChat(groupData, selectedUsers, currentUser);
      
      if (chatData && chatData.group_avatar_url) {
        console.log('Group created with avatar:', chatData.group_avatar_url);
      }
      
      onGroupCreated(chatData);
      resetForm();
      onClose();
      toast.success(t('groupCreatedSuccess'));
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error(t('errorCreatingGroup'));
    }
  };

  const resetForm = () => {
    setGroupName('');
    setGroupDescription('');
    setSelectedUsers([]);
    setSearchTerm('');
    setAvatarFile(null);
    // Очищаємо URL прев'ю
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const filteredUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('createGroupChat')}</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Секція аватарки групи */}
          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium mb-2">
              {t('groupAvatar')}
            </label>
            
            <div className="relative">
              {avatarPreview ? (
                <div className="relative">
                  <img
                    src={avatarPreview}
                    alt="Group avatar preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                    onError={(e) => {
                      console.error('Error loading avatar preview');
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            
            {avatarPreview && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  URL.revokeObjectURL(avatarPreview);
                  setAvatarPreview(null);
                }}
                className="mt-2 text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                {t('removeAvatar')}
              </button>
            )}
          </div>

          {/* Назва групи */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('groupName')} *
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t('enterGroupName')}
              maxLength={100}
            />
          </div>

          {/* Опис групи */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('groupDescription')}
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="2"
              placeholder={t('enterGroupDescription')}
              maxLength={500}
            />
          </div>

          {/* Вибір учасників */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('selectMembers')}
            </label>
            
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('searchUsers')}
              />
            </div>

            {/* Вибрані користувачі */}
            {selectedUsers.length > 0 && (
              <div className="mb-2">
                <div className="flex flex-wrap gap-1">
                  {selectedUsers.map(userId => {
                    const user = availableUsers.find(u => u.id === userId);
                    return user ? (
                      <div key={userId} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        <img
                          src={user.profile_picture || '/default-avatar.png'}
                          alt={user.username}
                          className="w-4 h-4 rounded-full"
                          onError={(e) => {
                            e.target.src = '/default-avatar.png';
                          }}
                        />
                        <span>{user.username}</span>
                        <button
                          onClick={() => setSelectedUsers(prev => prev.filter(id => id !== userId))}
                          className="hover:text-blue-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Список доступних користувачів */}
            <div className="border rounded max-h-40 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-2 text-center text-gray-500 text-sm">
                  {t('noUsersFound')}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedUsers.includes(user.id) ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      setSelectedUsers(prev =>
                        prev.includes(user.id)
                          ? prev.filter(id => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    <img
                      src={user.profile_picture || '/default-avatar.png'}
                      alt={user.username}
                      className="w-6 h-6 rounded-full mr-2"
                      onError={(e) => {
                        e.target.src = '/default-avatar.png';
                      }}
                    />
                    <span className="text-sm">{user.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={creatingGroup || uploadingAvatar}
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || creatingGroup || uploadingAvatar}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploadingAvatar ? t('uploading') : creatingGroup ? t('creating') : t('createGroup')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupModal;
