// src/App.jsx
import React, { useState, useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "./utils/supabase";
import { connectWallet } from "./utils/web3";
import { FaGoogle, FaTwitter, FaEye, FaEyeSlash } from "react-icons/fa";
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
import Chat from "./components/Chat";
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

function App() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") || "uk";
    i18n.changeLanguage(savedLanguage);
  }, [i18n]);

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
    setShowLanguageDropdown(false);
  };

  const handleLogin = async (provider = null) => {
    try {
      setLoading(true);
      setError(null);
      let error;
      if (provider) {
        const { error: providerError } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/feed` },
        });
        error = providerError;
      } else {
        const { error: emailError } = await supabase.auth.signInWithPassword({
          email: loginInput,
          password,
        });
        error = emailError;
      }
      if (error) throw error;
      navigate("/feed");
    } catch (err) {
      console.error("Login error:", err);
      setError(t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = async () => {
    try {
      const address = await connectWallet();
      alert(t("walletConnected", { address }));
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(t("walletError"));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Language selection button for mobile version - in the upper right corner */}
      <div className="lg:hidden fixed top-4 right-4 z-20">
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-sm border border-blue-100 text-blue-950 shadow-sm hover:shadow-md transition-all duration-200 text-sm"
            aria-label={t("selectLanguage")}
          >
            <span className="font-medium">
              {i18n.language === "uk" ? "Українська" : "English"}
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
                className="absolute top-full right-0 mt-2 w-40 bg-white/95 rounded-2xl shadow-lg border border-blue-100 overflow-hidden z-10 backdrop-blur-sm"
              >
                <button
                  onClick={() => handleLanguageChange("uk")}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      i18n.language === "uk" ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  ></span>
                  Українська
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      i18n.language === "en" ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  ></span>
                  English
                </button>
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
        {/* Left side: Login form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/95 p-6 rounded-2xl shadow-lg relative overflow-hidden border border-blue-100 backdrop-blur-sm order-2 lg:order-1"
        >
          <div className="text-center mb-6">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold bg-gradient-to-r from-blue-900 to-purple-800 bg-clip-text text-transparent mb-2"
            >
              HUMAN RIGHTS POLICY <br /> Decentralized Autonomous Organization
            </motion.h1>
            <p className="text-blue-950 text-sm opacity-80">
              {t("projectDescriptionShort") ||
                "Allow no harm to yourself. Do no harm to others."}
            </p>
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
                {t("emailPlaceholder")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="example@email.com"
                  aria-label={t("emailPlaceholder")}
                />
              </div>
            </div>

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
                  placeholder="••••••••"
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleLogin()}
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleLogin("twitter")}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
              aria-label={t("loginWithTwitter")}
            >
              <FaTwitter className="w-4 h-4 text-blue-400" />
              <span className="font-medium">Twitter</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleWalletConnect}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
              aria-label={t("connectWallet")}
            >
              <SiEthereum className="w-4 h-4" />
              <span className="font-medium">{t("connectWallet")}</span>
            </motion.button>
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

        {/* Right side: Project description and language selection */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center lg:text-left order-1 lg:order-2"
        >
          {/* Language selection button for desktop version */}
          <div className="hidden lg:flex justify-center lg:justify-end mb-6">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-sm border border-blue-100 text-blue-950 shadow-sm hover:shadow-md transition-all duration-200 text-sm"
                aria-label={t("selectLanguage")}
              >
                <span className="font-medium">
                  {i18n.language === "uk" ? "Українська" : "English"}
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
                    className="absolute top-full right-0 mt-2 w-40 bg-white/95 rounded-2xl shadow-lg border border-blue-100 overflow-hidden z-10 backdrop-blur-sm"
                  >
                    <button
                      onClick={() => handleLanguageChange("uk")}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          i18n.language === "uk" ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      ></span>
                      Українська
                    </button>
                    <button
                      onClick={() => handleLanguageChange("en")}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          i18n.language === "en" ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      ></span>
                      English
                    </button>
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

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<App />} />
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
          <Route
            path="/services/:id/:serviceKey"
            element={<ServiceDetails />}
          />
          <Route path="/chat" element={<Chat />} />
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
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
