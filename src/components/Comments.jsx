// Comments.jsx
import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageSquare, Share, Repeat, Bookmark, MoreVertical, Edit, Trash2, UserPlus, UserMinus, CheckCircle, XCircle, Eye, Coins } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';

import { useComments } from '../hooks/useComments';
import MainLayout from '../components/layout/MainLayout';
import CommentList from '../components/CommentList';
import EditPostModal from '../components/EditPostModal';
import countries from '../utils/countries';

function Comments() {
  const { t, i18n } = useTranslation();
  const {
    // States
    post,
    comments,
    newComment,
    currentUser,
    error,
    loading,
    editCommentContent,
    isEditCommentModalOpen,
    replyCommentId,
    newReply,
    isEditPostModalOpen,
    editPostContent,
    editPostMedia,
    editMediaPreview,
    followStatus,
    activeMenu,
    activeCommentMenu,
    userPoints,
    
    // Setters
    setNewComment,
    setEditCommentContent,
    setIsEditCommentModalOpen,
    setReplyCommentId,
    setNewReply,
    setIsEditPostModalOpen,
    setEditPostContent,
    setEditPostMedia,
    setEditMediaPreview,
    
    // Functions
    toggleMenu,
    toggleCommentMenu,
    handleFollow,
    handleRepost,
    handleEditPost,
    handleUpdatePost,
    handleDeletePost,
    handleComment,
    handleReply,
    handleDeleteComment,
    handleEditComment,
    handleUpdateComment,
    handleCommentReaction,
    handleReaction,
    handleShare,
    handleSave,
  } = useComments();

  // Loading, Error, and No Post states
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return <div className="p-4 text-red-500">{t('error')}: {error}</div>;
  if (!post) return <div className="p-4">{t('noPost')}</div>;

  return (
    <MainLayout currentUser={currentUser}>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        {/* Post */}
        <div className="bg-white p-4 rounded-lg shadow-md relative mb-6">
          {currentUser?.id === post.user_id && (
            <div className="absolute top-2 right-2 menu-container">
              <button
                onClick={() => toggleMenu(post.id)}
                className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                aria-label={t('postOptions')}
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </button>
              
              {activeMenu === post.id && (
                <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]">
                  <button
                    onClick={() => handleEditPost(post)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    aria-label={t('editPost')}
                  >
                    <Edit className="h-4 w-4" />
                    <span>{t('edit')}</span>
                  </button>
                  <button
                    onClick={() => handleDeletePost()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    aria-label={t('deletePost')}
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
              src={post.users?.profile_picture || 'https://placehold.co/40x40'}
              alt={t('profilePicture')}
              className="w-10 h-10 rounded-full mr-2"
            />
            <div>
              <div className="flex items-center">
                <p className="font-bold">{post.users?.username || t('anonymous')}</p>
                {currentUser?.id !== post.user_id && (
                  <button
                    onClick={() => handleFollow(post.user_id)}
                    className={`ml-2 flex items-center text-xs transition-colors ${
                      followStatus[post.user_id] ? 'text-gray-500 hover:text-gray-600' : 'text-blue-500 hover:text-blue-600'
                    }`}
                    aria-label={followStatus[post.user_id] ? t('unfollow') : t('follow')}
                  >
                    {followStatus[post.user_id] ? (
                      <>
                        <UserMinus className="h-3 w-3 mr-1" /> {t('unfollow')}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" /> {t('follow')}
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {post.users?.country 
                  ? countries.find(c => c.code === post.users.country)?.name[i18n.language] || t('unknown')
                  : t('unknown')} • {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <p>{post.content}</p>
          {post.media_url && (
            post.media_type === 'image' ? (
              <img src={post.media_url} alt={t('postMedia')} className="w-full mt-2 rounded-lg" />
            ) : (
              <video src={post.media_url} controls className="w-full mt-2 rounded-lg" aria-label={t('postMedia')} />
            )
          )}
          <div className="flex flex-wrap justify-between items-center mt-4">
            {/* Left side - reactions */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => handleReaction(post.id, 'true')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  post.reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'true')
                    ? 'text-green-700 bg-green-100 font-semibold'
                    : 'text-green-600 hover:bg-green-100'
                }`}
                aria-label={`${t('true')} ${t('reaction')}`}
              >
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {t('true')} {post.reactions?.filter((r) => r.reaction_type === 'true').length || 0}
                </span>
              </button>
              <button
                onClick={() => handleReaction(post.id, 'false')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  post.reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'false')
                    ? 'text-red-700 bg-red-100 font-semibold'
                    : 'text-red-600 hover:bg-red-100'
                }`}
                aria-label={`${t('false')} ${t('reaction')}`}
              >
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {t('false')} {post.reactions?.filter((r) => r.reaction_type === 'false').length || 0}
                </span>
              </button>
              <button
                onClick={() => handleReaction(post.id, 'notice')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  post.reactions?.some((r) => r.user_id === currentUser?.id && r.reaction_type === 'notice')
                    ? 'text-blue-700 bg-blue-100 font-semibold'
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
                aria-label={`${t('notice')} ${t('reaction')}`}
              >
                <Eye className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {t('notice')} {post.reactions?.filter((r) => r.reaction_type === 'notice').length || 0}
                </span>
              </button>
            </div>

            {/* Right side - other actions */}
            <div className="flex flex-wrap gap-2">
              <button
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors"
                aria-label={t('comment')}
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-medium">{post.comments?.count || 0}</span>
              </button>
              <button
                onClick={() => handleShare()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                aria-label={t('share')}
              >
                <Share className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleRepost()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                aria-label={t('repost')}
              >
                <Repeat className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleSave()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
                aria-label={t('save')}
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* New Comment Input */}
        {currentUser && (
          <div>
            {/* Відображення поінтів користувача */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              <div className="flex justify-between items-center">
                <span className="text-blue-700">
                  {t('availablePoints') || 'Доступно поінтів'}: 
                  <span className="font-semibold ml-1">{userPoints}</span>
                </span>
                <span className="text-red-600 font-semibold">
                  {t('comment.cost') || 'Вартість коментаря'}: 2 {t('points') || 'поінти'}
                </span>
              </div>
              {userPoints < 2 && (
                <div className="mt-2 text-sm text-red-600">
                  {t('insufficientPointsForComment') || 'Для створення коментаря потрібно мінімум 2 поінти. Ви можете отримати поінти, виконуючи щоденні тести та інші активності.'}
                </div>
              )}
            </div>

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('newCommentPlaceholder')}
              className="w-full resize-y border border-gray-300 rounded-md p-2 mb-2 text-sm"
              rows="3"
              aria-label={t('newCommentPlaceholder')}
            />
            <button
              onClick={handleComment}
              disabled={loading || userPoints < 2}
              className={`w-full px-4 py-3 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-xl ${
                loading || userPoints < 2
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800'
              }`}
              aria-label={t('postComment')}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('posting')}
                </>
              ) : userPoints < 2 ? (
                <>
                  <Coins className="w-4 h-4" />
                  {t('insufficientPointsForComment') || 'Недостатньо поінтів'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t('postComment')} (2 {t('points') || 'поінти'})
                </>
              )}
            </button>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            {t('comments')} ({comments.length})
          </h3>
          
          {comments.filter(comment => !comment.parent_comment_id).length === 0 ? (
            <p className="text-gray-500 text-center py-4">{t('noComments')}</p>
          ) : (
            <CommentList 
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
              userPoints={userPoints}
            />
          )}
        </div>
      </div>

      {/* Edit Comment Modal */}
      <Transition appear show={isEditCommentModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsEditCommentModalOpen(false)}>
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
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {t('editComment')}
                  </Dialog.Title>
                  <div className="mt-2">
                    <textarea
                      value={editCommentContent}
                      onChange={(e) => setEditCommentContent(e.target.value)}
                      className="w-full resize-y border border-gray-300 rounded-md p-2 text-sm"
                      rows="4"
                      aria-label={t('editComment')}
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={handleUpdateComment}
                    >
                      {t('save')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsEditCommentModalOpen(false)}
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

      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={isEditPostModalOpen}
        onClose={() => setIsEditPostModalOpen(false)}
        editPostContent={editPostContent}
        setEditPostContent={setEditPostContent}
        editPostMedia={editPostMedia}
        setEditPostMedia={setEditPostMedia}
        editMediaPreview={editMediaPreview}
        setEditMediaPreview={setEditMediaPreview}
        handleUpdatePost={handleUpdatePost}
        loading={loading}
      />
    </MainLayout>
  );
}

export default Comments;