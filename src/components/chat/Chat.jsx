// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Send, Paperclip, Smile, Trash2, Edit, User, Users, Plus } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';

import { useChat } from '../../hooks/useChat';
import Message from './Message';
import GroupChat from './GroupChat';
import CreateGroupModal from './CreateGroupModal';
import { supabase } from '../../utils/supabase';
import MainLayout from '../../components/layout/MainLayout';

function Chat() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(location.state?.selectedChatId || null);
  const [messageText, setMessageText] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const locale = i18n.language === 'uk' ? uk : enUS;

  // Use the custom hook for chat logic
  const {
    chats,
    messages,
    loading,
    error,
    isTyping,
    handleSendMessage,
    handleDeleteMessage,
    handleDeleteChat,
    handleTyping,
    refetchChats,
  } = useChat(currentUser, selectedChatId);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate('/');
          return;
        }
        setCurrentUser(user);
      } catch (err) {
        console.error('Error fetching user:', err);
        navigate('/');
      }
    };

    fetchCurrentUser();
  }, [navigate]);

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection and preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const fileType = selectedFile.type.split('/')[0];
      if (fileType === 'image' || fileType === 'video') {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview(null);
      }
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiObject) => {
    setMessageText((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // Handle sending message
  const handleSendMessageWrapper = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !file && !editingMessageId) return;

    const result = await handleSendMessage(messageText, file, editingMessageId);
    
    if (result.success) {
      if (result.isEdit) {
        setEditingMessageId(null);
      }
      setMessageText('');
      setFile(null);
      setFilePreview(null);
      fileInputRef.current.value = null;
    }
  };

  // Handle editing a message
  const handleEditMessage = (messageId, content) => {
    setEditingMessageId(messageId);
    setMessageText(content);
    setFile(null);
    setFilePreview(null);
    fileInputRef.current.value = null;
  };

  // Handle deleting a chat
  const handleDeleteChatWrapper = async (chatId) => {
    const result = await handleDeleteChat(chatId);
    if (result.success && result.wasSelected) {
      setSelectedChatId(null);
    }
  };

  const selectedChat = chats.find(chat => chat.id === selectedChatId);

  if (loading && !chats.length) return (
    <MainLayout currentUser={currentUser}>
      <div className="p-4 text-gray-900">{t('loading')}</div>
    </MainLayout>
  );
  
  if (error) return (
    <MainLayout currentUser={currentUser}>
      <div className="p-4 text-red-500">{t('error')}: {error}</div>
    </MainLayout>
  );

  return (
    <MainLayout currentUser={currentUser} showRightSidebar={true}>
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex flex-col">
        <div className="w-full mx-auto px-4 flex-1 mt-4">
          {/* Main Content */}
          <div>
            <div className="flex flex-col gap-4">
              {/* Horizontal Chat list */}
              <div className="w-full bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{t('chats')}</h2>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('createGroup')}</span>
                  </button>
                </div>
                
                {chats.length === 0 ? (
                  <p className="text-gray-500">{t('noChats')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex space-x-4 pb-2 min-w-max">
                      <AnimatePresence>
                        {chats.map((chat) => (
                          <motion.div
                            key={chat.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`flex-shrink-0 w-48 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                              selectedChatId === chat.id 
                                ? 'bg-blue-100 border-blue-300' 
                                : 'hover:bg-gray-100 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div 
                                className="flex items-center flex-1 min-w-0" 
                                onClick={() => setSelectedChatId(chat.id)}
                              >
                                {renderChatAvatar(chat)}
                                
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">
                                    {chat.is_group 
                                      ? (chat.group_name || t('groupChat'))
                                      : (chat.otherUsername || t('user'))
                                    }
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {chat.is_group 
                                      ? `${chat.member_count || 0} ${t('members')}`
                                      : formatDistanceToNow(new Date(chat.created_at || new Date()), { 
                                          addSuffix: true, 
                                          locale 
                                        })
                                    }
                                  </p>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteChatWrapper(chat.id)}
                                className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors duration-200 flex-shrink-0"
                                aria-label={t('deleteChat')}
                                title={t('deleteChat')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages area - full width */}
              <div className="w-full bg-white p-4 rounded-lg shadow-md flex flex-col">
                {selectedChatId ? (
                  <>
                    <ChatHeader chat={selectedChat} t={t} />
                    
                    {/* Group Chat Info Panel */}
                    {selectedChat?.is_group && (
                      <GroupChat
                        chat={selectedChat}
                        currentUser={currentUser}
                        onUpdate={refetchChats}
                      />
                    )}
                    
                    <MessagesArea 
                      messages={messages}
                      currentUser={currentUser}
                      isTyping={isTyping}
                      onDeleteMessage={handleDeleteMessage}
                      onEditMessage={handleEditMessage}
                      messagesEndRef={messagesEndRef}
                      t={t}
                    />
                    
                    <MessageInput
                      messageText={messageText}
                      setMessageText={setMessageText}
                      file={file}
                      filePreview={filePreview}
                      setFile={setFile}
                      setFilePreview={setFilePreview}
                      editingMessageId={editingMessageId}
                      showEmojiPicker={showEmojiPicker}
                      setShowEmojiPicker={setShowEmojiPicker}
                      fileInputRef={fileInputRef}
                      handleFileChange={handleFileChange}
                      handleEmojiClick={handleEmojiClick}
                      handleTyping={handleTyping}
                      handleSendMessage={handleSendMessageWrapper}
                      t={t}
                    />
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 text-center">{t('selectChat')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          currentUser={currentUser}
          onGroupCreated={(newChat) => {
            setSelectedChatId(newChat.id);
            refetchChats();
          }}
        />
        
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </MainLayout>
  );
}

// Helper components for better organization
const renderChatAvatar = (chat) => {
  if (!chat) return null;
  
  if (chat.is_group) {
    // Використовуємо group_avatar_url замість avatar_url
    if (chat.group_avatar_url) {
      return (
        <img
          src={chat.group_avatar_url}
          alt={chat.group_name || 'Group'}
          className="w-10 h-10 rounded-full mr-3 object-cover flex-shrink-0"
        />
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
        <Users className="w-6 h-6 text-blue-600" />
      </div>
    );
  }
  
  return chat.otherUserProfilePicture ? (
    <img
      src={chat.otherUserProfilePicture}
      alt={chat.otherUsername || 'User'}
      className="w-10 h-10 rounded-full mr-3 object-cover flex-shrink-0"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3 flex-shrink-0">
      <User className="w-6 h-6 text-gray-600" />
    </div>
  );
};

const ChatHeader = ({ chat, t }) => {
  if (!chat) {
    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
            <User className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('loading')}</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        {chat.is_group ? (
          <>
            {/* Використовуємо group_avatar_url замість avatar_url */}
            {chat.group_avatar_url ? (
              <img
                src={chat.group_avatar_url}
                alt={chat.group_name || t('groupChat')}
                className="w-10 h-10 rounded-full mr-3 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {chat.group_name || t('groupChat')}
              </h2>
              <p className="text-sm text-gray-500">
                {chat.member_count || 0} {t('members')}
              </p>
            </div>
          </>
        ) : (
          <>
            {chat.otherUserProfilePicture ? (
              <img
                src={chat.otherUserProfilePicture}
                alt={chat.otherUsername || 'User'}
                className="w-10 h-10 rounded-full mr-3 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            )}
            
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {chat.otherUsername || t('user')}
              </h2>
              {chat.otherUserId && (
                <Link
                  to={`/public/${chat.otherUserId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t('viewProfile')}
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const MessagesArea = ({ messages, currentUser, isTyping, onDeleteMessage, onEditMessage, messagesEndRef, t }) => (
  <div className="flex-1 overflow-y-auto max-h-[60vh] p-2 space-y-3">
    {messages.length === 0 ? (
      <p className="text-gray-500 text-center py-8">{t('noMessages')}</p>
    ) : (
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <Message
              message={message}
              isOwnMessage={message.user_id === currentUser?.id}
              onDelete={() => onDeleteMessage(message.id)}
              onEdit={() => onEditMessage(message.id, message.content)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    )}
    {isTyping && (
      <p className="text-gray-500 text-sm italic">{t('typing')}</p>
    )}
    <div ref={messagesEndRef} />
  </div>
);

const MessageInput = ({
  messageText,
  setMessageText,
  file,
  filePreview,
  setFile,
  setFilePreview,
  editingMessageId,
  showEmojiPicker,
  setShowEmojiPicker,
  fileInputRef,
  handleFileChange,
  handleEmojiClick,
  handleTyping,
  handleSendMessage,
  t
}) => (
  <form onSubmit={handleSendMessage} className="mt-4 flex flex-col gap-2">
    {filePreview && (
      <FilePreview 
        file={file} 
        filePreview={filePreview} 
        setFile={setFile}
        setFilePreview={setFilePreview}
        fileInputRef={fileInputRef}
        t={t}
      />
    )}
    
    <div className="flex gap-2">
      <div className="flex-1 flex flex-col">
        <textarea
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            handleTyping();
          }}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (handleSendMessage(e), e.preventDefault())}
          placeholder={editingMessageId ? t('editMessage') : t('typeMessage')}
          className="flex-1 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base min-h-[80px] box-border transition-all duration-200"
          style={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
        />
        
        <MessageActions
          fileInputRef={fileInputRef}
          setShowEmojiPicker={setShowEmojiPicker}
          messageText={messageText}
          file={file}
          editingMessageId={editingMessageId}
          handleSendMessage={handleSendMessage}
          t={t}
        />
      </div>
    </div>
    
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileChange}
      accept="image/*,video/*,.pdf"
      className="hidden"
    />
    
    {showEmojiPicker && (
      <div className="absolute bottom-16 right-4 z-10">
        <EmojiPicker onEmojiClick={handleEmojiClick} />
      </div>
    )}
  </form>
);

const FilePreview = ({ file, filePreview, setFile, setFilePreview, fileInputRef, t }) => (
  <div className="relative inline-block">
    {file?.type.startsWith('image/') ? (
      <img src={filePreview} alt="Preview" className="max-w-xs rounded-lg" />
    ) : file?.type.startsWith('video/') ? (
      <video src={filePreview} controls className="max-w-xs rounded-lg" />
    ) : (
      <p className="text-gray-500 bg-gray-100 p-2 rounded-lg">{file?.name}</p>
    )}
    <button
      type="button"
      onClick={() => {
        setFile(null);
        setFilePreview(null);
        fileInputRef.current.value = null;
      }}
      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full transform translate-x-1/2 -translate-y-1/2"
      aria-label={t('removeFile')}
    >
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
);

const MessageActions = ({
  fileInputRef,
  setShowEmojiPicker,
  messageText,
  file,
  editingMessageId,
  handleSendMessage,
  t
}) => (
  <div className="flex gap-2 mt-2 justify-between items-center">
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current.click()}
        className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-all duration-200"
        aria-label={t('attachFile')}
        title={t('attachFile')}
      >
        <Paperclip className="h-4 w-4" />
      </button>
      
      <button
        type="button"
        onClick={() => setShowEmojiPicker(prev => !prev)}
        className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-all duration-200"
        aria-label={t('selectEmoji')}
        title={t('selectEmoji')}
      >
        <Smile className="h-4 w-4" />
      </button>
    </div>
    
    <button
      type="submit"
      disabled={!messageText.trim() && !file && !editingMessageId}
      className={`h-10 px-20 rounded-full font-medium text-white transition-all duration-200 flex items-center justify-center gap-1 ${
        !messageText.trim() && !file && !editingMessageId
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 shadow-md hover:shadow-lg'
      }`}
      aria-label={editingMessageId ? t('updateMessage') : t('sendMessage')}
      title={editingMessageId ? t('updateMessage') : t('sendMessage')}
    >
      <Send className="h-4 w-4" />
    </button>
  </div>
);

export default Chat;
