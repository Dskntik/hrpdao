// hooks/useAuth.js - БЕЗ реферальної програми (працює як оригінал)
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../utils/supabase";
import { 
  connectWalletUniversal, 
  initWeb3AuthOptional, 
  isWeb3Available,
  getWalletAddress,
  getWeb3UserData,
  disconnectWallet,
  isValidEthereumAddress
} from "../utils/web3auth";

export const useAuth = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [web3User, setWeb3User] = useState(null);
  const [web3Initialized, setWeb3Initialized] = useState(false);

  // Ініціалізація при завантаженні
  useEffect(() => {
    const initializeWeb3 = async () => {
      try {
        await initWeb3AuthOptional();
        setWeb3Initialized(true);
        
        // Перевіряємо збережені дані гаманця
        const savedAddress = getWalletAddress();
        const savedUserData = getWeb3UserData();
        
        if (savedAddress && isValidEthereumAddress(savedAddress) && savedUserData) {
          setWeb3User(savedUserData);
        } else if (savedAddress && !isValidEthereumAddress(savedAddress)) {
          console.warn('Invalid stored wallet address, clearing...');
          disconnectWallet();
        }
      } catch (error) {
        console.warn("Web3 initialization warning:", error);
        setWeb3Initialized(true);
      }
    };
    
    initializeWeb3();
  }, []);

  // Створення/оновлення профілю користувача
  const createOrUpdateUserProfile = async (user, userData = {}) => {
    try {
      if (!user || !user.id) {
        throw new Error('User ID is required');
      }

      const phoneValue = user.phone || userData.phone;
      const processedPhone = phoneValue === "" ? null : phoneValue;

      const profileData = {
        id: user.id,
        username: userData.username || user.user_metadata?.username || `user_${user.id.slice(0, 8)}`,
        email: user.email || userData.email || '',
        phone: processedPhone || null,
        country: userData.country || 'EARTH',
        profile_picture: user.user_metadata?.avatar_url || userData.profile_picture || null,
        bio: userData.bio || null,
        city: userData.city || null,
        status: userData.status || null,
        social_links: userData.social_links || {},
        settings: userData.settings || {},
        role: userData.role || 'user',
        wallet_address: userData.wallet_address || null,
        birth_date: userData.birthDate || null,
        is_web3_user: userData.wallet_address ? true : false
      };

      // Перевіряємо, чи існує користувач
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      let result;

      if (existingUser) {
        // Оновлюємо існуючий запис
        result = await supabase
          .from('users')
          .update(profileData)
          .eq('id', user.id);
      } else {
        // Створюємо новий запис (БЕЗ referral_code та referred_by)
        const newUserData = {
          ...profileData,
          created_at: new Date().toISOString()
        };
        
        result = await supabase
          .from('users')
          .insert([newUserData]);
      }

      if (result.error) {
        console.error('Error creating/updating user profile:', result.error);
        return false;
      }

      console.log('✅ User profile created/updated successfully');
      return true;
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error);
      return false;
    }
  };

  // Web3 автентифікація
  const handleWalletAuth = async (userData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Starting Web3 authentication...");

      // Перевіряємо доступність Web3
      if (!isWeb3Available()) {
        throw new Error(
          t('noWeb3Wallet') || 'Web3 wallet not found. Please install MetaMask or use email/phone login.'
        );
      }

      let connectionResult;
      
      try {
        connectionResult = await connectWalletUniversal();
      } catch (connectionError) {
        console.error("❌ Web3 connection failed:", connectionError);
        throw new Error(
          connectionError.message || t('walletConnectionFailed') || 'Failed to connect wallet. Please try again or use other login methods.'
        );
      }

      const { address } = connectionResult;
      
      if (!address || !isValidEthereumAddress(address)) {
        throw new Error("Invalid wallet address");
      }

      const normalizedAddress = address.toLowerCase();
      console.log("✅ Wallet connected:", normalizedAddress);

      // Перевіряємо, чи існує користувач з цією адресою
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', normalizedAddress)
        .maybeSingle();

      if (userCheckError) {
        console.error("Database error checking user:", userCheckError);
        throw new Error('Database error. Please try again later.');
      }

      let userId;

      if (existingUser) {
        // Користувач вже існує
        console.log("✅ Existing Web3 user found:", existingUser.id);
        userId = existingUser.id;
        
        // Оновлюємо дані користувача якщо надано
        if (userData.username || userData.country) {
          const updateData = {};
          if (userData.username) updateData.username = userData.username;
          if (userData.country) updateData.country = userData.country;
          if (userData.birthDate) updateData.birth_date = userData.birthDate;

          const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', existingUser.id);

          if (updateError) {
            console.error("Error updating user:", updateError);
          }
        }
      } else {
        // Створюємо нового користувача
        console.log("🔄 Creating new Web3 user...");
        
        userId = crypto.randomUUID();
        
        const profileData = {
          id: userId,
          username: userData.username || `user_${normalizedAddress.slice(2, 10)}`,
          email: `${normalizedAddress}@web3.hrpdao.org`,
          wallet_address: normalizedAddress,
          country: userData.country || 'EARTH',
          profile_picture: null,
          bio: null,
          city: null,
          status: 'active',
          social_links: {},
          settings: {},
          role: 'user',
          birth_date: userData.birthDate || null,
          created_at: new Date().toISOString(),
          is_web3_user: true,
          onboarding_completed: false
          // БЕЗ referral_code та referred_by
        };

        const { data: newUser, error: profileError } = await supabase
          .from('users')
          .insert([profileData])
          .select()
          .single();

        if (profileError) {
          console.error("❌ Profile creation failed:", profileError);
          throw new Error(profileError.message || 'Failed to create user profile');
        }

        console.log("✅ New Web3 user created:", newUser.id);
      }

      // Зберігаємо дані в localStorage
      const userDataToStore = {
        id: userId,
        address: normalizedAddress,
        username: userData.username || `user_${normalizedAddress.slice(2, 10)}`,
        email: `${normalizedAddress}@web3.hrpdao.org`,
        isWeb3User: true,
        ...userData
      };

      localStorage.setItem('web3_user_data', JSON.stringify(userDataToStore));
      localStorage.setItem('wallet_address', normalizedAddress);
      localStorage.setItem('wallet_user_data', JSON.stringify(userDataToStore)); // legacy support
      setWeb3User(userDataToStore);

      console.log("✅ Web3 authentication completed successfully");
      return normalizedAddress;

    } catch (err) {
      console.error("❌ Web3 auth error:", err);
      
      // Специфічні повідомлення про помилки
      if (err.message.includes('rejected')) {
        setError(t('connectionRejected') || 'Connection request was rejected');
      } else if (err.message.includes('not found')) {
        setError(t('noWeb3Wallet') || 'Web3 wallet not found. Please install MetaMask.');
      } else if (err.message.includes('Invalid')) {
        setError(t('invalidWallet') || 'Invalid wallet address');
      } else {
        setError(err.message || t('walletError') || 'Wallet connection failed');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Google автентифікація (БЕЗ referralCode, але backwards compatible)
  const handleGoogleAuth = async (referralCode = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // referralCode ігнорується
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
      setError(t('authError') || 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Phone автентифікація (БЕЗ referralCode, але backwards compatible)
  const handlePhoneAuth = async (phone, referralCode = null, userData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // referralCode ігнорується
      
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
      setError(t('authError') || 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password реєстрація (БЕЗ referralCode, але backwards compatible)
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
            setError(t('userAlreadyExists') || 'User already exists');
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
            setError(t('profileCreationError') || 'Profile creation failed');
            return false;
          }

          // referralCode ігнорується
        }

        console.log("✓ User registered successfully");
        return true;
      } else {
        // Phone registration
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
      setError(err.message || t('authError') || 'Authentication failed');
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
      setError(err.message || t('authError') || 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Phone login
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
      setError(err.message || t('authError') || 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP (БЕЗ referral processing)
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
      
      if (data.user) {
        let userData = {};
        
        if (pendingUserData) {
          userData = JSON.parse(pendingUserData);
          localStorage.removeItem('pending_user_data');
        }
        
        await createOrUpdateUserProfile(data.user, userData);
        
        // БЕЗ referral processing
      }
      
      return data.user;
    } catch (err) {
      console.error("OTP verification error:", err);
      setError(err.message || t('authError') || 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Отримання поточного Web3 користувача
  const getCurrentWeb3User = () => {
    try {
      const savedAddress = getWalletAddress();
      const savedUserData = getWeb3UserData();

      if (savedAddress && isValidEthereumAddress(savedAddress) && savedUserData) {
        return savedUserData;
      }

      if (savedAddress && !isValidEthereumAddress(savedAddress)) {
        console.warn('Clearing invalid wallet data');
        disconnectWallet();
      }

      return null;
    } catch (error) {
      console.error('Error getting Web3 user:', error);
      return null;
    }
  };

  // Перевірка Web3 автентифікації
  const isWeb3Authenticated = () => {
    const address = getWalletAddress();
    return address && isValidEthereumAddress(address);
  };

  // Уніфікований метод отримання поточного користувача
  const getCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return session.user;
      }
      
      const web3Data = getCurrentWeb3User();
      return web3Data || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  // Вихід з системи
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase logout error:', error);
      }
      
      disconnectWallet();
      
      localStorage.removeItem('pending_user_data');
      
      setWeb3User(null);
      setError(null);
      
      console.log("✅ Logout completed");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Заглушка для processReferral (для backwards compatibility)
  const processReferral = async (referralCode, referredUserId) => {
    console.log('ℹ️ Referral system disabled');
    return null;
  };

  return {
    // Методи автентифікації
    handleSignup,
    handleGoogleAuth,
    handlePhoneAuth,
    handleWalletAuth,
    handleEmailLogin,
    handlePhoneLogin,
    verifyOTP,
    logout,
    
    // Web3 методи
    getCurrentWeb3User,
    isWeb3Authenticated,
    
    // Загальні методи
    getCurrentUser,
    createOrUpdateUserProfile,
    processReferral, // заглушка для backwards compatibility
    
    // Стан
    isLoading,
    error,
    setError,
    web3User,
    web3Initialized,
    clearError: () => setError(null)
  };
};