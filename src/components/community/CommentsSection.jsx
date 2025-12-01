// src/components/community/CommentsSection.jsx
import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Eye, Reply, MoreVertical, Edit, Trash2, Plus } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';

// Компонент модального вікна для редагування коментаря
export const EditCommunityCommentModal = ({
  isOpen,
  onClose,
  editCommentContent,
  setEditCommentContent,
  onUpdate,
  loading
}) => {
  const { t } = useTranslation();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-blue-950">
                  {t('editComment')}
                </Dialog.Title>
                <div className="mt-4">
                  <textarea
                    value={editCommentContent}
                    onChange={(e) => setEditCommentContent(e.target.value)}
                    className="w-full resize-y border border-blue-200 rounded-xl p-4 text-blue-950 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    rows="4"
                    placeholder={t('editCommentPlaceholder')}
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md hover:shadow-lg"
                    onClick={onUpdate}
                    disabled={loading || !editCommentContent.trim()}
                  >
                    {loading ? t('saving') : t('save')}
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors text-sm"
                    onClick={onClose}
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
  );
};

// Компонент списку коментарів для спільноти
export const CommunityCommentList = ({ 
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
  formatTimeAgo
}) => {
  const { t } = useTranslation();

  const renderComments = (comments, parentId = null, depth = 0) => {
    const filteredComments = comments.filter((comment) => comment.parent_comment_id === parentId);
    const sortedComments = [...filteredComments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    if (sortedComments.length === 0) return null;

    return sortedComments.map((comment) => (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l-2 border-blue-100 pl-4' : ''} mt-3 bg-white p-4 rounded-xl border border-blue-100 relative`}>
                
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
            <p className="font-bold text-sm text-blue-950">{comment.users?.username || t('anonymous')}</p>
            <p className="text-xs text-blue-700">
              {comment.users?.country 
                ? 'Ukraine' 
                : t('unknown')} • {formatTimeAgo(comment.created_at)}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-blue-800 mb-3">{comment.content}</p>
        
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => onReaction(comment.id, 'true')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comment.community_comment_reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'true')
                ? 'text-green-700 bg-green-100 font-semibold'
                : 'text-green-600 hover:bg-green-100'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {t('true')} {comment.community_comment_reactions?.filter((r) => r.reaction_type === 'true').length || 0}
            </span>
          </button>
          
          <button
            onClick={() => onReaction(comment.id, 'false')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comment.community_comment_reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'false')
                ? 'text-red-700 bg-red-100 font-semibold'
                : 'text-red-600 hover:bg-red-100'
            }`}
          >
            <XCircle className="h-4 w-4" />
            <span className="text-xs font-medium">
              {t('false')} {comment.community_comment_reactions?.filter((r) => r.reaction_type === 'false').length || 0}
            </span>
          </button>

          <button
            onClick={() => onReaction(comment.id, 'notice')}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
              comment.community_comment_reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'notice')
                ? 'text-blue-700 bg-blue-100 font-semibold'
                : 'text-blue-600 hover:bg-blue-100'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs font-medium">
              {t('notice')} {comment.community_comment_reactions?.filter((r) => r.reaction_type === 'notice').length || 0}
            </span>
          </button>
          
          <button
            onClick={() => onReply(comment.id)}
            className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Reply className="h-3 w-3 mr-1" /> {t('reply')}
          </button>
        </div>

        {/* Форма відповіді */}
        {replyCommentId === comment.id && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder={t('newReplyPlaceholder')}
              className="w-full resize-y border border-blue-200 rounded-xl p-3 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              rows="2"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onPostReply(comment.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg"
              >
                {t('postReply')}
              </button>
              <button
                onClick={onCancelReply}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
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

// Основний компонент секції коментарів для спільноти
export const CommunityCommentsSection = ({ 
  post, 
  currentUser, 
  isMember, 
  formatTimeAgo,
  useCommunityCommentsHook 
}) => {
  const {
    comments,
    newComment,
    error,
    loading,
    editCommentContent,
    isEditCommentModalOpen,
    replyCommentId,
    newReply,
    activeCommentMenu,
    setNewComment,
    setEditCommentContent,
    setIsEditCommentModalOpen,
    setReplyCommentId,
    setNewReply,
    toggleCommentMenu,
    handleComment,
    handleReply,
    handleDeleteComment,
    handleEditComment,
    handleUpdateComment,
    handleCommentReaction,
  } = useCommunityCommentsHook(post.id);

  const { t } = useTranslation();

  if (!isMember) {
    return (
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
        <p className="text-blue-700 text-sm">
          {t('joinToComment') || 'Приєднайтесь до спільноти, щоб коментувати пости'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Форма нового коментаря */}
      {currentUser && (
        <div className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('newCommentPlaceholder') || 'Напишіть ваш коментар...'}
            className="w-full resize-y border border-blue-200 rounded-xl p-4 text-blue-950 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm shadow-sm"
            rows="3"
          />
          <button
            onClick={handleComment}
            disabled={loading || !newComment.trim()}
            className={`w-full mt-2 px-4 py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-xl ${
              loading || !newComment.trim()
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('posting')}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {t('postComment')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Список коментарів */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-blue-950 mb-3">
          {t('comments')} ({comments.length})
        </h4>
        
        {comments.length === 0 ? (
          <p className="text-blue-700 text-center py-4">{t('noComments') || 'Ще немає коментарів'}</p>
        ) : (
          <CommunityCommentList 
            comments={comments}
            currentUser={currentUser}
            onReply={setReplyCommentId}
            onEdit={handleEditComment}
            onDelete={handleDeleteComment}
            onReaction={handleCommentReaction}
            replyCommentId={replyCommentId}
            newReply={newReply}
            setNewReply={setNewReply}
            onPostReply={handleReply}
            onCancelReply={() => setReplyCommentId(null)}
            activeCommentMenu={activeCommentMenu}
            onToggleCommentMenu={toggleCommentMenu}
            formatTimeAgo={formatTimeAgo}
          />
        )}
      </div>

      {/* Модальне вікно редагування коментаря */}
      <EditCommunityCommentModal
        isOpen={isEditCommentModalOpen}
        onClose={() => setIsEditCommentModalOpen(false)}
        editCommentContent={editCommentContent}
        setEditCommentContent={setEditCommentContent}
        onUpdate={handleUpdateComment}
        loading={loading}
      />
    </div>
  );
};

export default CommunityCommentsSection;
