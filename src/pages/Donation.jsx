import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import MainLayout from '../components/layout/MainLayout';

// Lucide Icons
import { 
  Heart,
  Check, 
  Bitcoin,
  CreditCard,
  Coins
} from 'lucide-react';

function Donation() {
  const { t } = useTranslation();
  const [success, setSuccess] = useState(false);
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
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('username, profile_picture, country, city, status, bio, social_links')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error loading profile:', profileError);
            setCurrentUser(user);
          } else {
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

  console.log('Donation currentUser:', currentUser);
  console.log('Donation loading:', loading);

  const handleCopyAddress = (address, type) => {
    navigator.clipboard.writeText(address);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const donationContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-8"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-8 border border-blue-100 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-red-100 p-3 rounded-full">
              <Heart className="w-8 h-8 text-red-600" fill="currentColor" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-950">
              {t('donationCenter') || 'Donation Center'}
            </h1>
          </div>

          <div className="relative z-10">
            <p className="text-center mt-2 mb-4 text-blue-950 text-sm opacity-80">
              {t('donationDescription') || 'Your support helps us continue the fight for human rights'}
            </p>
            
            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-950 text-center">
                {t('donationDetails') || 'Donation details'}
              </h3>
              
              {success && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-green-50 text-green-800 rounded-full border border-green-100 flex items-start gap-3 shadow-sm"
                >
                  <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{t('copiedToClipboard') || 'Address copied!'}</p>
                    <p className="text-sm mt-1 text-green-700 opacity-90">{t('thankYouForDonation') || 'Thank you for your support!'}</p>
                  </div>
                </motion.div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-950 mb-1.5">
                    {t('bitcoin') || 'Bitcoin'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
                      readOnly
                      className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm pr-12"
                    />
                    <button
                      onClick={() => handleCopyAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'bitcoin')}
                      className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      aria-label={t('copyAddress') || 'Copy address'}
                    >
                      <Bitcoin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-950 mb-1.5">
                    {t('ethereum') || 'Ethereum'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                      readOnly
                      className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm pr-12"
                    />
                    <button
                      onClick={() => handleCopyAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 'ethereum')}
                      className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      aria-label={t('copyAddress') || 'Copy address'}
                    >
                      <Coins className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-950 mb-1.5">
                    {t('bankCard') || 'Bank card'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="5375 4141 0909 8080"
                      readOnly
                      className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm pr-12"
                    />
                    <button
                      onClick={() => handleCopyAddress('5375 4141 0909 8080', 'card')}
                      className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      aria-label={t('copyAddress') || 'Copy address'}
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-950 mb-1.5">
                    {t('paypal') || 'PayPal'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="donate@humanrightsworld.org"
                      readOnly
                      className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm pr-12"
                    />
                    <button
                      onClick={() => handleCopyAddress('donate@humanrightsworld.org', 'paypal')}
                      className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                      aria-label={t('copyAddress') || 'Copy address'}
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <p className="text-center mt-4 text-sm text-blue-700 opacity-80">
                {t('donationNote') || 'Choose a donation method that is convenient for you. Thank you for your support!'}
              </p>

              {/* Footer Note */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {t('donation.thankYouMessage') || 'Every donation helps us protect human rights around the world.'}
                </p>
              </div>
            </div>
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
      {donationContent}
    </MainLayout>
  );
}

export default Donation;
