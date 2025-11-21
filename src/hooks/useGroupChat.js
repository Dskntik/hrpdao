import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { toast } from 'react-toastify';

export const useGroupChat = () => {
  const [creatingGroup, setCreatingGroup] = useState(false);

  const createGroupChat = async (groupData, selectedUsers, currentUser) => {
    try {
      setCreatingGroup(true);

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({
          is_group: true,
          group_name: groupData.name,
          group_description: groupData.description,
          group_avatar_url: groupData.group_avatar_url, // Додаємо group_avatar_url
          created_by: currentUser.id
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Додаємо учасників
      const members = [
        { chat_id: chatData.id, user_id: currentUser.id },
        ...selectedUsers.map(userId => ({ chat_id: chatData.id, user_id: userId }))
      ];

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(members);

      if (membersError) throw membersError;

      toast.success('Груповий чат створено');
      return chatData;

    } catch (err) {
      console.error('Error creating group chat:', err);
      toast.error('Помилка створення групового чату');
      throw err;
    } finally {
      setCreatingGroup(false);
    }
  };

  const getAvailableUsers = async (currentUserId, excludeUsers = []) => {
    try {
      let query = supabase
        .from('users')
        .select('id, username, profile_picture')
        .neq('id', currentUserId);

      if (excludeUsers.length > 0) {
        query = query.not('id', 'in', `(${excludeUsers.join(',')})`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data || [];

    } catch (err) {
      console.error('Error fetching available users:', err);
      return [];
    }
  };

  return {
    creatingGroup,
    createGroupChat,
    getAvailableUsers
  };
};