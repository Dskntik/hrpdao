import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import MainLayout from "../components/layout/MainLayout";
import { supabase } from '../utils/supabase';

function Education() {
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error retrieving user:', authError);
          setLoading(false);
          return;
        }

        if (user) {
          // We get additional profile data from the database
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error loading profile:', profileError);
            // If the profile is not found, we use only data from auth
            setCurrentUser(user);
          } else {
            // Combining data from auth and profile
            setCurrentUser({ 
              ...user, 
              username: profile.username,
              profile_picture: profile.profile_picture,
              country: profile.country,
              city: profile.city,
              status: profile.status,
              bio: profile.bio,
              social_links: profile.social_links
            });
          }
        }
      } catch (err) {
        console.error('Error retrieving user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Add debug for verification
  console.log('Education currentUser:', currentUser);
  console.log('Education loading:', loading);

  const educationContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-8"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-8 text-center border border-blue-100 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v6l9-5m-9 5l-9-5m9 5v-6m0 6l-9-5" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-950">
              {t('educationCenter') || 'Education Center'}
            </h1>
          </div>
          
          {/* Main Description */}
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            {t('education.description') || 'The educational platform is currently under development.'}
          </p>

          {/* Coming Soon Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              {t('comingSoon') || 'Coming Soon'}
            </h3>
            <p className="text-blue-800">
              {t('education.comingSoonDescription') || 'Interactive courses, quizzes, and educational materials to help you become a knowledgeable human rights defender.'}
            </p>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {t('education.checkBack') || 'Check back soon for the launch of our comprehensive educational platform.'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout 
      currentUser={currentUser}
    >
      {educationContent}
    </MainLayout>
  );
}

export default Education;
