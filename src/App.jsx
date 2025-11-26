// App.jsx
import React, { useState, useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "./utils/supabase";
import { connectWallet } from "./utils/web3";
import { FaGoogle, FaEye, FaEyeSlash, FaPhone } from "react-icons/fa";
import { SiEthereum } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import Feed from "./components/Feed";
import Comments from "./components/Comments";
import PostForm from "./components/PostForm";
import Signup from "./components/Signup";
import Profile from "./components/Profile";
import Country from "./components/Country";
import Terms from "./pages/Terms";
import Services from "./components/Services";
import PublicProfile from "./components/PublicProfile";
import Chat from "./components/Chat/Chat";
import GroupChat from "./components/Chat/GroupChat";
import Message from "./components/Chat/Message";
import AddService from "./components/AddService";
import ServiceDetails from "./components/ServiceDetails";
import Community from "./components/Community";
import CommunityDetail from "./pages/CommunityDetail";
import Events from "./components/Events";
import Notifications from "./components/Notifications";
import Settings from "./components/Settings";
import Education from "./pages/Education";
import Violators from "./pages/Violators";
import Complaint from "./pages/Complaint";
import Donation from "./pages/Donation";
import Onboarding from "./pages/Onboarding";
import Moderation from './components/Moderation';
import CreatePostPage from './pages/CreatePostPage';
import MainLayout from './components/layout/MainLayout';
import ViolationsMap from './pages/ViolationsMap';
import ComplaintDetails from './components/ComplaintDetails';
import { useOnboarding } from './hooks/useOnboarding';
import { useAuth } from './hooks/useAuth';
import PhoneVerification from './components/PhoneVerification';
import { useLanguage } from './hooks/useLanguage';
import SearchResults from './pages/SearchResults';
import Voting from './pages/Voting';

// Error Boundary for handling errors in components
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-red-500">
          Error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

function App({ currentUser }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
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

  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState('email');
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Custom hooks
  const { 
    checkOnboardingCompletion 
  } = useOnboarding();

  const { 
    handlePhoneLogin,
    handleEmailLogin,
    handleWalletAuth,
    verifyOTP,
    isLoading: authLoading,
    error: authError,
    setError: setAuthError
  } = useAuth();

  const handleLogin = async (provider = null) => {
    try {
      setLoading(true);
      setError(null);
      let error;
      
      if (provider === 'phone') {
        if (!loginInput) {
          setError(t("phoneRequired"));
          return;
        }
        
        const success = await handlePhoneLogin(loginInput);
        if (success) {
          setPhoneNumber(loginInput);
          setShowPhoneVerification(true);
        }
        return;
      }
      
      if (provider) {
        const { error: providerError } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/onboarding` },
        });
        error = providerError;
      } else {
        // Email/password login
        if (authMethod === 'email') {
          const user = await handleEmailLogin(loginInput, password);
          if (user) {
            await handlePostLogin(user);
          }
        }
      }
      
      if (error) throw error;

    } catch (err) {
      console.error("Login error:", err);
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  const handlePostLogin = async (user) => {
    if (user) {
      const onboardingCompleted = await checkOnboardingCompletion(user.id);
      if (onboardingCompleted) {
        navigate("/country");
      } else {
        navigate("/onboarding");
      }
    }
  };

  const handleWalletConnect = async () => {
    try {
      setLoading(true);
      const address = await handleWalletAuth();
      if (address) {
        alert((t("walletConnected") || "Wallet connected") + `: ${address}`);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await handlePostLogin(user);
        }
      }
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(t("walletError"));
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerification = async (token) => {
    try {
      setLoading(true);
      const user = await verifyOTP(phoneNumber, token);
      if (user) {
        setShowPhoneVerification(false);
        await handlePostLogin(user);
      }
    } catch (err) {
      console.error("Phone verification error:", err);
      setError(t("verificationError"));
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-blue-900 text-lg font-semibold"
        >
          {t("loading")}...
        </motion.div>
      </div>
    );

  if (showPhoneVerification) {
    return (
      <PhoneVerification 
        phoneNumber={phoneNumber}
        onVerify={handlePhoneVerification}
        onBack={() => setShowPhoneVerification(false)}
        isLoading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Language selection button for mobile version */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
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
                className="absolute top-full right-0 mt-2 w-48 bg-white/95 rounded-2xl shadow-lg border border-blue-100 overflow-hidden z-50 backdrop-blur-sm"
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
        className="max-w-2xl w-full relative"
      >
        {/* Language selection button for desktop version */}
        <div className="hidden lg:block absolute -right-4 top-0 transform translate-x-full z-40">
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
                  className="absolute top-full right-0 mt-2 w-48 bg-white/95 rounded-2xl shadow-lg border border-blue-100 overflow-hidden z-50 backdrop-blur-sm"
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

        {/* Login form - wider */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/95 p-8 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm"
        >
          {/* Logo above title */}
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="HRP DAO Logo"
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-6">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-800 bg-clip-text text-transparent mb-2 px-2 break-words"
            >
              HUMAN RIGHTS POLICY
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg sm:text-xl text-blue-900 font-semibold mb-3 px-2 break-words"
            >
              Decentralized Autonomous Organization
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-blue-950 text-sm opacity-80 px-2 break-words leading-tight"
            >
              Не дозволяй завдавати шкоди собі. Не завдавай шкоди іншим.
            </motion.p>
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-950 mb-1.5">
                {authMethod === 'email' ? t("emailPlaceholder") : t("phonePlaceholder")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={authMethod === 'email' ? "example@email.com" : "+380123456789"}
                  aria-label={authMethod === 'email' ? t("emailPlaceholder") : t("phonePlaceholder")}
                />
              </div>
            </div>

            {authMethod === 'email' && (
              <div>
                <label className="block text-sm font-medium text-blue-950 mb-1.5">
                  {t("passwordPlaceholder")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                    placeholder="•••••••••"
                    aria-label={t("passwordPlaceholder")}
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
                </div>
              </div>
            )}

            {authMethod === 'email' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                        rememberMe
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {rememberMe && (
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
                  <span className="text-sm text-blue-900">{t("rememberMe")}</span>
                </label>

                <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                  {t("forgotPassword")}
                </button>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleLogin(authMethod === 'phone' ? 'phone' : null)}
              disabled={loading}
              className="w-full px-4 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-xl text-sm bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 text-white"
              aria-label={t("login")}
            >
              {loading ? (
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
              {t("login")}
            </motion.button>
          </div>

          <div className="relative my-4">
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
              onClick={() => handleLogin("google")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
              aria-label={t("loginWithGoogle")}
            >
              <FaGoogle className="w-4 h-4 text-red-600" />
              <span className="font-medium">Google</span>
            </motion.button>

            {/* Wallet connection button removed as requested */}
          </div>

          <div className="text-center">
            <p className="text-sm text-blue-950 opacity-80">
              {t("noAccount")}{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                aria-label={t("switchToSignup")}
              >
                {t("createAccount")}
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function AppWrapper() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }
    };
    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<App currentUser={currentUser} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/post" element={<PostForm />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/comments/:postId" element={<Comments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/public/:userId" element={<PublicProfile />} />
          <Route path="/country" element={<Country />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<Services />} />
          <Route path="/services/:id/add" element={<AddService />} />
          <Route path="/services/:id/:serviceKey" element={<ServiceDetails />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/group-chat" element={<GroupChat />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/:id" element={<CommunityDetail />} />
          <Route path="/community/:communityId/events" element={<Events />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/education" element={<Education />} />
          <Route path="/violators" element={<Violators />} />
          <Route path="/complaint" element={<Complaint />} />
          <Route path="/donation" element={<Donation />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route 
            path="/create-post" 
            element={
              <MainLayout currentUser={currentUser}>
                <CreatePostPage currentUser={currentUser} />
              </MainLayout>
            } 
          />
          <Route path="/violations-map" element={<ViolationsMap />} />
          <Route path="/complaint-details/:id" element={<ComplaintDetails />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/voting" element={<Voting />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}