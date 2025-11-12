import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaTrash, FaUserCircle, FaExternalLinkAlt } from 'react-icons/fa';
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

  const countryData = countries.find((c) => c.code.toLowerCase() === id?.toLowerCase());
  const countryName = countryData ? countryData.name[i18n.language] || countryData.name['en'] : 'Unknown';

  const serviceDetailsContent = (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-primary mb-6">
        {t('services.title', { country: countryName })}
      </h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-primary mb-4">
          {serviceTypes[serviceKey]}
        </h2>
        
        <ul className="list-disc pl-5 text-gray-600 space-y-1">
          {serviceDescriptions[serviceKey]?.map((desc, index) => (
            <li key={index} className="text-sm">{desc}</li>
          ))}
        </ul>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : services.length > 0 ? (
        <div className="space-y-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {editingServiceId === service.id ? (
                <form onSubmit={handleUpdateService} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('services.companyName')}
                    </label>
                    <input
                      type="text"
                      value={editForm.company_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('services.phone')}
                    </label>
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('services.address')}
                    </label>
                    <input
                      type="text"
                      value={editForm.address || ''}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('services.cost')}
                    </label>
                    <input
                      type="text"
                      value={editForm.cost || ''}
                      onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('services.description')}
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditingServiceId(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {t('services.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                    >
                      {t('services.update')}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">
                        {service.company_name}
                      </h2>
                      
                      {/* Service author display */}
                      {serviceAuthors[service.user_id] && (
                        <div className="flex items-center mt-2">
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
                            className="text-primary hover:text-primary-hover text-xs flex items-center"
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
                          className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                          title={t('services.edit')}
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          title={t('services.delete')}
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-700">
                    {service.phone && (
                      <p>
                        <span className="font-medium">{t('services.phone')}:</span> {service.phone}
                      </p>
                    )}
                    
                    {service.address && (
                      <p>
                        <span className="font-medium">{t('services.address')}:</span> {service.address}
                      </p>
                    )}
                    
                    {service.cost && (
                      <p>
                        <span className="font-medium">{t('services.cost')}:</span> {service.cost}
                      </p>
                    )}
                    
                    {service.description && (
                      <p>
                        <span className="font-medium">{t('services.description')}:</span> {service.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      {t('services.added')}: {new Date(service.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Comments */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {t('comments')}
                    </h4>
                    
                    {comments[service.id]?.length > 0 ? (
                      <div className="space-y-3">
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
                                  <p className="text-sm font-medium text-gray-900">
                                    {comment.user.username}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {comment.content}
                                  </p>
                                </div>
                                
                                {currentUser && comment.user_id === currentUser.id && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id, service.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors p-1"
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
                    
                    <div className="mt-4">
                      {currentUser ? (
                        <>
                          <textarea
                            value={newComment[service.id] || ''}
                            onChange={(e) => setNewComment((prev) => ({ ...prev, [service.id]: e.target.value }))}
                            placeholder={t('writeComment')}
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                            rows={2}
                          />
                          
                          <button
                            onClick={() => handleCommentSubmit(service.id)}
                            className="mt-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover transition-colors text-sm"
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
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <MainLayout 
      currentUser={currentUser}
      showRightSidebar={true} // Включити RightSidebar назад
    >
      {serviceDetailsContent}
    </MainLayout>
  );
};

export default ServiceDetails;