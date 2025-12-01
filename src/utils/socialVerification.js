// utils/socialVerification.js
// Utility функції для верифікації публікацій в соціальних мережах

/**
 * Верифікація Facebook поста через Graph API
 * @param {string} accessToken - Facebook access token
 * @param {string} messageHash - Хеш повідомлення для пошуку
 * @param {string} messageStart - Перші символи повідомлення
 * @returns {Promise<{verified: boolean, postId: string, createdTime: string}>}
 */
export const verifyFacebookPost = async (accessToken, messageHash, messageStart) => {
  try {
    console.log('🔍 [Facebook] Starting verification...');
    
    const response = await fetch(
      `https://graph.facebook.com/v20.0/me/feed?fields=id,message,story,created_time&limit=10&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Graph API error');
    }

    const data = await response.json();
    console.log('📊 [Facebook] Feed retrieved:', data);

    if (!data.data || data.data.length === 0) {
      console.log('⚠️ [Facebook] No posts found in feed');
      return { verified: false };
    }

    // Шукаємо пост з нашим текстом
    for (const post of data.data) {
      const postText = (post.message || post.story || '').toLowerCase();
      const messageContent = messageStart.toLowerCase();

      if (postText.includes(messageContent) || postText.includes(messageHash)) {
        console.log('✅ [Facebook] Post verified!', { postId: post.id, time: post.created_time });
        return {
          verified: true,
          postId: post.id,
          createdTime: post.created_time,
          platform: 'facebook'
        };
      }
    }

    console.log('⚠️ [Facebook] No matching post found');
    return { verified: false };

  } catch (error) {
    console.error('❌ [Facebook] Verification error:', error);
    throw error;
  }
};

/**
 * Верифікація Instagram поста через Graph API
 * @param {string} accessToken - Instagram access token
 * @param {string} messageHash - Хеш повідомлення
 * @param {string} messageStart - Перші символи повідомлення
 * @returns {Promise<{verified: boolean, postId: string, mediaType: string}>}
 */
export const verifyInstagramPost = async (accessToken, messageHash, messageStart) => {
  try {
    console.log('🔍 [Instagram] Starting verification...');

    // Крок 1: Отримуємо Instagram user ID
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
    );

    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      throw new Error(error.error?.message || 'Profile fetch error');
    }

    const profileData = await profileResponse.json();
    const igUserId = profileData.id;
    console.log('👤 [Instagram] User ID:', igUserId);

    // Крок 2: Отримуємо медіа з профілю
    const mediaResponse = await fetch(
      `https://graph.instagram.com/${igUserId}/media?fields=id,media_type,media_product_type,caption,timestamp&limit=20&access_token=${accessToken}`
    );

    if (!mediaResponse.ok) {
      const error = await mediaResponse.json();
      throw new Error(error.error?.message || 'Media fetch error');
    }

    const mediaData = await mediaResponse.json();
    console.log('📸 [Instagram] Media retrieved:', mediaData);

    if (!mediaData.data || mediaData.data.length === 0) {
      console.log('⚠️ [Instagram] No media found');
      return { verified: false };
    }

    // Шукаємо медіа з нашим текстом
    for (const media of mediaData.data) {
      const caption = (media.caption || '').toLowerCase();
      const messageContent = messageStart.toLowerCase();

      if (caption.includes(messageContent) || caption.includes(messageHash)) {
        console.log('✅ [Instagram] Media verified!', {
          postId: media.id,
          mediaType: media.media_type
        });
        return {
          verified: true,
          postId: media.id,
          mediaType: media.media_type,
          createdTime: media.timestamp,
          platform: 'instagram'
        };
      }
    }

    console.log('⚠️ [Instagram] No matching media found');
    return { verified: false };

  } catch (error) {
    console.error('❌ [Instagram] Verification error:', error);
    throw error;
  }
};

/**
 * Верифікація Twitter поста через API v2
 * @param {string} bearerToken - Twitter Bearer token
 * @param {string} messageHash - Хеш повідомлення
 * @param {string} messageStart - Перші символи повідомлення
 * @returns {Promise<{verified: boolean, postId: string, createdTime: string}>}
 */
