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
  FaFilter
} from 'react-icons/fa';
import { supabase } from '../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, Video, MapPin, Calendar, Clock, User, Users, AlertTriangle } from 'lucide-react';

function Violators() {
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, []);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, countryFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('status', 'verified')
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
    const countryNames = {
      'UA': 'Ukraine',
      'RU': 'Russia',
      'BY': 'Belarus',
      'PL': 'Poland',
      'DE': 'Germany',
      'FR': 'France',
      'US': 'USA',
      'GB': 'United Kingdom',
      'CN': 'China',
      'TR': 'Turkey'
    };
    return countryNames[countryCode] || countryCode;
  };

  const getUniqueCountries = () => {
    const countries = complaints.map(c => c.country).filter(Boolean);
    return [...new Set(countries)];
  };

  const handleComplaintClick = (complaint) => {
    setSelectedComplaint(complaint);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedComplaint(null);
    setViewMode('grid');
  };

  const renderEvidencePreview = (evidenceUrls) => {
    if (!evidenceUrls || evidenceUrls.length === 0) return null;

    return (
      <div className="grid grid-cols-3 gap-1">
        {evidenceUrls.slice(0, 3).map((url, idx) => (
          <div key={idx} className="aspect-square bg-gray-100 rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center">
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
          <div className="aspect-square bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-500">+{evidenceUrls.length - 3}</span>
          </div>
        )}
      </div>
    );
  };

  const renderDetailView = () => {
    if (!selectedComplaint) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gray-50 py-8"
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white/95 rounded-2xl shadow-lg p-6 border border-blue-100 backdrop-blur-sm">
            {/* Header and back button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors px-4 py-2 rounded-full border border-gray-300 hover:border-blue-500 text-sm font-medium"
              >
                <FaArrowLeft className="w-4 h-4" />
                Back to list
              </button>
              <h1 className="text-2xl font-bold text-blue-950 text-center flex-1">
                Human Rights Violation Case #{complaints.findIndex(c => c.id === selectedComplaint.id) + 1}
              </h1>
            </div>

            {/* Main information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column - basic data */}
              <div className="space-y-4">
                {/* Violator */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-blue-950 mb-2 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Violator
                  </h3>
                  <p className="text-gray-800 font-medium text-lg">
                    {selectedComplaint.violator_name || 'Not specified'}
                  </p>
                </div>

                {/* Victims */}
                {selectedComplaint.victims_info && (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-blue-950 mb-2 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Affected Persons
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedComplaint.victims_info}
                    </p>
                  </div>
                )}

                {/* Date and time */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-blue-950 mb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Violation Date and Time
                  </h3>
                  <div className="space-y-1 text-gray-700">
                    <p><strong>Date:</strong> {selectedComplaint.violation_date ? formatDate(selectedComplaint.violation_date) : 'Not specified'}</p>
                    <p><strong>Time:</strong> {formatTime(selectedComplaint.violation_time)}</p>
                  </div>
                </div>

                {/* Violation location */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-blue-950 mb-2 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Violation Location
                  </h3>
                  <div className="space-y-1 text-gray-700">
                    <p><strong>Country:</strong> {getCountryName(selectedComplaint.country)}</p>
                    {selectedComplaint.violation_address && (
                      <p><strong>Address:</strong> {selectedComplaint.violation_address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column - violation details */}
              <div className="space-y-4">
                {/* Violation action */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-blue-950 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    Action/Inaction Leading to Violation
                  </h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedComplaint.violation_action}
                  </p>
                </div>

                {/* Consequences */}
                {selectedComplaint.violation_consequences && (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-blue-950 mb-2">
                      Violation Consequences
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedComplaint.violation_consequences}
                    </p>
                  </div>
                )}

                {/* Tools */}
                {selectedComplaint.violation_tools && (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-blue-950 mb-2 flex items-center gap-2">
                      <FaTools className="w-5 h-5 text-blue-600" />
                      Violation Tools/Means
                    </h3>
                    <p className="text-gray-700">
                      {selectedComplaint.violation_tools}
                    </p>
                  </div>
                )}

                {/* Additional comments */}
                {selectedComplaint.additional_comments && (
                  <div className="bg-white p-4 rounded-2xl border border-gray-200">
                    <h3 className="text-lg font-semibold text-blue-950 mb-2">
                      Additional Comments
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedComplaint.additional_comments}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* General description */}
            {selectedComplaint.content && (
              <div className="mt-6 bg-white border border-gray-200 p-4 rounded-2xl">
                <h3 className="text-lg font-semibold text-blue-950 mb-2">
                  General Situation Description
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedComplaint.content}
                </p>
              </div>
            )}

            {/* Evidence */}
            {selectedComplaint.evidence_urls && selectedComplaint.evidence_urls.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-blue-950 mb-4">Violation Evidence</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedComplaint.evidence_urls.map((url, idx) => (
                    <div key={idx} className="bg-gray-100 rounded-xl border border-gray-300 overflow-hidden group cursor-pointer">
                      {url.includes('.mp4') || url.includes('.mov') || url.includes('.avi') ? (
                        <div 
                          className="aspect-square flex items-center justify-center bg-white hover:bg-gray-50 transition-colors border border-gray-200"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <div className="text-center">
                            <Video className="w-6 h-6 mb-2 mx-auto text-gray-600" />
                            <span className="text-sm text-gray-700">Video {idx + 1}</span>
                          </div>
                        </div>
                      ) : url.includes('.pdf') ? (
                        <div 
                          className="aspect-square flex items-center justify-center bg-white hover:bg-gray-50 transition-colors border border-gray-200"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <div className="text-center">
                            <FileText className="w-6 h-6 mb-2 mx-auto text-gray-600" />
                            <span className="text-sm text-gray-700">Document {idx + 1}</span>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={url} 
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                          onClick={() => window.open(url, '_blank')}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                Case published: {formatDate(selectedComplaint.created_at)}
                {selectedComplaint.is_anonymous && ' • Anonymous complaint'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'detail') {
    return renderDetailView();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-8"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white/95 rounded-2xl shadow-lg p-6 mb-8 border border-blue-100 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-blue-600 w-8 h-8" />
            <h1 className="text-2xl font-bold text-blue-950">Human Rights Violation Cases</h1>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Database of documented human rights violations. Information is constantly updated and verified.
            </p>
            
            {/* Filters and search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by violator, location, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                />
              </div>
              
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm shadow-sm"
                >
                  <option value="">All countries</option>
                  {getUniqueCountries().map(country => (
                    <option key={country} value={country}>
                      {getCountryName(country)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="text-sm text-gray-600 flex items-center">
                Found: {filteredComplaints.length} of {complaints.length} cases
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
                <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {filteredComplaints.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl text-center border border-gray-200">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredComplaints.map((complaint, index) => (
                  <motion.div 
                    key={complaint.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
                    onClick={() => handleComplaintClick(complaint)}
                  >
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-blue-950">
                          Case #{index + 1}
                        </h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-medium">
                          Verified
                        </span>
                      </div>
                      <h4 className="text-md font-medium text-blue-600 truncate">
                        {complaint.violator_name || 'Violator name not specified'}
                      </h4>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Victims */}
                      {complaint.victims_info && (
                        <div className="flex items-start gap-2">
                          <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Victims:</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{complaint.victims_info}</p>
                          </div>
                        </div>
                      )}

                      {/* Date and time */}
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Date:</p>
                          <p className="text-sm text-gray-600">
                            {complaint.violation_date ? formatDate(complaint.violation_date) : 'Not specified'}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      {(complaint.country || complaint.violation_address) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Location:</p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {complaint.country && getCountryName(complaint.country)}
                              {complaint.violation_address && `, ${complaint.violation_address}`}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Violation action */}
                      {complaint.violation_action && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Violation:</p>
                          <p className="text-sm text-gray-600 line-clamp-3">{complaint.violation_action}</p>
                        </div>
                      )}

                      {/* Evidence */}
                      {complaint.evidence_urls && complaint.evidence_urls.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Evidence:</p>
                          {renderEvidencePreview(complaint.evidence_urls)}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {formatDate(complaint.created_at)}
                        {complaint.is_anonymous && ' • Anonymous'}
                      </p>
                      <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                        <FaEye className="w-3 h-3" />
                        <span>Details</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Violators;