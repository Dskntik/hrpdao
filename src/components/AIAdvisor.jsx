import React, { useState, useRef, useEffect } from 'react';
import { apiAIService } from '../utils/api-ai';
import { geminiAIService } from '../utils/api-gemini';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUser, FaPaperPlane, FaTimes, FaSync } from 'react-icons/fa';
import { RiRobot3Fill } from 'react-icons/ri';

const AIAdvisor = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      console.log('🚀 Sending request...');
      const response = await apiAIService.generateResponse(inputMessage);
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('❌ API Error:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: `❌ Error: ${error.message}\n\nTry:\n• Check internet connection\n• Wait 30 seconds\n• Try a different question`,
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add check for AnimatePresence
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <RiRobot3Fill size={26} className="text-green-600 text-lg" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Atticus</h2>
                  <p className="text-sm text-green-600">AI Advisor on Human Rights</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const result = await apiAIService.testAPI();
                      if (result.success) {
                        alert(`✅ API is working!\nTime: ${result.responseTime}ms`);
                      } else {
                        alert(`❌ API error: ${result.error}`);
                      }
                    } catch (error) {
                      alert(`❌ Test error: ${error.message}`);
                    }
                  }}
                  className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 flex items-center gap-1"
                >
                  <FaSync className="w-3 h-3" />
                  Test API
                </button>
                
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FaTimes className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <RiRobot3Fill size={48} className="mx-auto text-green-400 mb-2" />
                  <p>Ask a question about human rights</p>
                  <p className="text-sm mt-1">I'll help with legal references and practical advice</p>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : message.isError
                        ? 'bg-red-100 text-red-800 border border-red-200 rounded-bl-none'
                        : 'bg-green-50 text-green-900 border border-green-200 rounded-bl-none'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.sender === 'ai' && !message.isError && (
                        <RiRobot3Fill size={26} className="text-green-600 mt-1 flex-shrink-0" />
                      )}
                      <div className="whitespace-pre-wrap text-sm">{message.text}</div>
                      {message.sender === 'user' && (
                        <FaUser size={22} className="text-blue-200 mt-1 flex-shrink-0" />
                      )}
                    </div>
                    <div className={`text-xs mt-1 ${
                      message.sender === 'user' ? 'text-blue-200' : 
                      message.isError ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {!message.isError && message.sender === 'ai' && ' • Allow no harm to yourself. Do no harm to others.'}
                    </div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-blue-50 text-blue-900 rounded-2xl rounded-bl-none p-3 max-w-[80%] border border-blue-200">
                    <div className="flex items-center gap-2">
                      <FaSync className="text-blue-600 animate-spin" />
                      <span className="text-xs text-blue-600">Request...</span>
                    </div>
                    <div className="text-xs text-blue-500 mt-1">
                      This may take 10-30 seconds for the first request
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Write your question about human rights..."
                  className="flex-1 border border-gray-300 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  rows="2"
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || loading}
                  className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors self-end"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AIAdvisor;