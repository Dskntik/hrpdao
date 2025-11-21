// hooks/useAuth.js
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../utils/supabase";
import { connectWallet } from "../utils/web3";

export const useAuth = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate referral code
  const generateReferralCode = () => {
    return `HR${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  };

  // Award referral bonus
  const awardReferralBonus = async (referrerId, referredUserId, points = 50, bonusType = 'onboarding') => {
    try {
      const pointsRecord = {
        user_id: referrerId,
        points: points,
        type: 'referral_bonus',
        description: `Referral bonus for ${referredUserId} - ${bonusType}`,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_points')
        .insert([pointsRecord]);

      if (error) throw error;

      console.log(`✓ Referral bonus awarded: ${points} points to ${referrerId}`);
      return true;
    } catch (error) {
      console.error('✗ Error awarding referral bonus:', error);
      return false;
    }
  };

  // Create or update user profile
  const createOrUpdateUserProfile = async (user, userData = {}) => {
    try {
      if (!user || !user.id) {
        throw new Error('User ID is required');
      }

      const profileData = {
        id: user.id,
        username: userData.username || user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
        email: user.email || '',
        phone: user.phone || userData.phone || '',
        country: userData.country || 'EARTH',
        profile_picture: user.user_metadata?.avatar_url || userData.profile_picture || '',
        bio: userData.bio || '',
        city: userData.city || '',
        status: userData.status || '',
        social_links: userData.social_links || {},
        settings: userData.settings || {},
        role: userData.role || 'user',
        wallet_address: userData.wallet_address || null,
        birth_date: userData.birthDate || null
      };

      let result;

      const updateResult = await supabase
        .from('users')
        .update(profileData)
        .eq('id', user.id);

      if (updateResult.error) {
        const newUserData = {
          ...profileData,
          created_at: new Date().toISOString(),
          referral_code: generateReferralCode(),
          referred_by: userData.referred_by || null
        };
        
        result = await supabase
          .from('users')
          .insert([newUserData]);
      } else {
        result = updateResult;
      }

      if (result.error) {
        console.error('Error creating/updating user profile:', result.error);
        return false;
      }

      console.log('✓ User profile created/updated successfully');
      return true;
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error);
      return false;
    }
  };

  // Process referral system
  const processReferral = async (referralCode, referredUserId) => {
    if (!referralCode || !referredUserId) return null;

    try {
      const { data: referrer, error } = await supabase
        .from('users')
        .select('id, username, country, referral_code')
        .eq('referral_code', referralCode)
        .maybeSingle();

      if (error || !referrer) {
        console.error('Invalid referral code:', error);
        return null;
      }

      if (referrer.id === referredUserId) {
        console.error('User cannot refer themselves');
        return null;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ referred_by: referrer.id })
        .eq('id', referredUserId);

      if (updateError) {
        console.error('Error updating referred_by:', updateError);
        return null;
      }

      await awardReferralBonus(referrer.id, referredUserId, 50, 'onboarding');
      console.log('🎁 Referral bonus awarded for onboarding');

      return referrer;
    } catch (error) {
      console.error('Error processing referral:', error);
      return null;
    }
  };

  // Google auth with referral support
  const handleGoogleAuth = async (referralCode = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (referralCode) {
        localStorage.setItem('pending_referral', referralCode);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });

      if (error) {
        setError(error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Google auth error:', err);
      setError(t('authError'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Phone auth with referral support
  const handlePhoneAuth = async (phone, referralCode = null, userData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (referralCode) {
        localStorage.setItem('pending_referral', referralCode);
      }

      if (userData.username || userData.country || userData.birthDate) {
        localStorage.setItem('pending_user_data', JSON.stringify(userData));
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          channel: 'sms',
          data: {
            username: userData.username,
            country: userData.country,
            birthDate: userData.birthDate
          }
        }
      });

      if (error) {
        setError(error.message);
        return false;
      }

      console.log('✓ OTP sent to phone');
      return true;
    } catch (err) {
      console.error('Phone auth error:', err);
      setError(t('authError'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet auth with referral support
  const handleWalletAuth = async (userData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const signer = await connectWallet();
      const address = await signer.getAddress();
      
      const walletEmail = `${address.toLowerCase()}@wallet.hrpdao.org`;
      
      const { data: { user: existingUser }, error: getUserError } = await supabase.auth.getUser();
      
      let currentUser = existingUser;

      if (!existingUser || getUserError) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: walletEmail,
          password: crypto.getRandomValues(new Uint8Array(32)).toString() + Math.random().toString(36).slice(2),
          options: {
            data: {
              wallet_address: address,
              is_wallet_user: true
            }
          }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            currentUser = { id: address, email: walletEmail };
          } else {
            throw signUpError;
          }
        } else {
          currentUser = authData.user;
        }
      }

      const success = await createOrUpdateUserProfile(currentUser, {
        ...userData,
        wallet_address: address,
        email: walletEmail
      });

      if (!success) {
        setError(t('profileUpdateError'));
        return false;
      }

      if (userData.referralCode) {
        await processReferral(userData.referralCode, currentUser.id);
      }

      console.log("✓ Wallet connected and profile updated:", address);
      return address;
    } catch (err) {
      console.error('Wallet auth error:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Main signup handler
  const handleSignup = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    const { loginInput, username, country, referralCode, password, birthDate } = userData;
    
    try {
      const isEmail = loginInput.includes("@");
      
      if (isEmail) {
        const { data, error } = await supabase.auth.signUp({
          email: loginInput,
          password: password,
          options: {
            data: {
              username: username,
              country: country,
              birthDate: birthDate
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered') || error.status === 422) {
            setError(t('userAlreadyExists'));
          } else {
            setError(error.message);
          }
          return false;
        }
        
        const userId = data?.user?.id;

        if (userId) {
          const profileSuccess = await createOrUpdateUserProfile(data.user, {
            username,
            country: country || "EARTH",
            birthDate: birthDate
          });

          if (!profileSuccess) {
            setError(t('profileCreationError'));
            return false;
          }

          if (referralCode) {
            await processReferral(referralCode, userId);
          }
        }

        console.log("✓ User registered successfully");
        return true;
      } else {
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: loginInput,
          options: {
            data: {
              username: username,
              country: country,
              birthDate: birthDate
            },
            channel: 'sms'
          }
        });

        if (error) {
          setError(error.message);
          return false;
        }

        console.log("✓ OTP sent successfully");
        return true;
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || t('authError'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Phone login (OTP)
  const handlePhoneLogin = async (phone) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          channel: 'sms'
        }
      });

      if (error) {
        setError(error.message);
        return false;
      }

      console.log("✓ OTP sent for login");
      return true;
    } catch (err) {
      console.error("Phone login error:", err);
      setError(err.message || t('authError'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password login
  const handleEmailLogin = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        setError(error.message);
        return false;
      }

      console.log("✓ Email login successful");
      return data.user;
    } catch (err) {
      console.error("Email login error:", err);
      setError(err.message || t('authError'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (phone, token) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms'
      });

      if (error) {
        setError(error.message);
        return false;
      }

      console.log("✓ OTP verified successfully");
      
      const pendingUserData = localStorage.getItem('pending_user_data');
      const pendingReferral = localStorage.getItem('pending_referral');
      
      if (data.user) {
        let userData = {};
        
        if (pendingUserData) {
          userData = JSON.parse(pendingUserData);
          localStorage.removeItem('pending_user_data');
        }
        
        await createOrUpdateUserProfile(data.user, userData);
        
        if (pendingReferral) {
          await processReferral(pendingReferral, data.user.id);
          localStorage.removeItem('pending_referral');
        }
      }
      
      return data.user;
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.message || t('authError'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Complete OAuth signup
  const completeOAuthSignup = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        return false;
      }

      const pendingReferral = localStorage.getItem('pending_referral');
      
      await createOrUpdateUserProfile(session.user);

      if (pendingReferral) {
        await processReferral(pendingReferral, session.user.id);
        localStorage.removeItem('pending_referral');
      }

      return true;
    } catch (error) {
      console.error('Error completing OAuth signup:', error);
      return false;
    }
  };

  return {
    // Methods
    handleSignup,
    handleGoogleAuth,
    handlePhoneAuth,
    handleWalletAuth,
    handlePhoneLogin,
    handleEmailLogin,
    verifyOTP,
    createOrUpdateUserProfile,
    awardReferralBonus,
    generateReferralCode,
    processReferral,
    completeOAuthSignup,
    
    // State
    isLoading,
    error,
    setError,
    clearError: () => setError(null)
  };
};