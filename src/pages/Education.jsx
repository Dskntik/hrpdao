// Education.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import MainLayout from "../components/layout/MainLayout";
import { supabase } from '../utils/supabase';
import { useDailyTest } from '../hooks/useDailyTest';
import { useUserStats } from '../hooks/useUserStats';
import { FaCheck, FaTimes, FaCalendar, FaRedo, FaTrophy, FaBook, FaFire, FaShareAlt, FaInstagram, FaFacebook, FaTwitter, FaChartBar, FaChartLine, FaCrown, FaArrowLeft } from "react-icons/fa";
import SocialShare from '../components/SocialShare';
import Courses from '../components/Courses';
import { 
  PointsSystemModal, 
  StreakBonusModal, 
  LeaderboardModal, 
  PointsHistoryModal 
} from '../components/EducationModals';

function Education() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily-test');
  
  // New states for modals
  const [showPointsSystemModal, setShowPointsSystemModal] = useState(false);
  const [showStreakBonusModal, setShowStreakBonusModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showPointsHistoryModal, setShowPointsHistoryModal] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Using hook for daily tests
  const {
    dailyTest,
    userAnswers,
    testCompleted,
    testResult,
    canTakeTest,
    lastTestDate,
    submitting,
    handleAnswerSelect,
    submitTest,
    retryTest,
    generateDailyTest,
    allQuestionsAnswered
  } = useDailyTest(currentUser);

  // Using large hook for user statistics
  const {
    userStats,
    streakBonuses,
    nextStreakBonus,
    pointsHistory,
    loading: statsLoading,
    awardStreakBonus,
    refreshStats,
    loadPointsHistory
  } = useUserStats(currentUser);

  console.log('🔍 Education component state:', {
    currentUser: !!currentUser,
    activeTab,
    userStats,
    loading
  });

  // Function to load leaderboard
  const loadLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      
      // First get all records from user_points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, points, type, created_at')
        .order('created_at', { ascending: false });

      if (pointsError) {
        console.error('❌ Error loading points data:', pointsError);
        return;
      }

      // Get unique users
      const uniqueUserIds = [...new Set(pointsData.map(record => record.user_id))];
      
      // Load user information
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, profile_picture')
        .in('id', uniqueUserIds);

      if (usersError) {
        console.error('❌ Error loading users data:', usersError);
        return;
      }

      // Create user map for quick access
      const usersMap = {};
      usersData.forEach(user => {
        usersMap[user.id] = user;
      });

      // Group by users and calculate total points
      const userPointsMap = {};
      
      pointsData.forEach(record => {
        if (!userPointsMap[record.user_id]) {
          userPointsMap[record.user_id] = {
            user_id: record.user_id,
            username: usersMap[record.user_id]?.username || 'Anonymous',
            profile_picture: usersMap[record.user_id]?.profile_picture,
            total_points: 0,
            perfect_scores: 0
          };
        }
        userPointsMap[record.user_id].total_points += record.points;
        
        // Count perfect results
        if (record.type === 'daily_test' && record.points === 120) {
          userPointsMap[record.user_id].perfect_scores += 1;
        }
      });

      // Convert to array and sort
      const leaderboard = Object.values(userPointsMap)
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, 20); // Top 20

      setLeaderboardData(leaderboard);
      
    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Function to update statistics after test
  const handleTestCompletion = async () => {
    await refreshStats();
  };
  
  // Function to check streak bonus
  const handleStreakBonusCheck = async () => {
    if (nextStreakBonus) {
      console.log('🎁 Checking for streak bonus after test completion...');
      await awardStreakBonus(nextStreakBonus);
    }
  };
  
  // Test submission handler with all necessary callbacks
  const handleSubmitTest = async () => {
    try {
      await submitTest(handleTestCompletion, handleStreakBonusCheck);
    } catch (error) {
      alert(error.message);
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching current user...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('❌ Error retrieving user:', authError);
          setLoading(false);
          return;
        }

        if (user) {
          console.log('✅ User found:', user.id);
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.log('ℹ️ No profile found, using basic user data');
            setCurrentUser(user);
          } else {
            const userData = { 
              ...user, 
              username: profile.username,
              profile_picture: profile.profile_picture,
              country: profile.country,
              city: profile.city,
              status: profile.status,
              bio: profile.bio,
              social_links: profile.social_links
            };
            
            setCurrentUser(userData);
          }
        } else {
          console.log('❌ No user found');
        }
      } catch (err) {
        console.error('❌ Error retrieving user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Statistics click handlers
  const handleTestsCompletedClick = () => {
    setShowPointsSystemModal(true);
  };

  const handleDayStreakClick = () => {
    setShowStreakBonusModal(true);
  };

  const handlePerfectScoresClick = async () => {
    setShowLeaderboardModal(true);
    await loadLeaderboard();
  };

  const handleTotalPointsClick = async () => {
    setShowPointsHistoryModal(true);
    if (currentUser) {
      await loadPointsHistory(currentUser.id);
    }
  };

  const renderDailyTest = () => {
    if (!dailyTest) {
      return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading test...</p>
        </div>
      );
    }

    if (testCompleted) {
      const showStreakBonus = nextStreakBonus && testResult.passed;
      
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
        >
          <div className="text-center">
            {testResult.passed ? (
              <>
                <div className="text-green-500 text-6xl mb-4">
                  <FaTrophy />
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-4">
                  Day {testResult.day} Completed!
                </h3>
                
                {/* Main test points */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-2xl mb-4 max-w-md mx-auto">
                  <div className="text-3xl font-bold mb-2">Test Completed Successfully!</div>
                  <div className="text-lg">
                    {testResult.correctAnswers}/10 Correct Answers
                  </div>
                </div>

                {/* Streak bonus if available */}
                {showStreakBonus && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-2xl mb-4 max-w-md mx-auto"
                  >
                    <div className="flex items-center justify-center mb-2">
                      <FaFire className="text-2xl mr-2" />
                      <div className="text-xl font-bold">Streak Bonus Unlocked!</div>
                    </div>
                    <div className="text-2xl font-bold mb-1">Congratulations!</div>
                    <div className="text-sm opacity-90">
                      {userStats.currentStreak} day streak achievement!
                    </div>
                  </motion.div>
                )}

                <p className="text-gray-600 mb-6">
                  Great job! You've successfully completed today's test.
                  {showStreakBonus && ` You've maintained a ${userStats.currentStreak} day streak!`}
                  Come back tomorrow for Day {testResult.day + 1}!
                </p>
              </>
            ) : (
              <>
                <div className="text-red-500 text-6xl mb-4">
                  <FaTimes />
                </div>
                <h3 className="text-2xl font-bold text-red-600 mb-4">
                  Test Not Passed
                </h3>
                <div className="bg-red-100 border border-red-300 p-6 rounded-2xl mb-6 max-w-md mx-auto">
                  <div className="text-xl font-bold text-red-700 mb-2">
                    {testResult.correctAnswers}/10 Correct Answers
                  </div>
                  <p className="text-red-600">
                    You need at least 6 correct answers to pass.
                  </p>
                </div>
                <button
                  onClick={retryTest}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-3 rounded-full hover:from-blue-700 hover:to-blue-600 transition-all transform hover:scale-105 font-semibold flex items-center mx-auto"
                >
                  <FaRedo className="mr-2" />
                  Try Again
                </button>
              </>
            )}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-blue-950">
              Daily Test - Day {dailyTest.day}
            </h2>
            <p className="text-gray-600">
              Progress: {dailyTest.day} of {dailyTest.totalDays} days
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 px-3 py-1 rounded-full text-blue-700 font-semibold">
              <FaCalendar className="inline mr-1" />
              {new Date().toLocaleDateString()}
            </div>
            {userStats.currentStreak > 0 && (
              <div className="bg-orange-100 px-3 py-1 rounded-full text-orange-700 font-semibold flex items-center">
                <FaFire className="inline mr-1" />
                {userStats.currentStreak} day streak
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {dailyTest.questions.map((question, questionIndex) => (
            <div key={questionIndex} className="border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-blue-950 flex items-start flex-1">
                  <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3 flex-shrink-0">
                    {questionIndex + 1}
                  </span>
                  {question.question}
                </h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0">
                  {question.article}
                </span>
              </div>
              <div className="grid gap-3 ml-11">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={`flex items-center space-x-4 p-3 rounded-lg cursor-pointer transition-all ${
                      userAnswers[questionIndex] === optionIndex
                        ? "bg-blue-50 border-2 border-blue-300"
                        : "bg-white border-2 border-gray-200 hover:border-blue-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        userAnswers[questionIndex] === optionIndex
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-400"
                      }`}
                    >
                      {userAnswers[questionIndex] === optionIndex && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <input
                      type="radio"
                      name={`question-${questionIndex}`}
                      value={optionIndex}
                      checked={userAnswers[questionIndex] === optionIndex}
                      onChange={() => handleAnswerSelect(questionIndex, optionIndex)}
                      className="hidden"
                    />
                    <span className="text-gray-700 flex-1">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleSubmitTest}
            disabled={!allQuestionsAnswered || submitting}
            className={`px-8 py-4 rounded-full text-lg font-bold transition-all transform ${
              allQuestionsAnswered && !submitting
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 hover:scale-105 shadow-md"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
          <p className="text-sm text-gray-500 mt-4">
            {userAnswers.filter(answer => answer !== null).length}/{dailyTest.questions.length} questions answered
          </p>
        </div>
      </motion.div>
    );
  };

  const renderResources = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center"
    >
      <h3 className="text-xl font-bold text-blue-950 mb-2">Learning Resources</h3>
      <p className="text-gray-600 mb-4">Documents, videos, and reference materials</p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-yellow-700">Under Development - Extensive resource library</p>
      </div>
    </motion.div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'daily-test':
        return canTakeTest ? renderDailyTest() : (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center">
            <FaCalendar className="text-4xl text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-blue-950 mb-2">Test Already Completed</h3>
            <p className="text-gray-600 mb-4">
              You've completed today's test. Come back tomorrow for a new challenge!
            </p>
            {lastTestDate && (
              <p className="text-sm text-gray-500">
                Last test: {new Date(lastTestDate).toLocaleDateString()}
              </p>
            )}
            {dailyTest && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-blue-700">
                  Next test: Day {dailyTest.day} available tomorrow
                </p>
              </div>
            )}
          </div>
        );
      case 'courses':
        return <Courses currentUser={currentUser} />;
      case 'resources':
        return renderResources();
      case 'social':
        return (
          <SocialShare 
            currentUser={currentUser} 
          />
        );
      default:
        return null;
    }
  };

  const renderEducationContent = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-8"
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-8 border border-blue-100 backdrop-blur-sm mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <FaBook className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-950">
              Human Rights Education Center
            </h1>
          </div>
          
          <p className="text-lg text-gray-700 text-center mb-6 max-w-2xl mx-auto leading-relaxed">
            Expand your knowledge of human rights through daily tests, courses, and resources.
          </p>

          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div 
              onClick={handleTotalPointsClick}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:bg-blue-100 transition-all hover:scale-105"
            >
              <FaChartLine className="text-blue-500 text-2xl mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{userStats.totalPoints}</div>
              <div className="text-sm text-blue-700">Learning Progress</div>
            </div>
            <div 
              onClick={handleTestsCompletedClick}
              className="bg-green-50 border border-green-200 rounded-xl p-4 text-center cursor-pointer hover:bg-green-100 transition-all hover:scale-105"
            >
              <FaCheck className="text-green-500 text-2xl mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{userStats.testsCompleted}</div>
              <div className="text-sm text-green-700">Tests Completed</div>
            </div>
            <div 
              onClick={handlePerfectScoresClick}
              className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center cursor-pointer hover:bg-purple-100 transition-all hover:scale-105"
            >
              <FaTrophy className="text-purple-500 text-2xl mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">{userStats.perfectScores}</div>
              <div className="text-sm text-purple-700">Perfect Scores</div>
            </div>
            <div 
              onClick={handleDayStreakClick}
              className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center cursor-pointer hover:bg-orange-100 transition-all hover:scale-105"
            >
              <FaFire className="text-orange-500 text-2xl mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-900">{userStats.currentStreak}</div>
              <div className="text-sm text-orange-700">Day Streak</div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('daily-test')}
              className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'daily-test'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaBook />
              Daily Tests
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'courses'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaBook />
              Courses
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'resources'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaBook />
              Resources
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'social'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaShareAlt />
              Share
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Modal windows */}
      <PointsSystemModal 
        isOpen={showPointsSystemModal} 
        onClose={() => setShowPointsSystemModal(false)} 
      />
      <StreakBonusModal 
        isOpen={showStreakBonusModal} 
        onClose={() => setShowStreakBonusModal(false)}
        streakBonuses={streakBonuses}
        nextStreakBonus={nextStreakBonus}
        userStats={userStats}
      />
      <LeaderboardModal 
        isOpen={showLeaderboardModal} 
        onClose={() => setShowLeaderboardModal(false)}
        leaderboardData={leaderboardData}
        loadingLeaderboard={loadingLeaderboard}
      />
      <PointsHistoryModal 
        isOpen={showPointsHistoryModal} 
        onClose={() => setShowPointsHistoryModal(false)}
        pointsHistory={pointsHistory}
        userStats={userStats}
      />
    </motion.div>
  );

  if (loading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout currentUser={currentUser}>
      {renderEducationContent()}
    </MainLayout>
  );
}

export default Education;