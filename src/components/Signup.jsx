// Signup.jsx
import React from "react";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../utils/supabase";
import {
  FaGoogle,
  FaInfoCircle,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { SiEthereum } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import countries from "../utils/countries";
import { motion, AnimatePresence } from "framer-motion";
import { useGeolocation } from "../hooks/useGeolocation";
import { useAuth } from "../hooks/useAuth";
import PhoneVerification from "./PhoneVerification";
import WalletVerification from "./WalletVerification";
import { useLanguage } from '../hooks/useLanguage';

function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Custom hooks
  const { getGeolocation, isLoading: geoLoading, error: geoError } = useGeolocation();
  const { 
    handleSignup, 
    handleGoogleAuth, 
    handlePhoneAuth,
    handleWalletAuth,
    verifyOTP,
    isLoading: authLoading, 
    error: authError,
    setError: setAuthError 
  } = useAuth();

  // Use language hook
  const {
    currentLanguage,
    showLanguageDropdown,
    changeLanguage,
    toggleLanguageDropdown,
    closeLanguageDropdown,
    getLanguageName,
    availableLanguages
  } = useLanguage();

  const [step, setStep] = useState(1);
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("EARTH");
  const [username, setUsername] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [inputError, setInputError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState(null);
  const [emailAvailability, setEmailAvailability] = useState(null);
  const [authMethod, setAuthMethod] = useState('email');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showWalletVerification, setShowWalletVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState(null);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState(null);

  const isLoading = authLoading || geoLoading;
  const error = authError || geoError;

  // Check username availability
  const checkUsernameAvailability = useCallback(async (username) => {
    if (!username || username.length < 3) {
      setUsernameAvailability(null);
      return;
    }
    
    setUsernameAvailability('checking');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking username:', error);
        setUsernameAvailability(null);
        return;
      }
      
      if (data) {
        setUsernameAvailability('taken');
      } else {
        setUsernameAvailability('available');
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailability(null);
    }
  }, []);

  // Check email availability
  const checkEmailAvailability = useCallback(async (email) => {
    if (!email || !email.includes('@')) {
      setEmailAvailability(null);
      return;
    }
    
    setEmailAvailability('checking');
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking email:', error);
        setEmailAvailability(null);
        return;
      }
      
      if (data) {
        setEmailAvailability('taken');
      } else {
        setEmailAvailability('available');
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailAvailability(null);
    }
  }, []);

  const handleUsernameChange = useCallback((value) => {
    const cleanedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleanedValue);
    
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
    }
    
    if (cleanedValue.length >= 3) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability(cleanedValue);
      }, 500);
      setUsernameCheckTimeout(timeout);
    } else {
      setUsernameAvailability(null);
    }
  }, [usernameCheckTimeout, checkUsernameAvailability]);

  const handleLoginInputChange = useCallback((value) => {
    setLoginInput(value);
    
    if (authMethod === 'email' && value.includes('@')) {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
      
      const timeout = setTimeout(() => {
        checkEmailAvailability(value);
      }, 500);
      setEmailCheckTimeout(timeout);
    } else {
      setEmailAvailability(null);
    }
  }, [authMethod, emailCheckTimeout, checkEmailAvailability]);

  useEffect(() => {
    return () => {
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout);
      }
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
    };
  }, [usernameCheckTimeout, emailCheckTimeout]);

  const validateAge = (date) => {
    const today = new Date();
    const birth = new Date(date);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()))
      age--;
    return age;
  };

  const validateInput = (value) => {
    if (!value) return t("invalidEmailOrPhone") || "Invalid email or phone number";
    
    if (authMethod === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        return t("invalidEmailOrPhone") || "Invalid email or phone number";
    } else if (authMethod === 'phone') {
      if (!/^\+?\d{10,15}$/.test(value))
        return t("invalidEmailOrPhone") || "Invalid email or phone number";
    }
    
    return null;
  };

  const validatePassword = (value) => {
    if (
      !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/.test(
        value
      )
    )
      return t("invalidPassword") || "Password must be at least 8 characters with letters, numbers and special characters";
    return null;
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
  };

  const handleGeolocation = async () => {
    try {
      const countryCode = await getGeolocation();
      setCountry(countryCode);
    } catch (err) {
      console.error('Geolocation error:', err);
    }
  };

  const handleNextStep = () => {
    setAuthError(null);
    const inputError = validateInput(loginInput);
    if (inputError) return setAuthError(inputError);
    
    if (authMethod === 'email') {
      if (emailAvailability === 'taken') {
        return setAuthError(t("emailAlreadyExists") || "Email is already registered");
      }
      
      const passwordError = validatePassword(password);
      if (passwordError) return setAuthError(passwordError);
      if (password !== confirmPassword) return setAuthError(t("passwordMismatch") || "Passwords do not match");
    }
    
    setStep(2);
  };

  const handleSignupSubmit = async () => {
    setAuthError(null);

    if (!username || username.length < 3) {
      setAuthError(t("usernameRequired") || "Username is required");
      return;
    }
    
    if (usernameAvailability !== 'available') {
      setAuthError(t("usernameNotAvailable") || "Username is not available");
      return;
    }

    if (!termsAccepted) {
      setAuthError(t("terms") || "You must accept the terms and conditions");
      return;
    }

    if (birthDate && validateAge(birthDate) < 18) {
      setAuthError(t("ageRestriction") || "You must be at least 18 years old");
      return;
    }

    const userData = {
      loginInput,
      username,
      country: country || 'EARTH',
      password,
      birthDate
    };

    if (authMethod === 'phone') {
      const success = await handlePhoneAuth(loginInput, {
        username,
        country: country || 'EARTH',
        birthDate
      });
      
      if (success) {
        setPhoneNumber(loginInput);
        setShowPhoneVerification(true);
      }
      return;
    }

    const success = await handleSignup(userData);

    if (success) {
      alert(t("checkEmail") || "Please check your email for verification");
      navigate("/onboarding");
    }
  };

  const handlePhoneVerification = async (token) => {
    try {
      const user = await verifyOTP(phoneNumber, token);
      if (user) {
        setShowPhoneVerification(false);
        navigate("/onboarding");
      }
    } catch (err) {
      console.error("Phone verification error:", err);
      setAuthError(t("verificationError"));
    }
  };

  const handleGoogleSignup = async () => {
    const success = await handleGoogleAuth();
    if (success) {
      // Navigation will happen after OAuth redirect
    }
  };

  const handleWalletSignup = async () => {
    setAuthError(null);
    setShowWalletVerification(true);
  };

  const handleWalletVerificationSuccess = () => {
    setShowWalletVerification(false);
    navigate("/onboarding");
  };

  // Render verification components
  if (showWalletVerification) {
    return (
      <WalletVerification 
        onBack={() => setShowWalletVerification(false)}
        onSuccess={handleWalletVerificationSuccess}
      />
    );
  }

  if (showPhoneVerification) {
    return (
      <PhoneVerification 
        phoneNumber={phoneNumber}
        onVerify={handlePhoneVerification}
        onBack={() => setShowPhoneVerification(false)}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Language selection button for mobile version */}
      <div className="lg:hidden fixed top-4 right-4 z-20">
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLanguageDropdown}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-sm border border-blue-100 text-blue-950 shadow-sm hover:shadow-md transition-all duration-200 text-sm"
            aria-label={t("selectLanguage")}
          >
            <span className="font-medium">
              {getLanguageName(currentLanguage)}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${
                showLanguageDropdown ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </motion.button>

          <AnimatePresence>
            {showLanguageDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 mt-2 w-48 bg-white/95 rounded-2xl shadow-lg border border-blue-100 overflow-hidden z-10 backdrop-blur-sm"
              >
                {availableLanguages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => changeLanguage(language.code)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentLanguage === language.code ? "bg-blue-600" : "bg-gray-300"
                      }`}
                    ></span>
                    {language.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
      >
        {/* Left side: Registration form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/95 p-6 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm"
        >
          <div className="text-center mb-6">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-800 bg-clip-text text-transparent mb-2"
            >
              {t("signup").toUpperCase()}
            </motion.h1>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-900 to-purple-800 h-2 rounded-full transition-all duration-300"
                style={{ width: step === 1 ? "50%" : "100%" }}
              ></div>
            </div>
            <div className="flex justify-between text-sm mt-2 text-blue-950 opacity-80">
              <span>{t("step1")}</span>
              <span>{t("step2")}</span>
            </div>
          </div>

          {/* Auth Method Selector */}
          <div className="flex mb-4 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                authMethod === 'email' 
                  ? 'bg-white text-blue-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t("email")}
            </button>
            <button
              onClick={() => setAuthMethod('phone')}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                authMethod === 'phone' 
                  ? 'bg-white text-blue-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t("phone")}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 text-red-800 rounded-full border border-red-100 flex items-start gap-3 shadow-sm"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          {step === 1 && (
            <>
              {/* Login Input (Email or Phone) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-950 mb-1.5">
                  {authMethod === 'email' ? t("emailPlaceholder") : t("phonePlaceholder")}
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => handleLoginInputChange(e.target.value)}
                    placeholder={authMethod === 'email' ? "example@email.com" : "+380123456789"}
                    className={`w-full px-4 py-2.5 rounded-full border ${
                      inputError ? "border-red-500" : "border-gray-200"
                    } bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                    aria-label={authMethod === 'email' ? t("emailPlaceholder") : t("phonePlaceholder")}
                  />
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white/95 shadow-lg p-3 rounded-2xl border border-blue-100 z-10 backdrop-blur-sm">
                    <div className="flex items-start gap-2">
                      <FaInfoCircle className="text-blue-600 text-sm mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-blue-950 opacity-80">
                        {authMethod === 'email' 
                          ? (t("emailOrPhoneTooltip") || "Enter your email address")
                          : (t("phoneTooltip") || "Enter your phone number with country code")
                        }
                      </span>
                    </div>
                  </div>
                </div>
                {inputError && (
                  <p className="text-red-500 text-xs mt-2">{inputError}</p>
                )}
                {authMethod === 'email' && loginInput.includes('@') && (
                  <p className={`text-xs mt-1 ${
                    emailAvailability === 'available' ? 'text-green-600' : 
                    emailAvailability === 'checking' ? 'text-blue-600' : 
                    emailAvailability === 'taken' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {emailAvailability === 'checking' && (t("checkingEmail") || "Checking email...")}
                    {emailAvailability === 'available' && (t("emailAvailable") || "Email is available")}
                    {emailAvailability === 'taken' && (t("emailTaken") || "Email is already registered")}
                  </p>
                )}
              </div>

              {authMethod === 'email' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-blue-950 mb-1.5">
                      {t("password")}
                    </label>
                    <div className="relative group">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="•••••••••"
                        className={`w-full px-4 py-2.5 rounded-full border ${
                          passwordError ? "border-red-500" : "border-gray-200"
                        } bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12`}
                        aria-label={t("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-full"
                        aria-label={
                          showPassword ? t("hidePassword") : t("showPassword")
                        }
                      >
                        {showPassword ? (
                          <FaEyeSlash className="w-4 h-4" />
                        ) : (
                          <FaEye className="w-4 h-4" />
                        )}
                      </button>
                      <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white/95 shadow-lg p-3 rounded-2xl border border-blue-100 z-10 backdrop-blur-sm">
                        <div className="flex items-start gap-2">
                          <FaInfoCircle className="text-blue-600 text-sm mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-blue-950 opacity-80">
                            {t("passwordTooltip")}
                          </span>
                        </div>
                      </div>
                    </div>
                    {passwordError && (
                      <p className="text-red-500 text-xs mt-2">{passwordError}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-blue-950 mb-1.5">
                      {t("confirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="•••••••••"
                        className={`w-full px-4 py-2.5 rounded-full border ${
                          error && error.includes(t("passwordMismatch"))
                            ? "border-red-500"
                            : "border-gray-200"
                        } bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12`}
                        aria-label={t("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-full"
                        aria-label={
                          showConfirmPassword
                            ? t("hidePassword")
                            : t("showPassword")
                        }
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash className="w-4 h-4" />
                        ) : (
                          <FaEye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNextStep}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-xl text-sm bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 text-white"
                aria-label={t("next")}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {isLoading ? t("loading") : t("next")}
              </motion.button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-blue-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {t("orContinueWith")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleSignup}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  aria-label={t("signUpWithGoogle")}
                >
                  <FaGoogle className="w-4 h-4 text-red-600" />
                  <span className="font-medium">{t("signUpWithGoogle")}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleWalletSignup}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                  aria-label={t("connectWallet")}
                >
                  <SiEthereum className="w-4 h-4 text-purple-600" />
                  <span className="font-medium">{t("connectWallet")}</span>
                </motion.button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Username field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-950 mb-1.5">
                  {t("username")} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">@</span>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="johndoe"
                    className="w-full pl-7 pr-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    aria-label={t("username")}
                    maxLength={30}
                  />
                </div>
                {username && (
                  <p className={`text-xs mt-1 ${
                    usernameAvailability === 'available' ? 'text-green-600' : 
                    usernameAvailability === 'checking' ? 'text-blue-600' : 
                    usernameAvailability === 'taken' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {usernameAvailability === 'checking' && (t("checkingUsername") || "Checking username...")}
                    {usernameAvailability === 'available' && (t("usernameAvailable") || "Username is available")}
                    {usernameAvailability === 'taken' && (t("usernameTaken") || "Username is already taken")}
                    {!usernameAvailability && (t("usernameRequirements") || "Username must be at least 3 characters")}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-950 mb-1.5">
                  {t("birthDate")}
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-full border ${
                    error && error.includes(t("ageRestriction"))
                      ? "border-red-500"
                      : "border-gray-200"
                  } bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  aria-label={t("birthDate")}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-950 mb-1.5">
                  {t("country")}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`flex-1 px-4 py-2.5 rounded-full border ${
                      error && error.includes(t("acceptGeolocation"))
                        ? "border-red-500"
                        : "border-gray-200"
                    } bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                    aria-label={t("country")}
                  >
                    <option value="EARTH">{t("planetEarth")}</option>
                    {countries.map(({ code, name }) => (
                      <option key={code} value={code}>
                        {name[currentLanguage]}
                      </option>
                    ))}
                  </select>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGeolocation}
                    disabled={isLoading}
                    className="p-2.5 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
                    title={t("useGeolocation")}
                  >
                    <FaMapMarkerAlt className="text-blue-600 w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              <div className="flex items-center mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                        termsAccepted
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {termsAccepted && (
                        <svg
                          className="w-4 h-4 text-white absolute top-0.5 left-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-blue-950 opacity-80">
                    {t("terms")} (
                    <a
                      href="/terms"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {t("termsLink")}
                    </a>
                    )
                  </span>
                </label>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignupSubmit}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-xl text-sm bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 text-white"
                aria-label={t("signup")}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                )}
                {isLoading ? t("loading") : t("signup")}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(1)}
                disabled={isLoading}
                className="w-full mt-3 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                aria-label={t("back")}
              >
                {t("back")}
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Right side: Project description and language selection */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center lg:text-left"
        >
          {/* Language selection button for desktop version */}
          <div className="hidden lg:flex justify-center lg:justify-end mb-6">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleLanguageDropdown}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-sm border border-blue-100 text-blue-950 shadow-sm hover:shadow-md transition-all duration-200 text-sm"
                aria-label={t("selectLanguage")}
              >
                <span className="font-medium">
                  {getLanguageName(currentLanguage)}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showLanguageDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </motion.button>

              <AnimatePresence>
                {showLanguageDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white/95 rounded-2xl shadow-lg border border-blue-100 overflow-hidden z-10 backdrop-blur-sm"
                  >
                    {availableLanguages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => changeLanguage(language.code)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            currentLanguage === language.code ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        ></span>
                        {language.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white/95 p-6 rounded-2xl border border-blue-100 backdrop-blur-sm"
          >
            <div className="flex justify-center mb-4">
              <img
                src="/logo.png"
                alt="HRP DAO Logo"
                className="h-16 w-auto object-contain"
              />
            </div>

            <h2 className="text-xl font-semibold text-blue-950 mb-4 text-center">
              {t("welcome")}
            </h2>

            <div className="space-y-3 text-blue-950">
              <p className="text-sm leading-relaxed opacity-80 text-center">
                {t("projectDescription") ||
                  "Human Rights Policy DAO is a decentralized platform that uses blockchain technology to promote human rights policy. The project focuses on advocacy, engaging a global community of activists, and creating transparent voting and funding mechanisms for initiatives. The community brings together human rights advocates and other activists, offering tokenized incentives for collective impact on social change."}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="text-center p-3 bg-blue-50/50 rounded-xl">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold">Community</p>
                </div>

                <div className="text-center p-3 bg-purple-50/50 rounded-xl">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-1">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold">Protection</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Signup;