import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FaSearch,
  FaUserCircle,
  FaTimes,
  FaWallet,
  FaBars,
  FaFileAlt,
  FaCoins,
} from "react-icons/fa";
import { RiRobot3Fill } from "react-icons/ri";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "../utils/supabase";
import AIAdvisor from "./AIAdvisor";

function Navbar({ currentUser, onToggleSidebar }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [connected, setConnected] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (currentUser?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("profile_picture")
          .eq("id", currentUser.id)
          .single();
        if (!profileError && profile) {
          setProfileData(profile);
        }
      }
    };

    fetchUserProfile();
  }, [currentUser]);

  // ВИПРАВЛЕНА ФУНКЦІЯ - правильний розрахунок балансу
  const fetchUserPoints = async () => {
    if (currentUser?.id) {
      try {
        // Завантажуємо нараховані поінти
        const { data: pointsData, error: pointsError } = await supabase
          .from("user_points")
          .select("points")
          .eq("user_id", currentUser.id);

        if (pointsError) {
          console.error("❌ Navbar: Error loading points:", pointsError);
          return;
        }

        // Завантажуємо витрати поінтів
        const { data: deductionsData, error: deductionsError } = await supabase
          .from("user_points_deductions")
          .select("points_used")
          .eq("user_id", currentUser.id);

        if (deductionsError) {
          console.error("❌ Navbar: Error loading deductions:", deductionsError);
          return;
        }

        // Обчислюємо загальну суму нарахованих поінтів
        const totalEarned = pointsData.reduce(
          (sum, record) => sum + parseInt(record.points || 0),
          0
        );

        // Обчислюємо загальну суму витрачених поінтів
        const totalSpent = deductionsData.reduce(
          (sum, record) => sum + parseInt(record.points_used || 0),
          0
        );

        // Обчислюємо поточний баланс (НЕ віднімаємо заблоковані токени)
        const currentBalance = totalEarned - totalSpent;
        
        setTotalPoints(currentBalance);

      } catch (error) {
        console.error("❌ Navbar: Error in fetchUserPoints:", error);
      }
    }
  };

  useEffect(() => {
    fetchUserPoints();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Підписка на зміни в таблиці нарахованих поінтів
    const pointsSubscription = supabase
      .channel("user_points_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_points",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          fetchUserPoints();
        }
      )
      .subscribe();

    // Підписка на зміни в таблиці витрат поінтів
    const deductionsSubscription = supabase
      .channel("user_points_deductions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_points_deductions",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          fetchUserPoints();
        }
      )
      .subscribe();

    return () => {
      pointsSubscription.unsubscribe();
      deductionsSubscription.unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const interval = setInterval(() => {
      fetchUserPoints();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert(t("metaMaskNotFound"));
      return;
    }
    try {
      if (!window.ethereum.isMetaMask || !window.ethereum.isConnected()) {
        alert(t("metaMaskNotReady"));
        return;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length > 0) {
        setConnected(true);
        alert(t("walletConnected"));
      }
    } catch (error) {
      console.error("MetaMask connection error:", error);
      alert(t("walletConnectionError"));
    }
  };

  const handleAIAdvisorClick = async () => {
    try {
      setShowAIAdvisor(true);
    } catch (error) {
      console.error("🚨 Помилка запуску AI:", error);
      alert("⚠️ AI Advisor тимчасово недоступний.");
      setShowAIAdvisor(true);
    }
  };

  const handleSearchToggle = () => {
    if (window.innerWidth < 768) {
      setIsSearchExpanded(!isSearchExpanded);
    }
  };

  const handleDocumentClick = () => {
    window.open(
      "https://ipfs.io/ipfs/QmRXQP1s6rVaiXxrr6jY6Y7EfK1CYvyc82F99siunckoQr/",
      "_blank"
    );
  };

  const refreshPoints = () => {
    fetchUserPoints();
  };

  useEffect(() => {
    window.refreshNavbarPoints = refreshPoints;
    return () => {
      delete window.refreshNavbarPoints;
    };
  }, []);

  // Функція для переходу на сторінку Education
  const handlePointsClick = () => {
    navigate("/education");
  };

  // Основна функція пошуку
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.info("Будь ласка, введіть текст для пошуку");
      return;
    }

    setIsSearching(true);

    try {
      // Отримуємо країну користувача
      let userCountry = null;
      if (currentUser?.id) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("country")
          .eq("id", currentUser.id)
          .single();

        if (
          !userError &&
          userData &&
          userData.country &&
          userData.country !== "all"
        ) {
          userCountry = userData.country;
        }
      }

      // Виконуємо пошук
      const searchResults = await performSearch(searchQuery, userCountry);

      // Переходимо на сторінку результатів
      navigate("/search", {
        state: {
          searchQuery,
          results: searchResults,
          country: userCountry,
        },
      });

      // Закриваємо розширений пошук на мобільних
      if (isMobile) {
        setIsSearchExpanded(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Помилка пошуку. Спробуйте ще раз.");
    } finally {
      setIsSearching(false);
    }
  };

  // Функція для виконання пошуку
  const performSearch = async (query, country) => {
    const results = {
      posts: [],
      comments: [],
      users: [],
    };

    try {
      // Пошук постів
      let postsQuery = supabase
        .from("posts")
        .select("*")
        .or(`content.ilike.%${query}%,media_url.ilike.%${query}%`)
        .limit(50);

      if (country) {
        postsQuery = postsQuery.eq("country_code", country);
      }

      const { data: posts, error: postsError } = await postsQuery;
      if (!postsError) results.posts = posts || [];

      // Пошук коментарів
      let commentsQuery = supabase
        .from("comments")
        .select(
          `
          *,
          posts!inner(*),
          users!inner(username, profile_picture)
        `
        )
        .ilike("content", `%${query}%`)
        .limit(50);

      if (country) {
        commentsQuery = commentsQuery.eq("posts.country_code", country);
      }

      const { data: comments, error: commentsError } = await commentsQuery;
      if (!commentsError) results.comments = comments || [];

      // Пошук користувачів (додатково)
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, username, profile_picture, country, city, status")
        .ilike("username", `%${query}%`)
        .limit(20);

      if (!usersError) results.users = users || [];
    } catch (error) {
      console.error("Search performance error:", error);
    }

    return results;
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {isMobile && (
                <button
                  onClick={onToggleSidebar}
                  className="p-2 rounded-full hover:bg-gray-100 mr-2"
                >
                  <FaBars className="h-5 w-5 text-gray-600" />
                </button>
              )}

              <div
                className="flex items-center cursor-pointer"
                onClick={() => navigate("/country")}
              >
                <div className="flex items-center">
                  <div className="bg-accent text-blue-950 p-1.5 sm:p-2 rounded-md font-bold text-sm sm:text-base">
                    <img
                      src="/logo.png"
                      alt="HRP Logo"
                      className="h-8 sm:h-8 w-auto max-w-[80px] object-contain"
                    />
                  </div>
                  <div className="ml-2">
                    <div className="text-lg font-bold text-navy">
                      <span className="full-text hidden md:inline">
                        HUMAN RIGHTS POLICY DAO
                      </span>
                      <span className="short-text hidden sm:inline md:hidden">
                        HRP DAO
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 hidden md:block">
                      Allow no harm to yourself. Do no harm to others.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {currentUser && (
              <div className="flex-1 flex justify-center">
                <button
                  onClick={handlePointsClick}
                  className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 sm:px-3 py-1 sm:py-2 rounded-full shadow-md hover:from-yellow-500 hover:to-orange-600 transition-all duration-200 cursor-pointer group"
                  title="Click to go to Education page"
                >
                  <FaCoins className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="font-bold">
                    <span className="hidden lg:inline">
                      {totalPoints} Human Rights Points
                    </span>
                    <span className="lg:hidden">{totalPoints}</span>
                  </span>
                  <div className="absolute top-full right-0 mt-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                    Go to Education
                  </div>
                </button>
              </div>
            )}

            <div
              className={`flex items-center space-x-2 sm:space-x-3 ${
                isSearchExpanded ? "hidden" : "flex"
              }`}
            >
              {!isMobile && (
                <div className="flex items-center space-x-3">
                  <div className="relative w-56">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Пошук постів, коментарів, користувачів..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-accent focus:border-accent text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleDocumentClick}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative w-10 h-10 flex items-center justify-center"
                    title="Human Rights Policy"
                  >
                    <FaFileAlt size={28} className="text-black" />
                  </button>
                </div>
              )}

              {isMobile && (
                <button
                  onClick={handleSearchToggle}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                >
                  <FaSearch className="h-5 w-5" />
                </button>
              )}

              {isMobile && (
                <button
                  onClick={handleDocumentClick}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative w-10 h- flex items-center justify-center"
                    title="Human Rights Policy"
                  >
                    <FaFileAlt size={28} className="text-black" />
                  </button>
                )}

              <button
                onClick={handleAIAdvisorClick}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative w-11 h-11 flex items-center justify-center group"
                title="AI Advisor - Допомога з правами людини"
              >
                <RiRobot3Fill size={26} className="text-black-600" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
                  AI Advisor
                </div>
              </button>

              <button
                onClick={handleConnectWallet}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative w-10 h-10 flex items-center justify-center"
                disabled={connected}
                title={connected ? t("walletConnected") : t("connectWallet")}
              >
                <FaWallet
                  size={28}
                  className={connected ? "text-green-500" : "text-gray-600"}
                />
              </button>

              {/* Видалено блок з аватаркою користувача для мобільних пристроїв */}
            </div>
          </div>
        </div>
      </header>

      {isSearchExpanded && (
        <div className="fixed inset-0 top-16 bg-white p-3 border-b shadow-md z-30">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Пошук постів, коментарів, користувачів..."
              className="block w-full pl-10 pr-20 py-2 border border-gray-300 rounded-full leading-5 bg-gray-100 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-accent focus:border-accent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
            />
            <button
              onClick={() => setIsSearchExpanded(false)}
              className="absolute right-12 top-2 p-1 rounded-full hover:bg-gray-200"
            >
              <FaTimes className="h-4 w-4 text-gray-500" />
            </button>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="absolute right-2 top-2 p-1 rounded-full hover:bg-gray-200 disabled:opacity-50"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
              ) : (
                <FaSearch className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      )}

      <AIAdvisor
        isOpen={showAIAdvisor}
        onClose={() => setShowAIAdvisor(false)}
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}

export default Navbar;