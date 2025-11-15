import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabase';
import MainLayout from '../components/layout/MainLayout';
import countries from '../utils/countries';
import { Heart, Plus, Search, Filter, Globe, Calendar, Image, Video, FileText, X, Upload, Copy, Check, User, Users, MapPin, Eye, Banknote, Wallet, Edit, Trash2 } from 'lucide-react';

function Donation() {
  const { t, i18n } = useTranslation();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [helpRequests, setHelpRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [copySuccess, setCopySuccess] = useState(null);

  const [formData, setFormData] = useState({
    title: '', description: '', bankAccount: '',
    wallets: { bitcoin: '', ethereum: '', paypal: '' },
    attachments: []
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchCurrentUser();
      await fetchHelpRequests();
      setLoading(false);
    };
    init();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return setCurrentUser(null);
    const { data: profile } = await supabase.from('users').select('username, profile_picture, country, city, status, bio, social_links').eq('id', user.id).single();
    setCurrentUser(profile ? { ...user, ...profile } : user);
  };

  const fetchHelpRequests = async () => {
    const { data, error } = await supabase.from('help_requests').select('*').order('created_at', { ascending: false });
    if (error || !data) return setHelpRequests([]);
    const requests = await Promise.all(data.map(async (req) => {
      const { data: user } = await supabase.from('users').select('username, profile_picture, country').eq('id', req.user_id).single();
      return { ...req, user: user || { username: 'User', profile_picture: null, country: null } };
    }));
    setHelpRequests(requests); setFilteredRequests(requests);
  };

  useEffect(() => {
    let filtered = [...helpRequests];
    if (selectedCountry !== 'all') filtered = filtered.filter(r => r.country === selectedCountry);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term));
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(r => {
        const d = new Date(r.created_at);
        return dateFilter === 'today' ? d.toDateString() === now.toDateString() :
               dateFilter === 'week' ? d >= new Date(now.getTime() - 7 * 86400000) :
               dateFilter === 'month' ? d >= new Date(now.getTime() - 30 * 86400000) :
               dateFilter === 'year' ? d >= new Date(now.getTime() - 365 * 86400000) : true;
      });
    }
    setFilteredRequests(filtered);
  }, [helpRequests, selectedCountry, searchTerm, dateFilter]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!currentUser?.country) return alert(t('countryRequired') || 'Please add your country in your profile.');
    try {
      const uploaded = await Promise.all(formData.attachments.map(async (att) => {
        if (!att.file) return att;
        if (att.file.size > 50 * 1024 * 1024) return alert(`File ${att.name} is too large. Max 50MB.`), null;
        const ext = att.name.split('.').pop();
        const path = `user-${currentUser.id}/${Math.random().toString(36).substr(2, 15)}.${ext}`;
        const { error } = await supabase.storage.from('attachments-help-requests').upload(path, att.file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('attachments-help-requests').getPublicUrl(path);
        att.url.startsWith('blob:') && URL.revokeObjectURL(att.url);
        return { name: att.name, type: att.type, url: publicUrl, filePath: path };
      }).filter(Boolean));

      const { data } = await supabase.from('help_requests').insert([{
        user_id: currentUser.id, title: formData.title, description: formData.description,
        country: currentUser.country, bank_account: formData.bankAccount, wallets: formData.wallets,
        attachments: uploaded, status: 'active'
      }]).select().single();

      const { data: user } = await supabase.from('users').select('username, profile_picture, country').eq('id', currentUser.id).single();
      setHelpRequests(prev => [{ ...data, user: user || { username: currentUser.email?.split('@')[0] || 'User', profile_picture: null, country: currentUser.country } }, ...prev]);
      setShowCreateForm(false); resetForm(); alert(t('requestCreated') || 'Request created successfully!');
    } catch (err) {
      console.error(err);
      alert(err.code === '42P01' ? 'Table "help_requests" not found.' : err.message?.includes('bucket') ? 'Storage bucket not found.' : 'Error creating request.');
    }
  };

  const handleEditRequest = async (e) => {
    e.preventDefault();
    if (!editingRequest) return;
    try {
      const newAttachments = await Promise.all(formData.attachments.map(async (att) => {
        if (!att.file) return null;
        if (att.file.size > 50 * 1024 * 1024) return alert(`File ${att.name} is too large.`), null;
        const ext = att.name.split('.').pop();
        const path = `user-${currentUser.id}/${Math.random().toString(36).substr(2, 15)}.${ext}`;
        const { error } = await supabase.storage.from('attachments-help-requests').upload(path, att.file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('attachments-help-requests').getPublicUrl(path);
        att.url.startsWith('blob:') && URL.revokeObjectURL(att.url);
        return { name: att.name, type: att.type, url: publicUrl, filePath: path };
      }).filter(Boolean));

      const updatedAttachments = [...editingRequest.attachments, ...newAttachments];
      const { data } = await supabase.from('help_requests').update({
        title: formData.title, description: formData.description,
        bank_account: formData.bankAccount, wallets: formData.wallets,
        attachments: updatedAttachments, updated_at: new Date().toISOString()
      }).eq('id', editingRequest.id).select().single();

      setHelpRequests(prev => prev.map(r => r.id === editingRequest.id ? { ...r, ...data, user: editingRequest.user } : r));
      setShowEditForm(false); setEditingRequest(null); resetForm();
      alert(t('requestUpdated') || 'Request updated successfully!');
    } catch (err) {
      console.error(err); alert('Error updating request.');
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!confirm(t('confirmDelete') || 'Are you sure you want to delete this request?')) return;
    try {
      const { data: req } = await supabase.from('help_requests').select('attachments').eq('id', id).single();
      req?.attachments?.forEach(att => att.filePath && supabase.storage.from('attachments-help-requests').remove([att.filePath]));
      await supabase.from('help_requests').delete().eq('id', id);
      setHelpRequests(prev => prev.filter(r => r.id !== id));
      alert(t('requestDeleted') || 'Request deleted successfully!');
    } catch (err) {
      console.error(err); alert('Error deleting request.');
    }
  };

  const startEditRequest = (req) => {
    setEditingRequest(req);
    setFormData({
      title: req.title, description: req.description, bankAccount: req.bank_account || '',
      wallets: req.wallets || { bitcoin: '', ethereum: '', paypal: '' }, attachments: []
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    formData.attachments.forEach(att => att.url?.startsWith('blob:') && URL.revokeObjectURL(att.url));
    setFormData({ title: '', description: '', bankAccount: '', wallets: { bitcoin: '', ethereum: '', paypal: '' }, attachments: [] });
    setEditingRequest(null);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => {
      const valid = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type);
      !valid && alert(`File type ${f.type} not supported.`);
      return valid;
    });
    const newAtts = files.map(f => ({
      id: Math.random().toString(36).substr(2,9), name: f.name,
      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'document',
      url: URL.createObjectURL(f), file: f
    }));
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...newAtts] }));
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    const att = formData.attachments.find(a => a.id === id);
    att?.url.startsWith('blob:') && URL.revokeObjectURL(att.url);
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== id) }));
  };

  const removeExistingAttachment = async (reqId, idx) => {
    const req = helpRequests.find(r => r.id === reqId);
    const att = req.attachments[idx];
    if (att.filePath) await supabase.storage.from('attachments-help-requests').remove([att.filePath]);
    const updated = req.attachments.filter((_, i) => i !== idx);
    const { data } = await supabase.from('help_requests').update({ attachments: updated, updated_at: new Date().toISOString() }).eq('id', reqId).select().single();
    setHelpRequests(prev => prev.map(r => r.id === reqId ? { ...r, attachments: updated } : r));
    editingRequest?.id === reqId && setEditingRequest(prev => ({ ...prev, attachments: updated }));
  };

  const getCountryName = (code) => countries.find(c => c.code === code)?.name[i18n.language] || countries.find(c => c.code === code)?.name.en || code;
  const formatDate = (date) => new Date(date).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const handleCopyAddress = (addr, type) => { navigator.clipboard.writeText(addr); setCopySuccess(type); setTimeout(() => setCopySuccess(null), 2000); };
  const getUniqueCountries = () => [...new Set(helpRequests.map(r => r.country).filter(Boolean))];
  const isUserRequest = (req) => currentUser && req.user_id === currentUser.id;

  const renderAttachmentsPreview = (atts, reqId = null, canEdit = false) => !atts?.length ? null : (
    <div className="flex gap-2 overflow-x-auto py-2">
      {atts.map((att, i) => (
        <div key={att.id || i} className="relative w-20 h-20 bg-gray-100 rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center flex-shrink-0 group">
          {att.type === 'image' ? <img src={att.url} alt={att.name} className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(att.url, '_blank')} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
          : att.type === 'video' ? <div className="text-center p-2 w-full h-full flex flex-col items-center justify-center"><Video className="w-6 h-6 text-gray-500 mb-1"/><span className="text-xs text-gray-500 truncate w-full px-1">Video</span></div>
          : <div className="text-center p-2 w-full h-full flex flex-col items-center justify-center"><FileText className="w-6 h-6 text-gray-500 mb-1"/><span className="text-xs text-gray-500 truncate w-full px-1">Document</span></div>}
          <div className="hidden items-center justify-center text-center p-2 w-full h-full"><FileText className="w-6 h-6 text-gray-500"/></div>
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">{att.name}</div>
          {canEdit && reqId && <button onClick={() => removeExistingAttachment(reqId, i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete"><X className="w-3 h-3"/></button>}
        </div>
      ))}
    </div>
  );

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;

  return (
    <MainLayout currentUser={currentUser}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white/95 rounded-2xl shadow-lg p-6 mb-8 border border-blue-100 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-3 rounded-full"><Heart className="w-6 h-6 text-red-600" fill="currentColor"/></div>
                <div><h1 className="text-2xl font-bold text-blue-950">{t('helpRequests') || 'Help Requests'}</h1><p className="text-blue-950 text-sm opacity-80">{t('helpRequestsDescription') || 'Find and create requests for help and support'}</p></div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => currentUser?.country ? setShowCreateForm(true) : alert('Please add your country in your profile.')} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md">
                <Plus className="w-4 h-4"/><span>{t('createRequest') || 'Create Request'}</span>
              </motion.button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/><input type="text" placeholder={t('searchRequests') || 'Search requests...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"/></div>
              <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/><select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm shadow-sm">
                <option value="all">{t('allCountries') || 'All Countries'}</option>
                {getUniqueCountries().map(c => <option key={c} value={c}>{getCountryName(c)}</option>)}
              </select></div>
              <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/><select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-sm shadow-sm">
                <option value="all">{t('allTime') || 'All Time'}</option>
                <option value="today">{t('today') || 'Today'}</option>
                <option value="week">{t('thisWeek') || 'This Week'}</option>
                <option value="month">{t('thisMonth') || 'This Month'}</option>
                <option value="year">{t('thisYear') || 'This Year'}</option>
              </select></div>
            </div>
            <div className="text-sm text-gray-600 flex items-center">Found: {filteredRequests.length} of {helpRequests.length} requests</div>
          </div>

          {copySuccess && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-green-50 text-green-800 rounded-xl border border-green-100 flex items-center gap-3 shadow-sm"><Check className="w-5 h-5 text-green-600 flex-shrink-0"/><p className="font-medium">{t('copiedToClipboard') || 'Address copied to clipboard!'}</p></motion.div>}

          {filteredRequests.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center border border-gray-200">
              <Heart className="text-gray-400 w-16 h-16 mx-auto mb-4"/>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{helpRequests.length === 0 ? 'No help requests yet' : 'No requests found'}</h3>
              <p className="text-gray-600 mb-6">{helpRequests.length === 0 ? 'Be the first to create a help request.' : 'Try changing your search parameters.'}</p>
              <button onClick={() => setShowCreateForm(true)} className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium">{t('createFirstRequest') || 'Create First Request'}</button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRequests.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.1 }} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <img src={req.user?.profile_picture || '/default-avatar.png'} alt={req.user?.username} className="w-10 h-10 rounded-full object-cover" onError={e => e.target.src = '/default-avatar.png'}/>
                        <div><h3 className="font-semibold text-blue-950">{req.user?.username || 'User'}</h3><div className="flex items-center gap-2 text-sm text-gray-500"><Globe className="w-3 h-3"/><span>{getCountryName(req.country)}</span><Calendar className="w-3 h-3 ml-2"/><span>{formatDate(req.created_at)}</span></div></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${req.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{req.status}</span>
                        {isUserRequest(req) && (
                          <div className="flex gap-1">
                            <button onClick={() => startEditRequest(req)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Edit"><Edit className="w-4 h-4"/></button>
                            <button onClick={() => handleDeleteRequest(req.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Delete"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-blue-600">{req.title}</h4>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{req.description}</p>
                    {req.attachments?.length > 0 && <div><p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>{renderAttachmentsPreview(req.attachments, req.id, isUserRequest(req))}</div>}
                    {(req.bank_account || req.wallets) && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2"><Banknote className="w-4 h-4"/>Donation Information</h5>
                        <div className="space-y-2">
                          {req.bank_account && <div className="flex items-center justify-between text-sm text-blue-800"><div className="flex items-center gap-2"><Wallet className="w-3 h-3"/><span><strong>Bank:</strong> {req.bank_account}</span></div><button onClick={() => handleCopyAddress(req.bank_account, 'bank')} className="p-1 hover:bg-blue-100 rounded transition-colors" title="Copy"><Copy className="w-3 h-3"/></button></div>}
                          {req.wallets?.bitcoin && <div className="flex items-center justify-between text-sm text-blue-800"><div className="flex items-center gap-2"><Wallet className="w-3 h-3"/><span><strong>Bitcoin:</strong> {req.wallets.bitcoin.slice(0,10)}...</span></div><button onClick={() => handleCopyAddress(req.wallets.bitcoin, 'bitcoin')} className="p-1 hover:bg-blue-100 rounded transition-colors" title="Copy"><Copy className="w-3 h-3"/></button></div>}
                          {req.wallets?.ethereum && <div className="flex items-center justify-between text-sm text-blue-800"><div className="flex items-center gap-2"><Wallet className="w-3 h-3"/><span><strong>Ethereum:</strong> {req.wallets.ethereum.slice(0,10)}...</span></div><button onClick={() => handleCopyAddress(req.wallets.ethereum, 'ethereum')} className="p-1 hover:bg-blue-100 rounded transition-colors" title="Copy"><Copy className="w-3 h-3"/></button></div>}
                          {req.wallets?.paypal && <div className="flex items-center justify-between text-sm text-blue-800"><div className="flex items-center gap-2"><Wallet className="w-3 h-3"/><span><strong>PayPal:</strong> {req.wallets.paypal}</span></div><button onClick={() => handleCopyAddress(req.wallets.paypal, 'paypal')} className="p-1 hover:bg-blue-100 rounded transition-colors" title="Copy"><Copy className="w-3 h-3"/></button></div>}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showCreateForm && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateForm(false)}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex justify-between items-center"><h2 className="text-xl font-bold text-blue-950">{t('createHelpRequest') || 'Create Help Request'}</h2><button onClick={() => setShowCreateForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5"/></button></div>
                <form onSubmit={handleCreateRequest} className="p-6 space-y-6">
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('requestTitle') || 'Request Title'} *</label><input type="text" required value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={t('enterTitle') || 'Enter a descriptive title'}/></div>
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('description') || 'Description'} *</label><textarea required value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder={t('enterDescription') || 'Describe your situation...'}/></div>
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('country') || 'Country'} *</label><div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm">{currentUser?.country ? <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-green-600"/><span className="font-medium">{getCountryName(currentUser.country)}</span><span className="text-xs text-gray-500 ml-auto">(auto from profile)</span></div> : <div className="flex items-center gap-2 text-amber-600"><Globe className="w-4 h-4"/><span>Country not set in profile</span></div>}</div>{!currentUser?.country && <p className="text-xs text-amber-600 mt-1">Please add country in your profile.</p>}</div>
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('bankAccount') || 'Bank Account'}</label><input type="text" value={formData.bankAccount} onChange={e => setFormData(p => ({...p, bankAccount: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={t('enterBankAccount') || 'Bank account details...'}/></div>
                  <div className="space-y-3"><label className="block text-sm font-medium text-blue-950">{t('cryptoWallets') || 'Crypto Wallets'}</label>
                    {['Bitcoin', 'Ethereum', 'PayPal'].map((name, i) => {
                      const key = name.toLowerCase();
                      return <div key={key}><label className="block text-xs text-gray-500 mb-1">{name}</label><input type={name === 'PayPal' ? 'email' : 'text'} value={formData.wallets[key]} onChange={e => setFormData(p => ({...p, wallets: {...p.wallets, [key]: e.target.value}}))} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={name === 'PayPal' ? 'PayPal email' : `${name} address`}/></div>;
                    })}
                  </div>
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('attachments') || 'Attachments'}</label><div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center"><Upload className="w-8 h-8 text-gray-400 mx-auto mb-2"/><p className="text-sm text-gray-500 mb-2">{t('uploadFiles') || 'Upload files (Max 50MB)'}</p><p className="text-xs text-gray-400 mb-4">JPG, PNG, GIF, WebP, MP4, WebM, PDF, DOC, DOCX</p><input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" id="file-upload"/><label htmlFor="file-upload" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors cursor-pointer text-sm"><Upload className="w-4 h-4"/>{t('chooseFiles') || 'Choose Files'}</label></div>
                    {formData.attachments.length > 0 && <div className="mt-4 space-y-2">{formData.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">{att.type === 'image' ? <Image className="w-5 h-5 text-blue-600"/> : att.type === 'video' ? <Video className="w-5 h-5 text-red-600"/> : <FileText className="w-5 h-5 text-green-600"/>}<div><span className="text-sm text-gray-700 block">{att.name}</span><span className="text-xs text-gray-500">{Math.round(att.file.size / 1024)} KB</span></div></div>
                        <button type="button" onClick={() => removeAttachment(att.id)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-4 h-4 text-gray-500"/></button>
                      </div>
                    ))}</div>}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { resetForm(); setShowCreateForm(false); }} className="flex-1 px-6 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">{t('cancel') || 'Cancel'}</button>
                    <button type="submit" className="flex-1 px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">{t('createRequest') || 'Create Request'}</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEditForm && editingRequest && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowEditForm(false); setEditingRequest(null); resetForm(); }}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 flex justify-between items-center"><h2 className="text-xl font-bold text-blue-950">{t('editHelpRequest') || 'Edit Help Request'}</h2><button onClick={() => { setShowEditForm(false); setEditingRequest(null); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5"/></button></div>
                <form onSubmit={handleEditRequest} className="p-6 space-y-6">
                  {/* Same as create form, but with existing attachments */}
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('requestTitle') || 'Request Title'} *</label><input type="text" required value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={t('enterTitle') || 'Enter a descriptive title'}/></div>
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('description') || 'Description'} *</label><textarea required value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder={t('enterDescription') || 'Describe your situation...'}/></div>
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('country') || 'Country'} *</label><div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm">{currentUser?.country ? <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-green-600"/><span className="font-medium">{getCountryName(currentUser.country)}</span><span className="text-xs text-gray-500 ml-auto">(auto from profile)</span></div> : <div className="flex items-center gap-2 text-amber-600"><Globe className="w-4 h-4"/><span>Country not set</span></div>}</div></div>
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('bankAccount') || 'Bank Account'}</label><input type="text" value={formData.bankAccount} onChange={e => setFormData(p => ({...p, bankAccount: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={t('enterBankAccount') || 'Bank account details...'}/></div>
                  <div className="space-y-3"><label className="block text-sm font-medium text-blue-950">{t('cryptoWallets') || 'Crypto Wallets'}</label>
                    {['Bitcoin', 'Ethereum', 'PayPal'].map((name, i) => {
                      const key = name.toLowerCase();
                      return <div key={key}><label className="block text-xs text-gray-500 mb-1">{name}</label><input type={name === 'PayPal' ? 'email' : 'text'} value={formData.wallets[key]} onChange={e => setFormData(p => ({...p, wallets: {...p.wallets, [key]: e.target.value}}))} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-blue-950 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder={name === 'PayPal' ? 'PayPal email' : `${name} address`}/></div>;
                    })}
                  </div>
                  {editingRequest.attachments?.length > 0 && <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('existingAttachments') || 'Existing Attachments'}</label>{renderAttachmentsPreview(editingRequest.attachments, editingRequest.id, true)}</div>}
                  <div><label className="block text-sm font-medium text-blue-950 mb-2">{t('newAttachments') || 'Add New Attachments'}</label><div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center"><Upload className="w-8 h-8 text-gray-400 mx-auto mb-2"/><p className="text-sm text-gray-500 mb-2">{t('uploadFiles') || 'Upload files (Max 50MB)'}</p><p className="text-xs text-gray-400 mb-4">JPG, PNG, GIF, WebP, MP4, WebM, PDF, DOC, DOCX</p><input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" id="file-upload-edit"/><label htmlFor="file-upload-edit" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-colors cursor-pointer text-sm"><Upload className="w-4 h-4"/>{t('chooseFiles') || 'Choose Files'}</label></div>
                    {formData.attachments.length > 0 && <div className="mt-4 space-y-2">{formData.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">{att.type === 'image' ? <Image className="w-5 h-5 text-blue-600"/> : att.type === 'video' ? <Video className="w-5 h-5 text-red-600"/> : <FileText className="w-5 h-5 text-green-600"/>}<div><span className="text-sm text-gray-700 block">{att.name}</span><span className="text-xs text-gray-500">{Math.round(att.file.size / 1024)} KB</span></div></div>
                        <button type="button" onClick={() => removeAttachment(att.id)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-4 h-4 text-gray-500"/></button>
                      </div>
                    ))}</div>}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => { setShowEditForm(false); setEditingRequest(null); resetForm(); }} className="flex-1 px-6 py-3 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">{t('cancel') || 'Cancel'}</button>
                    <button type="submit" className="flex-1 px-6 py-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">{t('updateRequest') || 'Update Request'}</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MainLayout>
  );
}

export default Donation;
