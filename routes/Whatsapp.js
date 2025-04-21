const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');
const { URL } = require('url');

// Configuration
const NEWS_ITEMS_PER_CATEGORY = 3;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || 'cb5420399165811c674005ec43e29a8e';
const GNEWS_API_URL = 'https://gnews.io/api/v4/top-headlines';

// Supported languages
const languages = {
  'en': { code: 'en', name: 'English', emoji: '🇬🇧' },
  'hi': { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
  'mr': { code: 'mr', name: 'Marathi', emoji: '🇮🇳' }
};

// Category mapping
const categories = {
  '1': { name: 'General', api: 'general', country: 'in' },
  '2': { name: 'World', api: 'world', country: null },
  '3': { name: 'Nation', api: 'general', country: 'in' },
  '4': { name: 'Business', api: 'business', country: 'in' },
  '5': { name: 'Technology', api: 'technology', country: 'in' },
  '6': { name: 'Entertainment', api: 'entertainment', country: 'in' },
  '7': { name: 'Sports', api: 'sports', country: 'in' },
  '8': { name: 'Science', api: 'science', country: 'in' },
  '9': { name: 'Health', api: 'health', country: 'in' }
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'WhatsApp NewsBot',
    version: '1.0.3',
    supported_languages: Object.values(languages),
    categories: Object.keys(categories).map(key => ({ 
      id: key, 
      name: categories[key].name,
      scope: categories[key].country ? 'India' : 'Global'
    }))
  });
});

// Shorten URL for WhatsApp display
function formatUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.hostname.replace('www.', '')} ↗`;
  } catch {
    return 'Read more ↗';
  }
}

// Fetch news from GNews API with language support
async function fetchNews(categoryObj, lang = 'en') {
  try {
    const params = {
      category: categoryObj.api,
      max: NEWS_ITEMS_PER_CATEGORY,
      apikey: GNEWS_API_KEY,
      lang: languages[lang]?.code || 'en'
    };

    if (categoryObj.country) {
      params.country = categoryObj.country;
    }

    const response = await axios.get(GNEWS_API_URL, { params });
    
    return response.data.articles.map(article => ({
      title: article.title,
      description: article.description || 'No description available',
      url: article.url,
      source: article.source?.name || 'Source'
    }));
  } catch (error) {
    console.error('GNews API Error:', error.message);
    return [];
  }
}

// Generate menu message with language instructions
function getMenuMessage() {
  let message = `📰 *NewsBot* - India Focused News\n\n`;
  message += `Choose category:\n\n`;
  
  Object.keys(categories).forEach(key => {
    const scope = categories[key].country ? '(India)' : '(World)';
    message += `${key}. ${categories[key].name} ${scope}\n`;
  });
  
  message += `\n*Language Options:*\n`;
  message += `- Send "<number> en" for English (default)\n`;
  message += `- Send "<number> hi" for Hindi\n`;
  message += `- Send "<number> mr" for Marathi\n\n`;
  message += `Example: "1 hi" for Hindi General News`;
  return message;
}

// Format news item with URL
function formatNewsItem(item, index, lang) {
  const urlDisplay = item.url ? ` (${formatUrl(item.url)})` : '';
  const shortDesc = item.description.length > 80 
    ? `${item.description.substring(0, 80)}...` 
    : item.description;
    
  return `*${index + 1}. ${item.title}*${urlDisplay}\n${shortDesc}\n`;
}

// Parse incoming message for category and language
function parseInput(message) {
  const parts = message.split(' ');
  const categoryPart = parts[0];
  const langPart = parts[1] || 'en'; // Default to English
  
  return {
    categoryKey: categoryPart,
    lang: languages[langPart] ? langPart : 'en' // Fallback to English if invalid
  };
}

// Twilio webhook handler
router.post('/incoming', async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body.trim().toLowerCase();
  
  try {
    // Show menu
    if (['hi', 'hello', 'menu'].includes(incomingMsg)) {
      twiml.message(getMenuMessage());
    } 
    // Handle category selection
    else {
      const { categoryKey, lang } = parseInput(incomingMsg);
      
      if (categories[categoryKey]) {
        const category = categories[categoryKey];
        const newsItems = await fetchNews(category, lang);
        const langInfo = languages[lang];
        
        if (newsItems.length > 0) {
          let responseText = `📢 *Top ${category.name.toUpperCase()} News ${category.country ? '(India)' : '(World)'} ${langInfo.emoji} ${langInfo.name}*\n\n`;
          newsItems.forEach((item, index) => {
            responseText += formatNewsItem(item, index, lang) + '\n';
          });
          responseText += `\n*Language Options:*\n`;
          responseText += `Reply with "${categoryKey} en" for English\n`;
          responseText += `"${categoryKey} hi" for Hindi\n`;
          responseText += `"${categoryKey} mr" for Marathi\n`;
          responseText += `Or "menu" for main menu`;
          twiml.message(responseText);
        } else {
          twiml.message(
            `⚠️ Couldn't fetch ${category.name} news in ${langInfo.name} right now.\n` +
            `Try another language or category.`
          );
        }
      } else {
        twiml.message(
          `❌ Invalid option. Please choose:\n\n` +
          `${getMenuMessage()}\n\n` +
          `Example: "5 hi" for Technology news in Hindi`
        );
      }
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Error:', error);
    const errorTwiml = new MessagingResponse();
    errorTwiml.message(
      '⚠️ We encountered an error processing your request.\n' +
      'Our team has been notified. Please try again later.'
    );
    res.type('text/xml').send(errorTwiml.toString());
  }
});

module.exports = router;