import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { FaCalendarAlt, FaEdit, FaTrash, FaPlus, FaUserPlus, FaUserMinus, FaUsers, FaMapMarkerAlt } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from '../components/layout/MainLayout';

function Events() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
  });
  const [editEvent, setEditEvent] = useState({
    id: '',
    title: '',
    description: '',
    event_date: '',
    location: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
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
        return user;
      } catch (err) {
        setError(t('authError'));
        setLoading(false);
        return null;
      }
    };

    const fetchEvents = async (user) => {
      try {
        const { data, error } = await supabase
          .from('community_events')
          .select(`
            *,
            community_event_participants_aggregate:community_event_participants!event_id(count),
            community_event_participants(user_id, users:users(id, username, profile_picture)),
            creator:users(id, username, profile_picture)
          `)
          .eq('community_id', communityId)
          .order('event_date', { ascending: true });
        if (error) throw error;

        const mappedEvents = data.map(event => ({
          ...event,
          participant_count: event.community_event_participants_aggregate?.[0]?.count || 0,
          is_joined: user
            ? event.community_event_participants?.some(p => p.user_id === user.id) || false
            : false,
          participants: event.community_event_participants
            ?.map(p => ({
              id: p.users?.id || '',
              username: p.users?.username || 'Unknown User',
              profile_picture: p.users?.profile_picture || null,
            }))
            .filter(p => p.id) || [],
        }));
        setEvents(mappedEvents || []);
      } catch (err) {
        setError(t('fetchEventsError') + ': ' + err.message);
        console.error('Fetch events error:', err);
      } finally {
        setLoading(false);
      }
    };

    const initializeData = async () => {
      const user = await fetchCurrentUser();
      if (user) {
        await fetchEvents(user);
      }
    };

    initializeData();

    const subscription = supabase
      .channel('community_event_participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_event_participants',
        },
        () => {
          if (currentUser) {
            fetchEvents(currentUser);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [communityId, t]);

  const handleCreateEvent = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!newEvent.title || !newEvent.event_date) {
      setError(t('fillRequiredFields'));
      return;
    }

    try {
      setLoading(true);
      const { data: event, error: insertError } = await supabase
        .from('community_events')
        .insert({
          community_id: communityId,
          title: newEvent.title,
          description: newEvent.description,
          event_date: newEvent.event_date,
          location: newEvent.location,
          creator_id: currentUser.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setEvents(prevEvents => [...prevEvents, { ...event, participant_count: 0, is_joined: false, participants: [] }]);
      setIsCreateModalOpen(false);
      setNewEvent({ title: '', description: '', event_date: '', location: '' });
      toast.success(t('eventCreated'));
    } catch (err) {
      setError(t('createEventError') + ': ' + err.message);
      console.error('Create event error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = async () => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!editEvent.title || !editEvent.event_date) {
      setError(t('fillRequiredFields'));
      return;
    }

    try {
      setLoading(true);
      const { error: updateError } = await supabase
        .from('community_events')
        .update({
          title: editEvent.title,
          description: editEvent.description,
          event_date: editEvent.event_date,
          location: editEvent.location,
        })
        .eq('id', editEvent.id)
        .eq('creator_id', currentUser.id);
      if (updateError) throw updateError;

      setEvents(prevEvents => prevEvents.map(e => (e.id === editEvent.id ? { ...e, ...editEvent } : e)));
      setIsEditModalOpen(false);
      setEditEvent({ id: '', title: '', description: '', event_date: '', location: '' });
      toast.success(t('eventUpdated'));
    } catch (err) {
      setError(t('updateEventError') + ': ' + err.message);
      console.error('Update event error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }
    if (!confirm(t('confirmDeleteEvent'))) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('community_events')
        .delete()
        .eq('id', eventId)
        .eq('creator_id', currentUser.id);
      if (error) throw error;

      setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
      toast.success(t('eventDeleted'));
    } catch (err) {
      setError(t('deleteEventError') + ': ' + err.message);
      console.error('Delete event error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (eventId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, profile_picture')
        .eq('id', currentUser.id)
        .single();
      if (userError) throw userError;

      const { error: insertError } = await supabase
        .from('community_event_participants')
        .insert({ event_id: eventId, user_id: currentUser.id });
      if (insertError) throw insertError;

      setEvents(prevEvents =>
        prevEvents.map(e =>
          e.id === eventId
            ? {
                ...e,
                is_joined: true,
                participant_count: e.participant_count + 1,
                participants: [...e.participants, user],
              }
            : e
        )
      );
      toast.success(t('eventJoined'));
    } catch (err) {
      setError(t('joinEventError') + ': ' + err.message);
      console.error('Join event error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!currentUser) {
      setError(t('authRequired'));
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('community_event_participants')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', currentUser.id);
      if (error) throw error;

      setEvents(prevEvents =>
        prevEvents.map(e =>
          e.id === eventId
            ? {
                ...e,
                is_joined: false,
                participant_count: e.participant_count - 1,
                participants: e.participants.filter(p => p.id !== currentUser.id),
              }
            : e
        )
      );
      toast.success(t('eventLeft'));
    } catch (err) {
      setError(t('leaveEventError') + ': ' + err.message);
      console.error('Leave event error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/public/${userId}`);
  };

  if (loading) return <div className="p-4">{t('loading')}</div>;
  if (error) return <div className="p-4 text-red-500">{t('error')}: {error}</div>;

  const eventsContent = (
    <div className="w-full px-4 mt-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{t('events')}</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FaPlus />
            {t('createEvent')}
          </button>
        </div>

        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaCalendarAlt className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString()} • {new Date(event.event_date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-gray-600 mb-3">{event.description}</p>
                  )}

                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <FaMapMarkerAlt />
                      <span>{event.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <FaUsers />
                      <span>{event.participant_count} {t('participants')}</span>
                    </div>
                  </div>

                  {event.participant_count > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{t('participantList')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {event.participants.map(participant => (
                          <div
                            key={participant.id}
                            className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => handleUserClick(participant.id)}
                          >
                            {participant.profile_picture ? (
                              <img
                                src={participant.profile_picture}
                                alt={participant.username}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {participant.username?.[0]?.toUpperCase() || 'U'}
                                </span>
                              </div>
                            )}
                            <span className="text-sm text-gray-700">{participant.username}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {event.creator_id === currentUser?.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditEvent({
                            id: event.id,
                            title: event.title,
                            description: event.description || '',
                            event_date: new Date(event.event_date).toISOString().slice(0, 16),
                            location: event.location || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        title={t('editEvent')}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors"
                        title={t('deleteEvent')}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => (event.is_joined ? handleLeaveEvent(event.id) : handleJoinEvent(event.id))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      event.is_joined
                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                        : 'text-green-600 bg-green-50 hover:bg-green-100'
                    }`}
                    disabled={loading}
                  >
                    {event.is_joined ? <FaUserMinus /> : <FaUserPlus />}
                    {event.is_joined ? t('leaveEvent') : t('joinEvent')}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FaCalendarAlt className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-lg">{t('noEvents')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal window for creating an event */}
      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsCreateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 mb-4">
                    {t('createEvent')}
                  </Dialog.Title>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('eventTitle')} *
                      </label>
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                        placeholder={t('eventTitlePlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('description')}
                      </label>
                      <textarea
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 resize-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                        rows={3}
                        placeholder={t('eventDescriptionPlaceholder')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('eventDate')} *
                      </label>
                      <input
                        type="datetime-local"
                        value={newEvent.event_date}
                        onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('location')}
                      </label>
                      <input
                        type="text"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                        placeholder={t('eventLocationPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                      onClick={handleCreateEvent}
                      disabled={loading || !newEvent.title || !newEvent.event_date}
                    >
                      {loading ? t('creating') : t('create')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal window for editing an event */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsEditModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900 mb-4">
                    {t('editEvent')}
                  </Dialog.Title>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('eventTitle')} *
                      </label>
                      <input
                        type="text"
                        value={editEvent.title}
                        onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('description')}
                      </label>
                      <textarea
                        value={editEvent.description}
                        onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 resize-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('eventDate')} *
                      </label>
                      <input
                        type="datetime-local"
                        value={editEvent.event_date}
                        onChange={(e) => setEditEvent({ ...editEvent, event_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('location')}
                      </label>
                      <input
                        type="text"
                        value={editEvent.location}
                        onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                      onClick={handleEditEvent}
                      disabled={loading || !editEvent.title || !editEvent.event_date}
                    >
                      {loading ? t('saving') : t('saveChanges')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );

  return (
    <MainLayout 
      currentUser={currentUser}
    >
      {eventsContent}
    </MainLayout>
  );
}

export default Events;
