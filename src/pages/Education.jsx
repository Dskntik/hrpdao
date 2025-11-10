import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

function Education() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 py-8"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white/95 rounded-2xl shadow-lg p-8 text-center border border-blue-100 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-blue-950 mb-4">
            Education Center
          </h1>
          
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
            The educational platform is currently under development. 
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              Coming Soon
            </h3>
            <p className="text-blue-800">
              Interactive courses, quizzes, and educational materials to help you become 
              a knowledgeable human rights defender.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Check back soon for the launch of our comprehensive educational platform.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default Education;