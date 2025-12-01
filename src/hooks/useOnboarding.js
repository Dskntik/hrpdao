// hooks/useOnboarding.js
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export const useOnboarding = () => {
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkOnboardingCompletion = async (userId) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding completion:', error);
        setError(error);
        return false;
      }

      const completed = data?.onboarding_completed || false;
      setOnboardingCompleted(completed);
      return completed;
    } catch (error) {
      console.error('Error in checkOnboardingCompletion:', error);
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const awardOnboardingPoints = async (userId) => {
    try {
      // Оновлюємо статус онбордингу в таблиці users
      const { data, error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Error updating onboarding status:', error);
        setError(error);
        return false;
      }

      console.log('Successfully updated onboarding status');
      setOnboardingCompleted(true);
      return true;
    } catch (error) {
      console.error('Error in awardOnboardingPoints:', error);
      setError(error);
      return false;
    }
  };

  return {
    onboardingCompleted,
    loading,
    error,
    checkOnboardingCompletion,
    awardOnboardingPoints
  };
};