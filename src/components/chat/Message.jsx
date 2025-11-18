import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import { Trash2, Edit, User, Download, FileText } from 'lucide-react';
import { supabase } from '../../utils/supabase';

function Message({ message, isOwnMessage, onDelete, onEdit }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'uk' ? uk : enUS;

  const getFileType = (filename) => {
    const extension = filename?.split('.').pop()?.toLowerCase();
    if (!extension) return 'unknown';
    
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const videoTypes = ['mp4', 'webm', 'avi', 'mov', 'wmv'];
    const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (videoTypes.includes(extension)) return 'video';
    if (documentTypes.includes(extension)) return 'document';
    return 'other';
  };

  const getFileNameFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || t('file');
    } catch {
      return t('file');
    }
  };

  const renderFilePreview = () => {
    if (!message.file_url) return null;

    const fileType = getFileType(message.file_url);
    const fileName = getFileNameFromUrl(message.file_url);

    switch (fileType) {
      case 'image':
        return (
          <div className="mt-2">
            <img
              src={message.file_url}
              alt={t('imageAttachment')}
              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.file_url, '_blank')}
            />
          </div>
        );
      
      case 'video':
        return (
          <div className="mt-2">
            <video
              src={message.file_url}
              controls
              className="max-w-full rounded-lg"
            />
          </div>
        );
      
      case 'document':
        return (
          <div className="mt-2 p-3 bg-white bg-opacity-20 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs opacity-80">
                  {fileType.toUpperCase()} {t('document')}
                </p>
              </div>
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                download
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="mt-2 p-3 bg-white bg-opacity-20 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs opacity-80">{t('fileAttachment')}</p>
              </div>
              <a
                href={message.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                download
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-xs md:max-w-md p-3 rounded-lg ${
          isOwnMessage
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        } relative group`}
      >
        {/* User info */}
        <div className="flex items-center gap-2 mb-1">
          {message.users?.profile_picture ? (
            <img
              src={message.users.profile_picture}
              alt={message.users.username}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
          )}
          <p className="text-sm font-bold truncate">
            {message.users?.username || t('unknownUser')}
          </p>
        </div>

        {/* Message content */}
        {message.content && (
          <p className="text-base whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}

        {/* File attachment */}
        {renderFilePreview()}

        {/* Timestamp and edit status */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs opacity-70">
            {formatDistanceToNow(new Date(message.created_at), { 
              addSuffix: true, 
              locale 
            })}
            {message.updated_at && ` • ${t('edited')}`}
          </p>
          
          {message.updated_at && message.created_at !== message.updated_at && (
            <span className="text-xs opacity-50 ml-2">
              ({formatDistanceToNow(new Date(message.updated_at), { 
                addSuffix: true, 
                locale 
              })})
            </span>
          )}
        </div>

        {/* Action buttons for own messages */}
        {isOwnMessage && (
          <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 bg-black bg-opacity-20 rounded-full p-1">
            <button
              onClick={onEdit}
              className="p-1 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-all duration-200"
              aria-label={t('editMessage')}
              title={t('editMessage')}
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200"
              aria-label={t('deleteMessage')}
              title={t('deleteMessage')}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Message status indicator */}
        {isOwnMessage && (
          <div className="absolute -right-2 -bottom-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;
