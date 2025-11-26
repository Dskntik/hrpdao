import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../utils/supabase';
import MainLayout from '../components/layout/MainLayout';
import { 
  FaSearch, 
  FaUser, 
  FaComment, 
  FaFileAlt, 
  FaMapMarkerAlt,
  FaClock,
  FaArrowLeft
} from 'react-icons/fa';
import { motion } from 'framer-motion';

function SearchResults() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [searchData, setSearchData] = useState({
    query: '',
    results: {
      posts: [],
      comments: [],
      users: []
    },
    country: null
  });

  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          setCurrentUser(profile ? { ...user, ...profile } : user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (location.state) {
      setSearchData({
        query: location.state.searchQuery,
        results: location.state.results,
        country: location.state.country
      });
      setLoading(false);
    } else {
      // Якщо немає даних пошуку, повертаємось назад
      navigate(-1);
    }
  }, [location.state, navigate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'щойно';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} хв тому`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} год тому`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} дн тому`;
    
    return formatDate(dateString);
  };

  const highlightText = (text, query) => {
    if (!text || !query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const totalResults = 
    searchData.results.posts.length + 
    searchData.results.comments.length + 
    searchData.results.users.length;

  if (loading) {
    return (
      <MainLayout currentUser={currentUser}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentUser={currentUser}>
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <FaArrowLeft className="text-gray-600 w-4 h-4" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Результати пошуку
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {totalResults} результатів для "
                    <span className="font-semibold text-blue-600">
                      {searchData.query}
                    </span>
                    "
                    {searchData.country && (
                      <span className="ml-2 text-sm text-gray-500">
                        у країні: {searchData.country}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FaSearch className="w-4 h-4" />
                <span>Пошук</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200">
              {[
                { id: 'all', label: 'Всі', count: totalResults },
                { id: 'posts', label: 'Пости', count: searchData.results.posts.length },
                { id: 'comments', label: 'Коментарі', count: searchData.results.comments.length },
                { id: 'users', label: 'Користувачі', count: searchData.results.users.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Results */}
          <div className="space-y-4">
            {/* Posts */}
            {(activeTab === 'all' || activeTab === 'posts') && searchData.results.posts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FaFileAlt className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Пости</h2>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                      {searchData.results.posts.length}
                    </span>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {searchData.results.posts.map((post, index) => (
                    <div key={post.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <FaClock className="w-3 h-3" />
                            <span>{getTimeAgo(post.created_at)}</span>
                          </div>
                          {post.country_code && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <FaMapMarkerAlt className="w-3 h-3" />
                              <span>{post.country_code}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-800 leading-relaxed mb-4">
                        {highlightText(post.content, searchData.query)}
                      </p>
                      
                      {post.media_url && (
                        <div className="mb-4">
                          <img 
                            src={post.media_url} 
                            alt="Post media" 
                            className="max-w-xs rounded-lg shadow-sm"
                          />
                        </div>
                      )}
                      
                      <Link
                        to={`/post/${post.id}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Перейти до посту →
                      </Link>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Comments */}
            {(activeTab === 'all' || activeTab === 'comments') && searchData.results.comments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FaComment className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Коментарі</h2>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                      {searchData.results.comments.length}
                    </span>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {searchData.results.comments.map((comment, index) => (
                    <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3 mb-3">
                        <img
                          src={comment.users?.profile_picture || '/default-avatar.png'}
                          alt={comment.users?.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {comment.users?.username || 'Анонім'}
                            </span>
                            <span className="text-sm text-gray-500">•</span>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <FaClock className="w-3 h-3" />
                              <span>{getTimeAgo(comment.created_at)}</span>
                            </div>
                          </div>
                          
                          <p className="text-gray-800 leading-relaxed mb-4">
                            {highlightText(comment.content, searchData.query)}
                          </p>
                          
                          {comment.posts && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <p className="text-sm text-gray-600 mb-1">
                                У пості: "{comment.posts.content?.substring(0, 100)}..."
                              </p>
                              <Link
                                to={`/post/${comment.posts.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Перейти до посту →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Users */}
            {(activeTab === 'all' || activeTab === 'users') && searchData.results.users.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <FaUser className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Користувачі</h2>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                      {searchData.results.users.length}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {searchData.results.users.map((user, index) => (
                    <Link
                      key={user.id}
                      to={`/public/${user.id}`}
                      className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <img
                        src={user.profile_picture || '/default-avatar.png'}
                        alt={user.username}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {highlightText(user.username, searchData.query)}
                        </h3>
                        {user.status && (
                          <p className="text-sm text-gray-600 truncate">{user.status}</p>
                        )}
                        {user.city && (
                          <p className="text-xs text-gray-500 truncate">
                            {user.city}, {user.country}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}

            {/* No Results */}
            {totalResults === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center"
              >
                <FaSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Нічого не знайдено
                </h3>
                <p className="text-gray-600 mb-6">
                  За запитом "{searchData.query}" не знайдено жодних результатів.
                  {searchData.country && ` у країні ${searchData.country}`}
                </p>
                <button
                  onClick={() => navigate(-1)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors"
                >
                  Повернутись назад
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default SearchResults;