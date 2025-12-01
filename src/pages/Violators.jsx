import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FaExclamationTriangle, 
  FaUser, 
  FaMapMarkerAlt, 
  FaCalendar, 
  FaTools, 
  FaEye, 
  FaArrowLeft,
  FaSearch,
  FaFilter,
  FaShare
} from 'react-icons/fa';
import { supabase } from '../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, Video, MapPin, Calendar, Clock, User, Users, AlertTriangle } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import countries from '../utils/countries';

function Violators() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [countryCaseNumbers, setCountryCaseNumbers] = useState({});

  useEffect(() => {
    fetchComplaints();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, countryFilter, dateFilter]);

  useEffect(() => {
    // Calculate permanent case numbers for each country
    if (complaints.length > 0) {
      const caseNumbers = {};
      const countryComplaints = {};
      
      // Group complaints by country
      complaints.forEach(complaint => {
        const country = complaint.country || 'UNKNOWN';
        if (!countryComplaints[country]) {
          countryComplaints[country] = [];
        }
        countryComplaints[country].push(complaint);
      });
      
      // Sort complaints within each country by creation date and assign permanent numbers
      Object.keys(countryComplaints).forEach(country => {
        const sortedComplaints = countryComplaints[country].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        
        sortedComplaints.forEach((complaint, index) => {
          caseNumbers[complaint.id] = `${country}-${index + 1}`;
        });
      });
      
      setCountryCaseNumbers(caseNumbers);
    }
  }, [complaints]);

  const fetchCurrentUser = async () => {
    try {
      setUserLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Error retrieving user:', authError);
        setUserLoading(false);
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
      setUserLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('status', 'verified')
        .eq('hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterComplaints = () => {
    let filtered = complaints;

    if (searchTerm) {
      filtered = filtered.filter(complaint => 
        complaint.violator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.violation_action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.violation_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.victims_info?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (countryFilter) {
      filtered = filtered.filter(complaint => 
        complaint.country === countryFilter
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(complaint => {
        const complaintDate = new Date(complaint.created_at);
        switch (dateFilter) {
          case 'today':
            return complaintDate.toDateString() === now.toDateString();
          case 'week':
            return complaintDate >= new Date(now.getTime() - 7 * 86400000);
          case 'month':
            return complaintDate >= new Date(now.getTime() - 30 * 86400000);
          case 'year':
            return complaintDate >= new Date(now.getTime() - 365 * 86400000);
          default:
            return true;
        }
      });
    }

    setFilteredComplaints(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not specified';
    return timeString;
  };

  const getCountryName = (countryCode) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? (country.name[i18n.language] || country.name.en) : countryCode;
  };

  const getUniqueCountries = () => {
    const countries = complaints.map(c => c.country).filter(Boolean);
    return [...new Set(countries)];
  };

  const getCaseNumber = (complaintId) => {
    return countryCaseNumbers[complaintId] || 'UNKNOWN-1';
  };

  const handleShare = async (complaint, e) => {
    e.stopPropagation(); // Prevent navigation to details page
    const caseNumber = getCaseNumber(complaint.id);
    const shareText = `Human Rights Violation Case #${caseNumber}: ${complaint.violator_name || 'Violator'} - ${complaint.violation_action || 'Violation'}`;
    const shareUrl = `${window.location.origin}/complaint-details/${complaint.id}`;
    
    // Check if Web Share API is available and mobile device
    if (navigator.share && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `Case #${caseNumber}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        console.log('Error sharing:', error);
        // Fall through to clipboard method if share fails
      }
    }
    
    // Fallback: copy to clipboard for desktop or if Web Share fails
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Case link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Final fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${shareText}\n${shareUrl}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Case link copied to clipboard!');
    }
  };

  // ЗМІНА: Замість модального вікна - перехід на окрему сторінку
  const handleComplaintClick = (complaint) => {
    navigate(`/complaint-details/${complaint.id}`);
  };

  const navigateToViolationsMap = () => {
    navigate('/violations-map');
  };

  const renderEvidencePreview = (evidenceUrls) => {
    if (!evidenceUrls || evidenceUrls.length === 0) return null;

    return (
      <div className="flex gap-1 overflow-x-auto pb-1">
        {evidenceUrls.slice(0, 3).map((url, idx) => (
          <div key={idx} className="w-14 h-14 bg-gray-100 rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center">
            {url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') ? (
              <div className="text-center p-1">
                <Video className="w-3 h-3 text-gray-500 mx-auto" />
                <span className="text-xs text-gray-500">Video</span>
              </div>
            ) : url.includes('.pdf') ? (
              <div className="text-center p-1">
                <FileText className="w-3 h-3 text-gray-500 mx-auto" />
                <span className="text-xs text-gray-500">PDF</span>
              </div>
            ) : (
              <img 
                src={url} 
                alt={`Evidence ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(url, '_blank')}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            )}
            <div className="hidden items-center justify-center text-center p-1 w-full h-full">
              <span className="text-xs text-gray-500">📎 File</span>
            </div>
          </div>
        ))}
        {evidenceUrls.length > 3 && (
          <div className="w-14 h-14 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-500">+{evidenceUrls.length - 3}</span>
          </div>
        )}
      </div>
    );
  };

  const violatorsContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-4 px-3 sm:py-8 sm:px-4 overflow-x-hidden"
    >
      <div className="max-w-4xl mx-auto w-full min-w-0">
        <div className="bg-white/95 rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-blue-100 backdrop-blur-sm min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <Shield className="text-blue-600 w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl font-bold text-blue-950 truncate min-w-0">
                Human Rights Violation Cases
              </h1>
            </div>
            <button
              onClick={navigateToViolationsMap}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-md w-full sm:w-auto flex-shrink-0"
            >
              <MapPin className="w-4 h-4" />
              Map
            </button>
          </div>
          
          <div className="space-y-4 min-w-0">
            <p className="text-gray-600 text-sm text-center sm:text-left">
              Database of documented human rights violations. 
            </p>
            
            {/* Filters and search */}
            <div className="grid grid-cols-1 gap-3 mb-6 min-w-0">
              <div className="relative min-w-0">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by violator, location, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm min-w-0"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 min-w-0">
                <div className="relative min-w-0">
                  <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm shadow-sm min-w-0"
                  >
                    <option value="">All countries</option>
                    {getUniqueCountries().map(country => (
                      <option key={country} value={country}>
                        {getCountryName(country)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-0">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm shadow-sm min-w-0"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 flex items-center justify-center min-w-0">
                Found: {filteredComplaints.length} of {complaints.length} cases
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 p-4 rounded-2xl border border-red-200 min-w-0">
                <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-red-800 break-words">{error}</p>
              </div>
            )}

            {filteredComplaints.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl text-center border border-gray-200 min-w-0">
                <FaExclamationTriangle className="text-gray-400 text-4xl mx-auto mb-3" />
                <h3 className="font-semibold text-gray-700 mb-2">
                  {complaints.length === 0 ? 'Information is being updated' : 'Nothing found'}
                </h3>
                <p className="text-gray-600">
                  {complaints.length === 0 
                    ? 'There are currently no published human rights violation cases.'
                    : 'Try changing your search parameters.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4 min-w-0">
                {filteredComplaints.map((complaint, index) => {
                  const caseNumber = getCaseNumber(complaint.id);
                  
                  return (
                    <motion.div 
                      key={complaint.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-1 min-w-0 overflow-hidden"
                      onClick={() => handleComplaintClick(complaint)}
                    >
                      <div className="p-4 border-b border-gray-100 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 min-w-0">
                          <h3 className="text-lg font-semibold text-blue-950 break-words min-w-0">
                            Case #{caseNumber}
                          </h3>
                          
                        </div>
                        <h4 className="text-md font-medium text-blue-600 break-words min-w-0">
                          {complaint.violator_name || 'Violator name not specified'}
                        </h4>
                      </div>

                      <div className="p-4 space-y-3 min-w-0">
                        {/* Victims */}
                        {complaint.victims_info && (
                          <div className="flex items-start gap-2 min-w-0">
                            <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-700">Victims:</p>
                              <p className="text-sm text-gray-600 break-words min-w-0">{complaint.victims_info}</p>
                            </div>
                          </div>
                        )}

                        {/* Date and time */}
                        <div className="flex items-start gap-2 min-w-0">
                          <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700">Date:</p>
                            <p className="text-sm text-gray-600 break-words min-w-0">
                              {complaint.violation_date ? formatDate(complaint.violation_date) : 'Not specified'}
                            </p>
                          </div>
                        </div>

                        {/* Location */}
                        {(complaint.country || complaint.violation_address) && (
                          <div className="flex items-start gap-2 min-w-0">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-700">Location:</p>
                              <p className="text-sm text-gray-600 break-words min-w-0">
                                {complaint.country && getCountryName(complaint.country)}
                                {complaint.violation_address && `, ${complaint.violation_address}`}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Violation action */}
                        {complaint.violation_action && (
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 mb-1">Violation:</p>
                            <p className="text-sm text-gray-600 break-words min-w-0">{complaint.violation_action}</p>
                          </div>
                        )}

                        {/* Evidence */}
                        {complaint.evidence_urls && complaint.evidence_urls.length > 0 && (
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 mb-2">Evidence:</p>
                            {renderEvidencePreview(complaint.evidence_urls)}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                        <p className="text-xs text-gray-500 break-words min-w-0">
                          {formatDate(complaint.created_at)}
                          {complaint.is_anonymous && ' • Anonymous'}
                        </p>
                        <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                          <button 
                            onClick={(e) => handleShare(complaint, e)}
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium transition-colors"
                          >
                            <FaShare className="w-3 h-3" />
                            <span>Share</span>
                          </button>
                          <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                            <FaEye className="w-3 h-3" />
                            <span>View Details</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout currentUser={currentUser}>
      {violatorsContent}
    </MainLayout>
  );
}

export default Violators;