export const verifyTwitterPost = async (bearerToken, messageHash, messageStart) => {
  try {
    console.log('🔍 [Twitter] Starting verification...');

    const response = await fetch(
      'https://api.twitter.com/2/users/me/tweets?max_results=100&tweet.fields=created_at,author_id',
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [Twitter] API Error:', error);
      throw new Error(error.detail || 'Twitter API error');
    }

    const data = await response.json();
    console.log('🐦 [Twitter] Tweets retrieved:', data);

    if (!data.data || data.data.length === 0) {
      console.log('⚠️ [Twitter] No tweets found');
      return { verified: false };
    }

    // Шукаємо твіт з нашим текстом
    for (const tweet of data.data) {
      const tweetText = tweet.text.toLowerCase();
      const messageContent = messageStart.toLowerCase();

      if (tweetText.includes(messageContent) || tweetText.includes(messageHash)) {
        console.log('✅ [Twitter] Tweet verified!', {
          postId: tweet.id,
          time: tweet.created_at
        });
        return {
          verified: true,
          postId: tweet.id,
          createdTime: tweet.created_at,
          platform: 'twitter'
        };
      }
    }

    console.log('⚠️ [Twitter] No matching tweet found');
    return { verified: false };

  } catch (error) {
    console.error('❌ [Twitter] Verification error:', error);
    throw error;
  }
};

/**
 * Головна функція верифікації з повторними спробами
 * @param {string} platform - Платформа ('facebook', 'instagram', 'twitter')
 * @param {string} accessToken - Access token для платформи
 * @param {string} messageHash - Хеш повідомлення
 * @param {string} messageStart - Перші символи повідомлення
 * @param {number} maxAttempts - Максимальна кількість спроб
 * @param {number} checkInterval - Інтервал між спробами (мс)
 * @returns {Promise<{verified: boolean, postId: string, ...metadata}>}
 */
export const verifyPublicationWithRetries = async (
  platform,
  accessToken,
  messageHash,
  messageStart,
  maxAttempts = 36, // 3 хвилини при 5-секундному інтервалі
  checkInterval = 5000
) => {
  let result = null;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 [${platform}] Verification attempt ${attempt}/${maxAttempts}`);

      switch (platform.toLowerCase()) {
        case 'facebook':
          result = await verifyFacebookPost(accessToken, messageHash, messageStart);
          break;

        case 'instagram':
          result = await verifyInstagramPost(accessToken, messageHash, messageStart);
          break;

        case 'twitter':
          result = await verifyTwitterPost(accessToken, messageHash, messageStart);
          break;

        default:
          throw new Error(`Unknown platform: ${platform}`);
      }

      // Якщо знайдено - повертаємо результат
      if (result?.verified) {
        console.log(`✅ [${platform}] Verification successful on attempt ${attempt}`);
        return result;
      }

      // Якщо це не остання спроба - чекаємо перед наступною
      if (attempt < maxAttempts) {
        const secondsLeft = Math.ceil((maxAttempts - attempt) * checkInterval / 1000);
        console.log(`⏳ [${platform}] Post not found yet. Retrying in ${checkInterval / 1000}s... (${secondsLeft}s remaining)`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }

    } catch (error) {
      console.warn(`⚠️ [${platform}] Attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      // Чекаємо перед наступною спробою (навіть при помилці)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }
  }

  // Якщо всі спроби невдалі
  console.error(`❌ [${platform}] Verification failed after ${maxAttempts} attempts`);
  return {
    verified: false,
    error: lastError?.message || 'Max attempts reached'
  };
};

/**
 * Перевірка чи access token ще дійсний
 * @param {string} platform - Платформа
 * @param {string} accessToken - Token для перевірки
 * @returns {Promise<boolean>}
 */
export const validateAccessToken = async (platform, accessToken) => {
  try {
    switch (platform.toLowerCase()) {
      case 'facebook':
      case 'instagram':
        const fbResponse = await fetch(
          `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`
        );
        const fbData = await fbResponse.json();
        return fbData.data?.is_valid === true;

      case 'twitter':
        const twitterResponse = await fetch('https://api.twitter.com/2/users/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return twitterResponse.ok;

      default:
        return false;
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

/**
 * Логування верифікації для аналітики
 * @param {string} platform - Платформа
 * @param {boolean} success - Чи успішна верифікація
 * @param {number} attempts - Кількість спроб
 * @param {string} postId - ID поста (якщо верифіковано)
 */
export const logVerificationAnalytics = (platform, success, attempts, postId = null) => {
  const analytics = {
    platform,
    success,
    attempts,
    postId,
    timestamp: new Date().toISOString()
  };

  console.log('📊 [Analytics]', analytics);

  // Можна також відправити на backend для аналізу
  // await fetch('/api/analytics/verification', { method: 'POST', body: JSON.stringify(analytics) });
};