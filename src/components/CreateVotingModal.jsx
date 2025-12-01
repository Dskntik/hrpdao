// components/CreateVotingModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, X } from 'lucide-react';

function CreateVotingModal({ isOpen, onClose, onCreate, t }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    question: '',
    options: ['', ''],
    end_date: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.question.trim()) {
      alert(t('fillRequiredFields') || 'Please fill in all required fields');
      return;
    }

    const validOptions = formData.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert(t('minTwoOptions') || 'Please provide at least two options');
      return;
    }

    if (!formData.end_date) {
      alert(t('endDateRequired') || 'Please select an end date');
      return;
    }

    setLoading(true);
    try {
      await onCreate(formData);
      setFormData({
        title: '',
        description: '',
        question: '',
        options: ['', ''],
        end_date: ''
      });
      onClose();
    } catch (error) {
      console.error('Error creating voting:', error);
      alert(error.message || t('votingCreationError') || 'Error creating voting');
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const updateOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      alert(t('minTwoOptions') || 'You need at least two options');
      return;
    }
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  // Автоматично встановлюємо дату завершення на 7 днів вперед
  const defaultEndDate = new Date();
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);
  const defaultEndDateString = defaultEndDate.toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900">
            {t('createProposal') || 'Create New Proposal'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Voting System Info */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Users className="w-5 h-5" />
              <span className="font-medium">
                {t('votingSystem') || 'Voting System'}: One Member - One Vote
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              {t('votingSystemDescription') || 'Each registered user has exactly one vote per proposal'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              {t('proposalTitle') || 'Proposal Title'} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('enterProposalTitle') || 'Enter proposal title'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              {t('proposalDescription') || 'Proposal Description'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('enterProposalDescription') || 'Enter proposal description'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              {t('votingQuestion') || 'Voting Question'} *
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={t('enterVotingQuestion') || 'Enter the voting question'}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-blue-900">
                {t('votingOptions') || 'Voting Options'} *
              </label>
              <button
                type="button"
                onClick={addOption}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                {t('addOption') || '+ Add Option'}
              </button>
            </div>
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder={`${t('option') || 'Option'} ${index + 1}`}
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-700 rounded-xl border border-red-200 hover:border-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              {t('votingEndDate') || 'Voting End Date'} *
            </label>
            <input
              type="datetime-local"
              value={formData.end_date || defaultEndDateString}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('creating') || 'Creating...' : t('createProposal') || 'Create Proposal'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateVotingModal;