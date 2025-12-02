// hooks/useAuth.js - ПОВНІСТЮ ВИПРАВЛЕНА ВЕРСІЯ
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

  // Створення/оновлення профілю користувача - ОДНА ВЕРСІЯ
  const createOrUpdateUserProfile = async (user, userData = {}) => {
    try {
      if (!user || !user.id) {
        throw new Error('User ID is required');
      }

      // Обробка телефону
      const phoneValue = userData.phone || user.phone || null;
      const processedPhone = (phoneValue && phoneValue !== "") ? phoneValue : null;

      const profileData = {
        id: user.id,
        username: userData.username || user.user_metadata?.username || `user_${user.id.slice(0, 8)}`,
        email: user.email || userData.email || null,
        phone: processedPhone,
        country: userData.country || 'EARTH',
        profile_picture: user.user_metadata?.avatar_url || userData.profile_picture || null,
        bio: userData.bio || null,
        city: userData.city || null,
        status: userData.status || null,
        social_links: userData.social_links || {},
        settings: userData.settings || {},
        role: userData.role || 'user',
        wallet_address: userData.wallet_address || null,
        birth_date: userData.birthDate || userData.birth_date || null,
        is_web3_user: userData.wallet_address ? true : false,
        onboarding_completed: userData.onboarding_completed || false,
        signature_verified: userData.signature_verified || false
      };

      // Видаляємо undefined значення
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });

      // Перевіряємо, чи існує користувач
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking user:', checkError);
        return false;
      }

      let result;

      if (existingUser) {
        // Оновлюємо існуючий запис
        result = await supabase
          .from('users')
          .update(profileData)
          .eq('id', user.id);
      } else {
        // Створюємо новий запис
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

  // Email/Password реєстрація - ВИПРАВЛЕНА ВЕРСІЯ
  const handleSignup = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    const { loginInput, username, country, password, birthDate } = userData;
    
    try {
      const isEmail = loginInput.includes("@");
      
      // Phone registration
      if (!isEmail) {
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

      // Email registration
      console.log("📧 Starting email registration...");
      
      // Перевіряємо, чи користувач вже існує в таблиці users
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', loginInput)
        .maybeSingle();

      if (existingUser) {
        setError(t('userAlreadyExists') || 'User with this email already exists');
        return false;
      }

      // Реєструємо користувача в Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: loginInput,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: {
            username: username,
            country: country || 'EARTH',
            birth_date: birthDate
          }
        }
      });

      if (signUpError) {
        console.error("❌ Signup error:", signUpError);
        
        if (signUpError.message.includes('already registered') || 
            signUpError.status === 422 || 
            signUpError.message.includes('User already registered')) {
          setError(t('userAlreadyExists') || 'User already exists');
        } else {
          setError(signUpError.message || t('authError'));
        }
        return false;
      }

      // Перевіряємо, чи отримали користувача
      if (!authData?.user?.id) {
        console.error("❌ No user ID returned from signup");
        setError(t('signupError') || 'Registration failed. Please try again.');
        return false;
      }

      const userId = authData.user.id;
      console.log("✓ Auth user created:", userId);

      // Чекаємо трохи, щоб уникнути race condition
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Перевіряємо, чи профіль вже створений (через тригер)
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!existingProfile) {
        // Створюємо профіль тільки якщо його немає
        const profileData = {
          id: userId,
          username: username,
          email: loginInput,
          phone: null,
          country: country || 'EARTH',
          birth_date: birthDate || null,
          profile_picture: null,
          bio: null,
          city: null,
          status: null,
          social_links: {},
          settings: {},
          role: 'user',
          wallet_address: null,
          is_web3_user: false,
          onboarding_completed: false,
          signature_verified: false,
          created_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase
          .from('users')
          .insert([profileData]);

        if (profileError) {
          console.error("❌ Profile creation error:", profileError);
          // Не повертаємо false, бо користувач вже створений в auth
        } else {
          console.log("✓ User profile created successfully");
        }
      } else {
        // Оновлюємо існуючий профіль
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: username,
            country: country || 'EARTH',
            birth_date: birthDate || null
          })
          .eq('id', userId);

        if (updateError) {
          console.error("❌ Profile update error:", updateError);
        } else {
          console.log("✓ User profile updated successfully");
        }
      }

      console.log("✅ User registered successfully");
      return true;

    } catch (err) {
      console.error("❌ Signup error:", err);
      setError(err.message || t('authError') || 'Authentication failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Web3 аутентифікація
  const handleWalletAuth = async (userData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Starting Web3 authentication...");

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
        console.log("✅ Existing Web3 user found:", existingUser.id);
        userId = existingUser.id;
        
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
          status: null,
          social_links: {},
          settings: {},
          role: 'user',
          birth_date: userData.birthDate || null,
          created_at: new Date().toISOString(),
          is_web3_user: true,
          onboarding_completed: false,
          signature_verified: false
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
      localStorage.setItem('wallet_user_data', JSON.stringify(userDataToStore));
      setWeb3User(userDataToStore);

      console.log("✅ Web3 authentication completed successfully");
      return normalizedAddress;

    } catch (err) {
      console.error("❌ Web3 auth error:", err);
      
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

  // Google аутентифікація
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
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

  // Phone аутентифікація
  const handlePhoneAuth = async (phone, userData = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
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
      
      if (data.user) {
        let userData = {};
        
        if (pendingUserData) {
          userData = JSON.parse(pendingUserData);
          localStorage.removeItem('pending_user_data');
        }
        
        await createOrUpdateUserProfile(data.user, userData);
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

  // Перевірка Web3 аутентифікації
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
    // Методи аутентифікації
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
    processReferral,
    
    // Стан
    isLoading,
    error,
    setError,
    web3User,
    web3Initialized,
    clearError: () => setError(null)
  };
};