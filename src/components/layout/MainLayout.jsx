// src/components/layout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar'; 
import RightSidebar from '../RightSidebar';
import MobileLayout from './MobileLayout';
import CreatePostModal from '../CreatePostModal';

function MainLayout({ 
  children, 
  currentUser, // ОТРИМУЄМО currentUser
  showRightSidebar = true
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1023);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostMedia, setNewPostMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [createPostError, setCreatePostError] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1023);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCreatePost = () => {
    setShowCreateModal(true);
  };

  // Додаємо лог для дебагу
  console.log('MainLayout currentUser:', currentUser);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex flex-col">
      {/* ПЕРЕДАЄМО currentUser в Navbar */}
      <Navbar 
        currentUser={currentUser} // ВАЖЛИВО: передаємо currentUser
        onToggleSidebar={() => setIsSidebarOpen(true)}
        onToggleSearch={() => setIsSearchVisible(!isSearchVisible)}
        onShowCreateModal={handleCreatePost}
        isMobile={isMobile}
      />
      
      {/* Mobile Version */}
      {isMobile ? (
        <MobileLayout
          currentUser={currentUser} // ПЕРЕДАЄМО в MobileLayout
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onShowCreateModal={handleCreatePost}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isSearchVisible={isSearchVisible}
          setIsSearchVisible={setIsSearchVisible}
        >
          {children}
        </MobileLayout>
      ) : (
        /* Desktop Version */
        <div className="w-full mx-auto px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 mt-2 sm:mt-4">
          {/* Left Sidebar - ТУТ ВІДОБРАЖАЄТЬСЯ ІНФОРМАЦІЯ ПРО КОРИСТУВАЧА */}
          <div className="lg:col-span-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            <Sidebar 
              currentUser={currentUser} 
              onShowCreateModal={handleCreatePost} 
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            {children}
          </div>

          {/* Right Sidebar */}
          {showRightSidebar && (
            <div className="lg:col-span-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              <RightSidebar currentUser={currentUser} />
            </div>
          )}
        </div>
      )}

      {/* Post creation modal */}
      {showCreateModal && (
        <CreatePostModal
          showCreateModal={showCreateModal}
          setShowCreateModal={setShowCreateModal}
          newPostContent={newPostContent}
          setNewPostContent={setNewPostContent}
          newPostMedia={newPostMedia}
          setNewPostMedia={setNewPostMedia}
          mediaPreview={mediaPreview}
          setMediaPreview={setMediaPreview}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          error={createPostError}
          setError={setCreatePostError}
          loading={createPostLoading}
          setLoading={setCreatePostLoading}
          currentUser={currentUser} // ПЕРЕДАЄМО в модалку
        />
      )}
    </div>
  );
}

export default MainLayout;
