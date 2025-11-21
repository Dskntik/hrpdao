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
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'onboarding_completion')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding completion:', error);
        setError(error);
        return false;
      }

      const completed = !!data;
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
      // Check if user already received onboarding points
      const { data: existingPoints, error: checkError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'onboarding_completion')
        .single();

      if (existingPoints && !checkError) {
        console.log('User already received onboarding points');
        return true;
      }

      // Award 500 points for onboarding completion
      const { data, error } = await supabase
        .from('user_points')
        .insert([
          {
            user_id: userId,
            points: 500,
            type: 'onboarding_completion',
            description: 'Completed onboarding and passed final test',
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error awarding points:', error);
        setError(error);
        return false;
      }

      console.log('Successfully awarded 500 Human Rights Points');
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