import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabase';
import { Users, Settings, UserPlus, UserMinus, Upload, Image, X } from 'lucide-react';
import { toast } from 'react-toastify';

function GroupChat({ chat, currentUser, onUpdate }) {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [groupName, setGroupName] = useState(chat?.group_name || '');
  const [groupDescription, setGroupDescription] = useState(chat?.group_description || '');

  useEffect(() => {
    if (chat?.id) {
      fetchGroupMembers();
      checkAdminStatus();
      setGroupName(chat.group_name || '');
      setGroupDescription(chat.group_description || '');
    }
  }, [chat?.id, chat?.group_name, chat?.group_description]);

  const fetchGroupMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_members')
        .select(`
          user_id,
          users (id, username, profile_picture)
        `)
        .eq('chat_id', chat.id);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('created_by')
        .eq('id', chat.id)
        .single();

      if (!error && data) {
        setIsAdmin(data.created_by === currentUser.id);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const memberIds = members.map(m => m.user_id);
      const memberIdsCondition = memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, profile_picture')
        .neq('id', currentUser.id)
        .not('id', 'in', `(${memberIdsCondition.join(',')})`)
        .limit(20);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (err) {
      console.error('Error fetching available users:', err);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        toast.error(t('onlyImagesAllowed'));
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('fileTooLarge'));
        return;
      }

      setUploadingAvatar(true);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `group-avatars/${fileName}`;

      // Використовуємо правильний bucket: group-pictures
      const { error: uploadError } = await supabase.storage
        .from('group-pictures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('group-pictures')
        .getPublicUrl(filePath);

      // Використовуємо правильне поле group_avatar_url
      const { error: updateError } = await supabase
        .from('chats')
        .update({ group_avatar_url: publicUrl })
        .eq('id', chat.id);

      if (updateError) throw updateError;

      toast.success(t('avatarUpdated'));
      onUpdate?.();
      setAvatarPreview(null);
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error(t('errorUpdatingAvatar'));
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploadingAvatar(true);

      // Використовуємо правильне поле group_avatar_url
      const { error: updateError } = await supabase
        .from('chats')
        .update({ group_avatar_url: null })
        .eq('id', chat.id);

      if (updateError) throw updateError;

      toast.success(t('avatarRemoved'));
      onUpdate?.();
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error(t('errorRemovingAvatar'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      const { error } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chat.id,
          user_id: userId
        });

      if (error) throw error;

      toast.success(t('memberAdded'));
      fetchGroupMembers();
      fetchAvailableUsers();
      onUpdate?.();
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error(t('errorAddingMember'));
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      if (userId === currentUser.id) {
        toast.error(t('cannotRemoveYourself'));
        return;
      }

      const { error } = await supabase
        .from('chat_members')
        .delete()
        .eq('chat_id', chat.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(t('memberRemoved'));
      fetchGroupMembers();
      fetchAvailableUsers();
      onUpdate?.();
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error(t('errorRemovingMember'));
    }
  };

  const handleUpdateGroup = async (updates) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update(updates)
        .eq('id', chat.id);

      if (error) throw error;

      toast.success(t('groupUpdated'));
      onUpdate?.();
      
      // Оновлюємо локальний стан
      if (updates.group_name) {
        setGroupName(updates.group_name);
      }
      if (updates.group_description !== undefined) {
        setGroupDescription(updates.group_description);
      }
    } catch (err) {
      console.error('Error updating group:', err);
      toast.error(t('errorUpdatingGroup'));
    }
  };

  const handleGroupNameUpdate = async (newName) => {
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== chat.group_name) {
      await handleUpdateGroup({ group_name: trimmedName });
    }
  };

  const handleGroupDescriptionUpdate = async (newDescription) => {
    const trimmedDescription = newDescription.trim();
    if (trimmedDescription !== chat.group_description) {
      await handleUpdateGroup({ group_description: trimmedDescription });
    }
  };

  if (!chat?.is_group) return null;

  return (
    <div className="group-chat-container bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={chat.group_name || t('groupChat')}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
              />
            ) : chat.group_avatar_url ? ( // Використовуємо group_avatar_url
              <img
                src={chat.group_avatar_url}
                alt={chat.group_name || t('groupChat')}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-blue-200">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{chat.group_name || t('groupChat')}</h3>
            <p className="text-sm text-gray-500">
              {members.length} {t('members')}
            </p>
            {chat.group_description && (
              <p className="text-sm text-gray-600 mt-1">{chat.group_description}</p>
            )}
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              if (!showSettings) fetchAvailableUsers();
            }}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
            title={t('groupSettings')}
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {showSettings && isAdmin && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">{t('groupSettings')}</h4>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('groupAvatar')}
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-blue-300"
                  />
                ) : chat.group_avatar_url ? ( // Використовуємо group_avatar_url
                  <div className="relative">
                    <img
                      src={chat.group_avatar_url}
                      alt={chat.group_name || t('groupChat')}
                      className="w-20 h-20 rounded-full object-cover border-2 border-blue-300"
                    />
                    <button
                      onClick={removeAvatar}
                      disabled={uploadingAvatar}
                      className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:bg-gray-400 transition-colors duration-200"
                      title={t('removeAvatar')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center border-2 border-dashed border-gray-300">
                    <Image className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 transition-colors duration-200 text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingAvatar ? t('uploading') : t('changeAvatar')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
                
                {chat.group_avatar_url && !avatarPreview && ( // Використовуємо group_avatar_url
                  <button
                    onClick={removeAvatar}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors duration-200 text-sm font-medium"
                  >
                    <X className="w-4 h-4" />
                    <span>{t('removeAvatar')}</span>
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              {t('avatarRecommendations')}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('groupName')}
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onBlur={(e) => handleGroupNameUpdate(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder={t('enterGroupName')}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('groupDescription')}
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              onBlur={(e) => handleGroupDescriptionUpdate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              rows="3"
              placeholder={t('enterGroupDescription')}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('addMembers')}
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t('noUsersToAdd')}
                </p>
              ) : (
                availableUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.profile_picture}
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{user.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMember(user.id)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-colors duration-200"
                      title={t('addMember')}
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-4">{t('groupMembers')}</h4>
        <div className="space-y-3">
          {members.map(member => (
            <div key={member.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
              <div className="flex items-center gap-3">
                <img
                  src={member.users?.profile_picture}
                  alt={member.users?.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.users?.username}</p>
                  {member.user_id === chat.created_by && (
                    <p className="text-xs text-blue-600 font-medium">{t('admin')}</p>
                  )}
                  {member.user_id === currentUser.id && (
                    <p className="text-xs text-gray-500">{t('you')}</p>
                  )}
                </div>
              </div>
              
              {isAdmin && member.user_id !== currentUser.id && (
                <button
                  onClick={() => handleRemoveMember(member.user_id)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                  title={t('removeMember')}
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GroupChat;
