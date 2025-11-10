import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaTimes, FaEye, FaShieldAlt, FaChartBar, FaClock, FaList, FaPlay, FaFile, FaUser, FaEnvelope, FaPhone, FaChevronDown, FaChevronUp, FaExpand } from 'react-icons/fa';
import { Shield, X, FileText, User, Users, MapPin, Calendar, Clock, AlertTriangle, Settings, Maximize2 } from 'lucide-react';
import { supabase } from '../utils/supabase';

function Moderation() {
  const { t } = useTranslation();
  const [pendingComplaints, setPendingComplaints] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('moderation');
  const [expandedComplaint, setExpandedComplaint] = useState(null);
  const [userData, setUserData] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchAllComplaints();
  }, []);

  const fetchAllComplaints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllComplaints(data || []);
      setPendingComplaints(data?.filter(complaint => complaint.status === 'pending') || []);
      await fetchUsersData(data || []);
    } catch (err) {
      console.error('Error loading complaints:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersData = async (complaints) => {
    try {
      const userIds = [...new Set(
        complaints
          .filter(complaint => !complaint.is_anonymous && complaint.user_id)
          .map(complaint => complaint.user_id)
      )];

      if (userIds.length === 0) return;

      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, full_name, phone, created_at')
        .in('id', userIds);

      if (error) throw error;

      const usersMap = {};
      users.forEach(user => {
        usersMap[user.id] = user;
      });
      setUserData(usersMap);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const updateComplaintStatus = async (complaintId, status) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', complaintId);

      if (error) throw error;

      await fetchAllComplaints();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    }
  };

  const toggleExpandComplaint = (complaintId) => {
    setExpandedComplaint(expandedComplaint === complaintId ? null : complaintId);
  };

  const openImageModal = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const renderUserInfo = (complaint) => {
    if (complaint.is_anonymous) {
      return (
        <div className="flex items-center gap-2 text-orange-600 text-sm">
          <User className="w-3 h-3" />
          <span>Anonymous complaint</span>
        </div>
      );
    }

    const user = userData[complaint.user_id];
    
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <User className="w-3 h-3" />
          <span>Identified user</span>
        </div>
        
        {user && (
          <div className="bg-green-50 px-2 py-1 rounded-full border border-green-200 text-xs space-y-0.5">
            {user.full_name && (
              <div className="flex items-center gap-1">
                <span className="text-green-800 font-medium">{user.full_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-green-700">
              <FaEnvelope className="w-2 h-2" />
              <span>{user.email}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEvidencePreview = (evidenceUrls, complaintId) => {
    if (!evidenceUrls || evidenceUrls.length === 0) return null;

    const isExpanded = expandedComplaint === complaintId;
    const displayUrls = isExpanded ? evidenceUrls : evidenceUrls.slice(0, 3);

    return (
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-blue-950">
            Evidence: {evidenceUrls.length} file(s)
          </p>
          {evidenceUrls.length > 3 && (
            <button
              onClick={() => toggleExpandComplaint(complaintId)}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
            >
              {isExpanded ? <FaChevronUp className="w-2 h-2" /> : <FaChevronDown className="w-2 h-2" />}
              {isExpanded ? 'Less' : 'More'}
            </button>
          )}
        </div>
        
        <div className={`grid gap-1 ${isExpanded ? 'grid-cols-3 md:grid-cols-4' : 'grid-cols-3'}`}>
          {displayUrls.map((url, idx) => (
            <div key={idx} className="relative group">
              {url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') ? (
                <div 
                  className="aspect-square bg-black rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                >
                  <div className="text-center text-white">
                    <FaPlay className="w-3 h-3 mx-auto mb-0.5" />
                    <span className="text-xs">Video</span>
                  </div>
                </div>
              ) : url.includes('.pdf') ? (
                <div 
                  className="aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => window.open(url, '_blank')}
                >
                  <div className="text-center">
                    <FaFile className="w-3 h-3 text-red-500 mx-auto mb-0.5" />
                    <span className="text-xs text-gray-700">PDF</span>
                  </div>
                </div>
              ) : (
                <div 
                  className="aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                  onClick={() => openImageModal(url)}
                >
                  <img 
                    src={url} 
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <Maximize2 className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not specified';
    return timeString;
  };

  const getCountryName = (countryCode) => {
    const countryNames = {
      'UA': 'Ukraine', 'RU': 'Russia', 'BY': 'Belarus', 'PL': 'Poland',
      'DE': 'Germany', 'FR': 'France', 'US': 'USA', 'GB': 'United Kingdom'
    };
    return countryNames[countryCode] || countryCode;
  };

  const stats = {
    total: allComplaints.length,
    pending: allComplaints.filter(c => c.status === 'pending').length,
    verified: allComplaints.filter(c => c.status === 'verified').length,
    rejected: allComplaints.filter(c => c.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Image preview modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <img 
              src={selectedImage} 
              alt="Violation evidence"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              Press ESC or click outside the image to close
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-blue-100 backdrop-blur-sm p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-blue-600 w-5 h-5" />
              <h1 className="text-lg font-semibold text-blue-950">Moderation Panel</h1>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('moderation')}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'moderation'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FaList className="w-3 h-3" />
                Moderation ({stats.pending})
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FaChartBar className="w-3 h-3" />
                Statistics
              </button>
            </div>

            {error && (
              <div className="mb-3 p-2 bg-red-50 text-red-800 rounded-full border border-red-100 flex items-start gap-2 text-sm">
                <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-red-700 opacity-90">{error}</p>
                </div>
              </div>
            )}

            {/* Tab content */}
            {activeTab === 'stats' ? (
              <div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-blue-50 p-2 rounded-xl text-center">
                    <FaClock className="text-blue-500 text-lg mx-auto mb-1" />
                    <p className="text-lg font-bold text-blue-700">{stats.pending}</p>
                    <p className="text-xs text-blue-600">Pending</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-xl text-center">
                    <FaCheck className="text-green-500 text-lg mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-700">{stats.verified}</p>
                    <p className="text-xs text-green-600">Verified</p>
                  </div>
                  <div className="bg-red-50 p-2 rounded-xl text-center">
                    <FaTimes className="text-red-500 text-lg mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-700">{stats.rejected}</p>
                    <p className="text-xs text-red-600">Rejected</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-xl text-center">
                    <FaChartBar className="text-gray-500 text-lg mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-700">{stats.total}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                </div>

                <button
                  onClick={() => window.location.href = '/violators'}
                  className="w-full px-3 py-2 rounded-full font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-xl bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 hover:from-blue-950 hover:via-blue-900 hover:to-blue-800"
                >
                  <FaEye className="w-3 h-3" />
                  View verified complaints
                </button>
              </div>
            ) : (
              <div>
                {pendingComplaints.length === 0 ? (
                  <div className="text-center py-6">
                    <FaCheck className="text-green-500 text-2xl mx-auto mb-2" />
                    <h3 className="font-semibold text-green-900 text-sm mb-1">No complaints for moderation</h3>
                    <p className="text-green-800 text-xs">All complaints have been reviewed</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-600 text-sm text-center">
                      Found {pendingComplaints.length} complaints for moderation
                    </p>

                    <div className="space-y-2">
                      {pendingComplaints.map((complaint) => (
                        <div key={complaint.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                          {/* Header and buttons */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-gray-800 mb-1">
                                Complaint from {formatDate(complaint.created_at)}
                              </h3>
                              {renderUserInfo(complaint)}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => updateComplaintStatus(complaint.id, 'verified')}
                                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-full flex items-center gap-1 transition-colors text-xs font-medium"
                              >
                                <FaCheck className="w-2 h-2" />
                                Approve
                              </button>
                              <button
                                onClick={() => updateComplaintStatus(complaint.id, 'rejected')}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-full flex items-center gap-1 transition-colors text-xs font-medium"
                              >
                                <FaTimes className="w-2 h-2" />
                                Reject
                              </button>
                            </div>
                          </div>

                          {/* Main information */}
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-gray-500" />
                              <span><strong>Violator:</strong> {complaint.violator_name || 'Not specified'}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-gray-500" />
                              <span><strong>Location:</strong> {getCountryName(complaint.country)}{complaint.violation_address && `, ${complaint.violation_address}`}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span><strong>Date:</strong> {formatDate(complaint.violation_date)} {complaint.violation_time && ` at ${complaint.violation_time}`}</span>
                            </div>

                            {complaint.victims_info && (
                              <div className="flex items-start gap-2">
                                <Users className="w-3 h-3 text-gray-500 mt-0.5" />
                                <div>
                                  <strong>Victims:</strong> 
                                  <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{complaint.victims_info}</p>
                                </div>
                              </div>
                            )}

                            {complaint.violation_action && (
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-gray-500 mt-0.5" />
                                <div>
                                  <strong>Violation:</strong> 
                                  <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{complaint.violation_action}</p>
                                </div>
                              </div>
                            )}

                            {complaint.violation_consequences && (
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-gray-500 mt-0.5" />
                                <div>
                                  <strong>Consequences:</strong> 
                                  <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{complaint.violation_consequences}</p>
                                </div>
                              </div>
                            )}

                            {complaint.violation_tools && (
                              <div className="flex items-center gap-2">
                                <Settings className="w-3 h-3 text-gray-500" />
                                <span><strong>Tools:</strong> {complaint.violation_tools}</span>
                              </div>
                            )}

                            {complaint.additional_comments && (
                              <div className="flex items-start gap-2">
                                <FileText className="w-3 h-3 text-gray-500 mt-0.5" />
                                <div>
                                  <strong>Comments:</strong> 
                                  <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{complaint.additional_comments}</p>
                                </div>
                              </div>
                            )}

                            {complaint.content && (
                              <div className="flex items-start gap-2">
                                <FileText className="w-3 h-3 text-gray-500 mt-0.5" />
                                <div>
                                  <strong>Description:</strong> 
                                  <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{complaint.content}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Evidence */}
                          {renderEvidencePreview(complaint.evidence_urls, complaint.id)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Moderation;