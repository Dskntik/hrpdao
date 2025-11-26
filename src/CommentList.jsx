// components/CommentList.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Eye, Reply, MoreVertical, Edit, Trash2, Coins } from 'lucide-react';
import countries from '../utils/countries';

const CommentList = ({ 
  comments, 
  currentUser, 
  onReply, 
  onEdit, 
  onDelete, 
  onReaction,
  replyCommentId,
  newReply,
  setNewReply,
  onPostReply,
  onCancelReply,
  activeCommentMenu,
  onToggleCommentMenu,
  userPoints
}) => {
  const { t, i18n } = useTranslation();

  const renderComments = (comments, parentId = null, depth = 0) => {
    const filteredComments = comments.filter((comment) => comment.parent_comment_id === parentId);
    const sortedComments = [...filteredComments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (sortedComments.length === 0) return null;

    return sortedComments.map((comment) => (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''} mt-3 bg-white p-4 rounded-lg shadow-md relative`}>
                
        {currentUser?.id === comment.user_id && (
          <div className="absolute top-3 right-3 menu-container">
            <button
              onClick={() => onToggleCommentMenu(comment.id)}
              className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
              aria-label={t('commentOptions')}
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>
            
            {activeCommentMenu === comment.id && (
              <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]">
                <button
                  onClick={() => onEdit(comment.id, comment.content)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  aria-label={t('editComment')}
                >
                  <Edit className="h-4 w-4" />
                  <span>{t('edit')}</span>
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  aria-label={t('deleteComment')}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{t('delete')}</span>
                </button>
              </div>
            )}
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
            <p className="text-xs text-gray-500">
              {comment.users?.country 
                ? countries.find(c => c.code === comment.users.country)?.name[i18n.language] || t('unknown')
                : t('unknown')} • {new Date(comment.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 mb-3">{comment.content}</p>
        
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => onReaction(comment.id, 'true')}
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
            onClick={() => onReaction(comment.id, 'false')}
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
            onClick={() => onReaction(comment.id, 'notice')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comment.comment_reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'notice')
                ? 'text-blue-700 bg-blue-100 font-semibold'
                : 'text-blue-600 hover:bg-blue-100'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs font-medium">
              {t('notice')} {comment.comment_reactions?.filter((r) => r.reaction_type === 'notice').length || 0}
            </span>
          </button>
          
          <button
            onClick={() => onReply(comment.id)}
            className="flex items-center text-xs text-gray-500 hover:text-gray-600 transition-colors"
          >
            <Reply className="h-3 w-3 mr-1" /> {t('reply')}
          </button>
        </div>

        {/* Answer form */}
        {replyCommentId === comment.id && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            {/* Відображення поінтів для відповіді */}
            <div className="mb-3 p-2 bg-blue-50 rounded-lg text-xs">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">
                  {t('availablePoints') || 'Доступно поінтів'}: 
                  <span className="font-semibold ml-1">{userPoints}</span>
                </span>
                <span className="text-red-600 font-semibold">
                  {t('comment.cost') || 'Вартість відповіді'}: 2 {t('points') || 'поінти'}
                </span>
              </div>
              {userPoints < 2 && (
                <div className="mt-1 text-red-600">
                  {t('insufficientPointsForComment') || 'Для створення відповіді потрібно мінімум 2 поінти.'}
                </div>
              )}
            </div>

            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder={t('newReplyPlaceholder')}
              className="w-full resize-y border border-gray-300 rounded-md p-2 text-sm"
              rows="2"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onPostReply(comment.id)}
                disabled={userPoints < 2}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  userPoints < 2
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {userPoints < 2 ? (
                  <>
                    <Coins className="w-4 h-4 inline mr-1" />
                    {t('insufficientPointsForComment') || 'Недостатньо поінтів'}
                  </>
                ) : (
                  `${t('postReply')} (2 ${t('points') || 'поінти'})`
                )}
              </button>
              <button
                onClick={onCancelReply}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Рекурсивно відображаємо відповіді */}
        {renderComments(comments, comment.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {renderComments(comments)}
    </div>
  );
};

export default CommentList;