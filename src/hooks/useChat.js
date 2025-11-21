import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import { toast } from 'react-toastify';

export const useChat = (currentUser, selectedChatId) => {
  const { t } = useTranslation();
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  // Допоміжна функція для видалення всіх залежних записів
  const deleteChatWithDependencies = async (chatId) => {
    try {
      console.log('Starting deletion of chat dependencies for:', chatId);

      // Видаляємо всі залежні записи через REST API з правильним порядком
      const endpoints = [
        { table: 'typing_status', field: 'chat_id' },
        { table: 'notifications', field: 'chat_id' },
        { table: 'messages', field: 'chat_id' },
        { table: 'chat_members', field: 'chat_id' }
      ];

      for (const endpoint of endpoints) {
        const { error } = await supabase
          .from(endpoint.table)
          .delete()
          .eq(endpoint.field, chatId);
        
        if (error) {
          console.error(`Error deleting from ${endpoint.table}:`, error);
          // Продовжуємо видаляти інші таблиці навіть якщо виникла помилка
        } else {
          console.log(`Successfully deleted from ${endpoint.table}`);
        }
      }

      // Видаляємо сам чат
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) {
        console.error('Error deleting chat:', chatError);
        return { success: false, error: chatError };
      }

      console.log('Successfully deleted chat:', chatId);
      return { success: true, error: null };
    } catch (error) {
      console.error('Error in deleteChatWithDependencies:', error);
      return { success: false, error };
    }
  };

  // Fetch current user and chats
  const fetchUserAndChats = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const { data: memberships, error: membershipError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', currentUser.id);

      if (membershipError) throw membershipError;

      const chatIds = memberships.map(m => m.chat_id);
      if (chatIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('id, is_group, created_at, group_name, group_description, created_by, group_avatar_url')
        .in('id', chatIds);

      if (chatError) throw chatError;

      const processedChats = await Promise.all(
        chatData.map(async (chat) => {
          if (chat.is_group) {
            const { data: members, error: membersError } = await supabase
              .from('chat_members')
              .select('user_id')
              .eq('chat_id', chat.id);

            if (membersError) throw membersError;

            return {
              id: chat.id,
              is_group: chat.is_group,
              group_name: chat.group_name,
              group_description: chat.group_description,
              group_avatar_url: chat.group_avatar_url,
              created_by: chat.created_by,
              member_count: members?.length || 0,
              created_at: chat.created_at,
            };
          } else {
            const { data: members, error: membersError } = await supabase
              .from('chat_members')
              .select('user_id, users (username, profile_picture)')
              .eq('chat_id', chat.id)
              .neq('user_id', currentUser.id);

            if (membersError) throw membersError;

            const otherUser = members.length > 0 ? members[0] : null;
            return {
              id: chat.id,
              is_group: chat.is_group,
              otherUsername: otherUser ? otherUser.users.username : t('unknownUser'),
              otherUserProfilePicture: otherUser ? otherUser.users.profile_picture : null,
              otherUserId: otherUser ? otherUser.user_id : null,
              created_at: chat.created_at,
            };
          }
        })
      );

      console.log('Processed chats with avatars:', processedChats.filter(chat => 
        chat.is_group && chat.group_avatar_url
      ));

      setChats(processedChats);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError(t('errorLoadingChats') || 'Помилка завантаження чатів');
    } finally {
      setLoading(false);
    }
  }, [currentUser, t]);

  // Fetch messages for the selected chat
  const fetchMessages = useCallback(async () => {
    if (!selectedChatId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          user_id,
          file_url,
          users (username, profile_picture)
        `)
        .eq('chat_id', selectedChatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(t('errorLoadingMessages') || 'Помилка завантаження повідомлень');
      toast.error(t('errorLoadingMessages') || 'Помилка завантаження повідомлень');
    } finally {
      setLoading(false);
    }
  }, [selectedChatId, t]);

  // Function to create a notification about a new message
  const createMessageNotification = useCallback(async (message, chatId, recipientId) => {
    if (!currentUser) return;

    try {
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('is_group, group_name')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;

      const { data: senderData, error: senderError } = await supabase
        .from('users')
        .select('username')
        .eq('id', currentUser.id)
        .single();

      if (senderError) throw senderError;

      let notificationMessage = '';
      if (chatData.is_group) {
        const groupName = chatData.group_name || t('groupChat');
        notificationMessage = `${groupName}: ${senderData.username}: ${message.content || t('sentAttachment')}`;
      } else {
        notificationMessage = message.content || t('sentAttachment');
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          sender_id: currentUser.id,
          type: 'message',
          chat_id: chatId,
          message: notificationMessage,
          is_read: false
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    } catch (err) {
      console.error('Error in createMessageNotification:', err);
    }
  }, [currentUser, t]);

  // Handle sending a new message or updating an existing one
  const handleSendMessage = async (messageText, file, editingMessageId) => {
    if (!currentUser || !selectedChatId) return;

    try {
      setError(null);
      let fileUrl = null;

      if (editingMessageId) {
        const { error } = await supabase
          .from('messages')
          .update({ content: messageText.trim(), updated_at: new Date().toISOString() })
          .eq('id', editingMessageId)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingMessageId
              ? { ...msg, content: messageText.trim(), updated_at: new Date().toISOString() }
              : msg
          )
        );

        toast.success(t('messageUpdated') || 'Повідомлення оновлено');
        return { success: true, isEdit: true };
      } else {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('chat_files')
            .upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage
            .from('chat_files')
            .getPublicUrl(fileName);
          fileUrl = publicUrlData.publicUrl;
        }

        const newMessage = {
          chat_id: selectedChatId,
          user_id: currentUser.id,
          content: messageText.trim() || '',
          file_url: fileUrl,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('messages')
          .insert(newMessage)
          .select('id, content, created_at, updated_at, user_id, file_url')
          .single();

        if (error) throw error;

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username, profile_picture')
          .eq('id', currentUser.id)
          .single();

        if (userError) throw userError;

        const messageWithUser = {
          id: data.id,
          content: data.content,
          created_at: data.created_at,
          updated_at: data.updated_at,
          user_id: data.user_id,
          file_url: data.file_url,
          users: { 
            username: userData.username,
            profile_picture: userData.profile_picture
          },
        };

        setMessages((prev) => [...prev, messageWithUser]);

        // Create notifications for other chat participants
        try {
          const { data: chatMembers, error: membersError } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('chat_id', selectedChatId)
            .neq('user_id', currentUser.id);

          if (!membersError && chatMembers) {
            for (const member of chatMembers) {
              await createMessageNotification(messageWithUser, selectedChatId, member.user_id);
            }
          }
        } catch (err) {
          console.error('Error creating notifications for chat members:', err);
        }

        toast.success(t('messageSent') || 'Повідомлення надіслано');
        return { success: true, isEdit: false };
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(t('errorSendingMessage') || 'Помилка надсилання повідомлення');
      toast.error(t('errorSendingMessage') || 'Помилка надсилання повідомлення');
      return { success: false, error: err };
    }
  };

  // Handle deleting a message
  const handleDeleteMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      toast.success(t('messageDeleted') || 'Повідомлення видалено');
      return { success: true };
    } catch (err) {
      console.error('Error deleting message:', err);
      toast.error(t('errorDeletingMessage') || 'Помилка видалення повідомлення');
      return { success: false, error: err };
    }
  };

  // Handle deleting a chat
  const handleDeleteChat = async (chatId) => {
    try {
      console.log('Attempting to delete chat:', chatId);
      console.log('Current user:', currentUser?.id);
      
      const chat = chats.find(c => c.id === chatId);
      console.log('Chat to delete:', chat);

      // Перевірка, чи існує чат
      if (!chat) {
        toast.error(t('chatNotFound') || 'Чат не знайдено');
        return { success: false };
      }
      
      if (chat?.is_group && chat.created_by !== currentUser.id) {
        toast.error(t('onlyAdminCanDeleteGroup') || 'Тільки адміністратор може видалити груповий чат');
        return { success: false };
      }

      // Спочатку отримуємо всі повідомлення, щоб видалити файли з storage
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('file_url')
        .eq('chat_id', chatId);

      if (!messagesError && messages) {
        // Видаляємо файли повідомлень з storage
        for (const message of messages) {
          if (message.file_url) {
            try {
              const filePath = message.file_url.split('/').pop();
              await supabase.storage
                .from('chat_files')
                .remove([`${currentUser.id}/${filePath}`]);
              console.log('Deleted file from storage:', filePath);
            } catch (fileError) {
              console.error('Error deleting file from storage:', fileError);
            }
          }
        }
      }

      // Для групових чатів також видаляємо аватар з storage
      if (chat?.is_group && chat.group_avatar_url) {
        try {
          const avatarPath = chat.group_avatar_url.split('/').pop();
          await supabase.storage
            .from('group-pictures')
            .remove([`group-avatars/${avatarPath}`]);
          console.log('Deleted group avatar from storage:', avatarPath);
        } catch (avatarError) {
          console.error('Error deleting group avatar from storage:', avatarError);
        }
      }

      // Використовуємо допоміжну функцію для видалення всіх залежностей
      const deleteResult = await deleteChatWithDependencies(chatId);
      
      if (!deleteResult.success) {
        console.error('Failed to delete chat with dependencies:', deleteResult.error);
        
        // Спроба альтернативного підходу - видалення через транзакцію
        try {
          console.log('Trying alternative deletion approach...');
          
          // Видаляємо всі записи в правильному порядку
          await supabase.from('typing_status').delete().eq('chat_id', chatId);
          await supabase.from('notifications').delete().eq('chat_id', chatId);
          await supabase.from('messages').delete().eq('chat_id', chatId);
          await supabase.from('chat_members').delete().eq('chat_id', chatId);
          
          // Видаляємо сам чат
          const { error: finalError } = await supabase
            .from('chats')
            .delete()
            .eq('id', chatId);
            
          if (finalError) {
            throw finalError;
          }
          
          console.log('Alternative deletion approach succeeded');
        } catch (altError) {
          console.error('Alternative deletion approach failed:', altError);
          throw deleteResult.error;
        }
      }

      toast.success(t('chatDeleted') || 'Чат видалено');
      
      const wasSelected = selectedChatId === chatId;
      if (wasSelected) {
        setSelectedChatId(null);
      }
      
      // Оновлюємо список чатів
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      // Очищаємо повідомлення, якщо видаляємо вибраний чат
      if (wasSelected) {
        setMessages([]);
      }
      
      console.log('Chat successfully deleted from database and state');
      return { success: true, wasSelected };
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error(t('errorDeletingChat') || 'Помилка видалення чату');
      return { success: false, wasSelected: false };
    }
  };

  // Handle typing status
  const handleTyping = async () => {
    if (!selectedChatId || !currentUser) return;

    try {
      await supabase
        .from('typing_status')
        .insert({
          chat_id: selectedChatId,
          user_id: currentUser.id,
          created_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Error sending typing status:', err);
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to new chat memberships
    const membershipSubscription = supabase
      .channel('public:chat_members')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_members',
          filter: `user_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          const { data: chatData, error: chatError } = await supabase
            .from('chats')
            .select('id, is_group, created_at, group_name, group_description, created_by, group_avatar_url')
            .eq('id', payload.new.chat_id)
            .single();

          if (chatError) return;

          if (chatData.is_group) {
            const { data: members, error: membersError } = await supabase
              .from('chat_members')
              .select('user_id')
              .eq('chat_id', chatData.id);

            if (membersError) return;

            const newChat = {
              id: chatData.id,
              is_group: chatData.is_group,
              group_name: chatData.group_name,
              group_description: chatData.group_description,
              group_avatar_url: chatData.group_avatar_url,
              created_by: chatData.created_by,
              member_count: members?.length || 0,
              created_at: chatData.created_at,
            };

            setChats(prev => {
              if (!prev.some(chat => chat.id === newChat.id)) {
                return [...prev, newChat];
              }
              return prev;
            });
          } else {
            const { data: members, error: membersError } = await supabase
              .from('chat_members')
              .select('user_id, users (username, profile_picture)')
              .eq('chat_id', chatData.id)
              .neq('user_id', currentUser.id);

            if (membersError) return;

            const newChat = {
              id: chatData.id,
              is_group: chatData.is_group,
              otherUsername: members.length > 0 ? members[0].users.username : t('unknownUser'),
              otherUserProfilePicture: members.length > 0 ? members[0].users.profile_picture : null,
              otherUserId: members.length > 0 ? members[0].user_id : null,
              created_at: chatData.created_at,
            };

            setChats(prev => {
              if (!prev.some(chat => chat.id === newChat.id)) {
                return [...prev, newChat];
              }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membershipSubscription);
    };
  }, [currentUser, t]);

  useEffect(() => {
    if (!selectedChatId) return;

    // Subscribe to messages
    const messageSubscription = supabase
      .channel(`public:messages:chat_id=${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChatId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('username, profile_picture')
              .eq('id', payload.new.user_id)
              .single();

            if (userError) return;

            const newMessage = {
              id: payload.new.id,
              content: payload.new.content,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
              user_id: payload.new.user_id,
              file_url: payload.new.file_url,
              users: { 
                username: userData.username,
                profile_picture: userData.profile_picture
              },
            };

            setMessages((prev) => {
              if (prev.some(msg => msg.id === payload.new.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });

            if (payload.new.user_id !== currentUser?.id) {
              try {
                const { data: chatMembers, error: membersError } = await supabase
                  .from('chat_members')
                  .select('user_id')
                  .eq('chat_id', selectedChatId)
                  .neq('user_id', payload.new.user_id);

                if (!membersError && chatMembers) {
                  for (const member of chatMembers) {
                    await createMessageNotification(newMessage, selectedChatId, member.user_id);
                  }
                }
              } catch (err) {
                console.error('Error creating notifications for chat members:', err);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id
                  ? {
                      ...msg,
                      content: payload.new.content,
                      updated_at: payload.new.updated_at,
                    }
                  : msg
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to typing status
    const typingSubscription = supabase
      .channel(`public:typing:chat_id=${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'typing_status',
          filter: `chat_id=eq.${selectedChatId}`,
        },
        (payload) => {
          if (payload.new.user_id !== currentUser.id) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(typingSubscription);
    };
  }, [selectedChatId, currentUser, createMessageNotification]);

  // Initial data loading
  useEffect(() => {
    fetchUserAndChats();
  }, [fetchUserAndChats]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    chats,
    messages,
    loading,
    error,
    isTyping,
    setChats,
    setMessages,
    setError,
    handleSendMessage,
    handleDeleteMessage,
    handleDeleteChat,
    handleTyping,
    refetchChats: fetchUserAndChats,
    refetchMessages: fetchMessages,
  };
};
