import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaTrash, FaUserCircle, FaExternalLinkAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import countries from '../utils/countries';
import MainLayout from '../components/layout/MainLayout';

const ServiceDetails = () => {
  const { t, i18n } = useTranslation();
  const { serviceKey, id } = useParams();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [serviceAuthors, setServiceAuthors] = useState({});
  const [error, setError] = useState(null);
  const [expandedServices, setExpandedServices] = useState({});

  const serviceTypes = {
    administrative: t('services.administrative'),
    'education-culture': t('services.educationCulture'),
    healthcare: t('services.healthcare'),
    'security-law': t('services.securityLaw'),
    'infrastructure-utilities': t('services.infrastructureUtilities'),
    'economic-financial': t('services.economicFinancial'),
    'digital-information': t('services.digitalInformation'),
    environmental: t('services.environmental'),
    international: t('services.international'),
    'social-community': t('services.socialCommunity'),
  };

  const serviceDescriptions = {
    administrative: [
      t('services.administrativeDesc.citizenship'),
      t('services.administrativeDesc.documents'),
      t('services.administrativeDesc.taxes'),
      t('services.administrativeDesc.socialPayments'),
      t('services.administrativeDesc.businessReg'),
    ],
    'education-culture': [
      t('services.educationCultureDesc.education'),
      t('services.educationCultureDesc.culturalPrograms'),
      t('services.educationCultureDesc.languageCourses'),
    ],
    healthcare: [
      t('services.healthcareDesc.medical'),
      t('services.healthcareDesc.insurance'),
      t('services.healthcareDesc.telemedicine'),
    ],
    'security-law': [
      t('services.securityLawDesc.police'),
      t('services.securityLawDesc.judicial'),
      t('services.securityLawDesc.cybersecurity'),
    ],
    'infrastructure-utilities': [
      t('services.infrastructureUtilitiesDesc.transport'),
      t('services.infrastructureUtilitiesDesc.utilities'),
      t('services.infrastructureUtilitiesDesc.housing'),
    ],
    'economic-financial': [
      t('services.economicFinancialDesc.businessSupport'),
      t('services.economicFinancialDesc.trade'),
    ],
    'digital-information': [
      t('services.digitalInformationDesc.egovernment'),
      t('services.digitalInformationDesc.news'),
      t('services.digitalInformationDesc.stats'),
    ],
    environmental: [
      t('services.environmentalDesc.protection'),
      t('services.environmentalDesc.greenInitiatives'),
    ],
    international: [
      t('services.internationalDesc.consular'),
      t('services.internationalDesc.peacekeeping'),
    ],
    'social-community': [
      t('services.socialCommunityDesc.volunteering'),
      t('services.socialCommunityDesc.forums'),
      t('services.socialCommunityDesc.minorities'),
    ],
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Error retrieving user:', authError);
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
      }
    };

    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchCurrentUser();

        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('country', id.toLowerCase())
          .eq('service_type', serviceKey);
        
        if (servicesError) throw servicesError;
        setServices(servicesData || []);

        if (servicesData && servicesData.length > 0) {
          const userIds = [...new Set(servicesData.map(service => service.user_id))];
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, username, profile_picture')
            .in('id', userIds);
          
          if (!usersError && usersData) {
            const authorsMap = {};
            usersData.forEach(user => {
              authorsMap[user.id] = user;
            });
            setServiceAuthors(authorsMap);
          }
        }

        const serviceIds = servicesData?.map((service) => service.id) || [];
        for (const serviceId of serviceIds) {
          await fetchComments(serviceId);
        }
      } catch (error) {
        console.error('Помилка отримання даних:', error);
        setError(t('errors.dataFetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, serviceKey, t]);

  const fetchComments = async (serviceId) => {
    try {
      const { data, error } = await supabase
        .from('service_comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          users!left (username, profile_picture)
        `)
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setComments((prev) => ({
        ...prev,
        [serviceId]: data.map((comment) => ({
          ...comment,
          user: comment.users ? { 
            username: comment.users.username,
            profile_picture: comment.users.profile_picture
          } : { 
            username: comment.user_id,
            profile_picture: null
          },
        })) || [],
      }));
    } catch (error) {
      console.error('Помилка отримання коментарів:', error);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!currentUser) {
      alert(t('errors.loginRequired'));
      return;
    }
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      setServices(services.filter((service) => service.id !== serviceId));
    } catch (error) {
      console.error('Помилка видалення сервісу:', error);
      alert(t('errors.deleteServiceFailed'));
    }
  };

  const handleEditService = (service) => {
    setEditingServiceId(service.id);
    setEditForm({
      company_name: service.company_name,
      phone: service.phone,
      address: service.address,
      cost: service.cost,
      description: service.description,
    });
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (!currentUser || !editingServiceId) return;
    try {
      const { error } = await supabase
        .from('services')
        .update({
          ...editForm,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingServiceId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      setServices(
        services.map((service) =>
          service.id === editingServiceId ? { ...service, ...editForm } : service
        )
      );
      setEditingServiceId(null);
      setEditForm({});
    } catch (error) {
      console.error('Помилка оновлення сервісу:', error);
      alert(t('errors.updateServiceFailed'));
    }
  };

  const handleCommentSubmit = async (serviceId) => {
    if (!currentUser) {
      alert(t('errors.loginRequired'));
      return;
    }
    if (!newComment[serviceId]) {
      alert(t('errors.emptyComment'));
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('service_comments')
        .insert({
          service_id: serviceId,
          user_id: currentUser.id,
          content: newComment[serviceId],
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          users!left (username, profile_picture)
        `)
        .single();
      
      if (error) throw error;
      
      setComments((prev) => ({
        ...prev,
        [serviceId]: [
          ...(prev[serviceId] || []),
          {
            ...data,
            user: data.users ? { 
              username: data.users.username,
              profile_picture: data.users.profile_picture
            } : { 
              username: currentUser.id,
              profile_picture: null
            },
          },
        ],
      }));
      setNewComment((prev) => ({ ...prev, [serviceId]: '' }));
    } catch (error) {
      console.error('Помилка додавання коментаря:', error);
      alert(t('errors.commentFailed'));
    }
  };

  const handleDeleteComment = async (commentId, serviceId) => {
    if (!currentUser) {
      alert(t('errors.loginRequired'));
      return;
    }
    try {
      const { error } = await supabase
        .from('service_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUser.id);
      
      if (error) throw error;
      
      setComments((prev) => ({
        ...prev,
        [serviceId]: prev[serviceId].filter((comment) => comment.id !== commentId),
      }));
    } catch (error) {
      console.error('Помилка видалення коментаря:', error);
      alert(t('errors.deleteCommentFailed'));
    }
  };

  const toggleServiceComments = (serviceId) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const countryData = countries.find((c) => c.code.toLowerCase() === id?.toLowerCase());
  const countryName = countryData ? countryData.name[i18n.language] || countryData.name['en'] : 'Unknown';

  const serviceDetailsContent = (
    <div className="w-full mx-auto px-2 sm:px-4 flex-1 mt-2 sm:mt-4 pb-4">
      <div className="space-y-3 sm:space-y-4">
        <div className="bg-white/95 p-6 rounded-2xl shadow-lg border border-blue-100 backdrop-blur-sm mb-6">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-3xl font-bold text-blue-950">
              {t('services.title', { country: countryName })}
            </h1>
            <h2 className="text-2xl font-semibold text-blue-800">
              {serviceTypes[serviceKey]}
            </h2>
          </div>
          
          {/* Service Description */}
          <div className="mb-8">
            <ul className="space-y-2">
              {serviceDescriptions[serviceKey]?.map((desc, index) => (
                <li key={index} className="flex items-start text-blue-900">
                  <span className="mr-2 text-blue-600">•</span> 
                  <span className="text-sm">{desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
            </div>
          ) : services.length > 0 ? (
            <div className="space-y-6">
              {services.map((service) => (
                <div key={service.id} className="bg-white border border-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  {editingServiceId === service.id ? (
                    <form onSubmit={handleUpdateService} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-blue-950 mb-2">
                          {t('services.companyName')}
                        </label>
                        <input
                          type="text"
                          value={editForm.company_name || ''}
                          onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-950 mb-2">
                          {t('services.phone')}
                        </label>
                        <input
                          type="text"
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-950 mb-2">
                          {t('services.address')}
                        </label>
                        <input
                          type="text"
                          value={editForm.address || ''}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-950 mb-2">
                          {t('services.cost')}
                        </label>
                        <input
                          type="text"
                          value={editForm.cost || ''}
                          onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-950 mb-2">
                          {t('services.description')}
                        </label>
                        <textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                          rows={4}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setEditingServiceId(null)}
                          className="px-6 py-2.5 border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium"
                        >
                          {t('services.cancel')}
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                        >
                          {t('services.update')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h2 className="text-xl font-semibold text-blue-900 mb-2">
                            {service.company_name}
                          </h2>
                          
                          {/* Service author display */}
                          {serviceAuthors[service.user_id] && (
                            <div className="flex items-center">
                              {serviceAuthors[service.user_id].profile_picture ? (
                                <img
                                  src={serviceAuthors[service.user_id].profile_picture}
                                  alt={serviceAuthors[service.user_id].username}
                                  className="w-6 h-6 rounded-full mr-2"
                                />
                              ) : (
                                <FaUserCircle className="w-5 h-5 text-gray-400 mr-2" />
                              )}
                              <span className="text-sm text-gray-600 mr-2">
                                {serviceAuthors[service.user_id].username}
                              </span>
                              <a
                                href={`/public/${service.user_id}`}
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center transition-colors"
                                title={t('viewProfile')}
                              >
                                <FaExternalLinkAlt className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                        
                        {currentUser && service.user_id === currentUser.id && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditService(service)}
                              className="text-blue-500 hover:text-blue-700 transition-colors p-2 rounded-full hover:bg-blue-50"
                              title={t('services.edit')}
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-50"
                              title={t('services.delete')}
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3 text-sm text-gray-700">
                        {service.phone && (
                          <p>
                            <span className="font-medium text-blue-950">{t('services.phone')}:</span> 
                            <span className="ml-2 text-blue-900">{service.phone}</span>
                          </p>
                        )}
                        
                        {service.address && (
                          <p>
                            <span className="font-medium text-blue-950">{t('services.address')}:</span> 
                            <span className="ml-2 text-blue-900">{service.address}</span>
                          </p>
                        )}
                        
                        {service.cost && (
                          <p>
                            <span className="font-medium text-blue-950">{t('services.cost')}:</span> 
                            <span className="ml-2 text-blue-900">{service.cost}</span>
                          </p>
                        )}
                        
                        {service.description && (
                          <p className="pt-2 border-t border-gray-100">
                            <span className="font-medium text-blue-950">{t('services.description')}:</span> 
                            <span className="ml-2 text-blue-900 block mt-1">{service.description}</span>
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                          {t('services.added')}: {new Date(service.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Comments Section - Always visible for input, comments list toggleable */}
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-semibold text-blue-950">
                            {t('comments')}
                          </h4>
                          <button
                            onClick={() => toggleServiceComments(service.id)}
                            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors text-sm font-medium"
                          >
                            {expandedServices[service.id] ? (
                              <>
                                <FaChevronUp className="w-3 h-3 mr-1" />
                                {t('hideComments')}
                              </>
                            ) : (
                              <>
                                <FaChevronDown className="w-3 h-3 mr-1" />
                                {t('showComments')} {comments[service.id]?.length > 0 && `(${comments[service.id].length})`}
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Comment input - always visible */}
                        <div className="mb-4">
                          {currentUser ? (
                            <>
                              <textarea
                                value={newComment[service.id] || ''}
                                onChange={(e) => setNewComment((prev) => ({ ...prev, [service.id]: e.target.value }))}
                                placeholder={t('writeComment')}
                                className="w-full p-3 border border-gray-200 rounded-2xl bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                rows={2}
                              />
                              
                              <button
                                onClick={() => handleCommentSubmit(service.id)}
                                className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white rounded-full hover:from-blue-950 hover:via-blue-900 hover:to-blue-800 transition-all duration-300 text-sm font-medium shadow-md hover:shadow-lg"
                              >
                                {t('submit')}
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">
                              {t('errors.loginToComment')}
                            </p>
                          )}
                        </div>
                        
                        {/* Comments list - only visible when expanded */}
                        {expandedServices[service.id] && (
                          <>
                            {comments[service.id]?.length > 0 ? (
                              <div className="space-y-4">
                                {comments[service.id].map((comment) => (
                                  <div key={comment.id} className="flex items-start space-x-3">
                                    {comment.user.profile_picture ? (
                                      <img
                                        src={comment.user.profile_picture}
                                        alt={comment.user.username}
                                        className="w-8 h-8 rounded-full flex-shrink-0"
                                      />
                                    ) : (
                                      <FaUserCircle className="w-8 h-8 text-gray-400 flex-shrink-0" />
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="text-sm font-medium text-blue-900">
                                            {comment.user.username}
                                          </p>
                                          <p className="text-sm text-blue-800 mt-1">
                                            {comment.content}
                                          </p>
                                        </div>
                                        
                                        {currentUser && comment.user_id === currentUser.id && (
                                          <button
                                            onClick={() => handleDeleteComment(comment.id, service.id)}
                                            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                                            title={t('services.delete')}
                                          >
                                            <FaTrash className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                      
                                      <p className="text-xs text-gray-400 mt-1">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">{t('noComments')}</p>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('services.noServices')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <MainLayout 
      currentUser={currentUser}
      showRightSidebar={true}
    >
      {serviceDetailsContent}
    </MainLayout>
  );
};

export default ServiceDetails;