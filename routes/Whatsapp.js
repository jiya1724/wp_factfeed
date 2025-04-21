const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');

// Configuration
const NEWS_ITEMS_PER_CATEGORY = 5;

// Enhanced mock data
const newsCategories = {
  'general': [
    { title: 'Global Summit Addresses Climate Change', description: 'World leaders gather to discuss new climate initiatives.' },
    { title: 'Economy Shows Signs of Recovery', description: 'Latest economic indicators suggest gradual recovery.' }
  ],
  'technology': [
    { title: 'New AI Model Breaks Performance Records', description: 'Researchers unveil groundbreaking AI architecture.' },
    { title: 'Quantum Computing Milestone Achieved', description: 'Company announces stable quantum operations.' }
  ],
  'sports': [
    { title: 'National Team Wins Championship', description: 'Historic victory after decades with stunning performance.' },
    { title: 'Olympic Preparations in Full Swing', description: 'Host city completes all venues ahead of schedule.' }
  ],
  'politics': [
    { title: 'New Legislation Passes in Parliament', description: 'Controversial bill approved after heated debate.' },
    { title: 'Diplomatic Tensions Ease Between Nations', description: 'Both sides agree to resume talks after months.' }
  ]
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'WhatsApp NewsBot',
    version: '1.0.0'
  });
});

// Twilio webhook handler
router.post('/incoming', async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body.trim().toLowerCase();
  
  try {
    if (['hi', 'hello', 'menu'].includes(incomingMsg)) {
      twiml.message(
        `📰 *NewsBot* - Get latest headlines\n\n` +
        `Choose category:\n\n` +
        `1. General News\n2. Technology\n3. Sports\n4. Politics\n\n` +
        `Reply with the number (1-4)`
      );
    } 
    else if (/^(1|2|3|4|general|tech|technology|sports|politics)$/.test(incomingMsg)) {
      const categoryMap = {
        '1': 'general', 'general': 'general',
        '2': 'technology', 'tech': 'technology', 'technology': 'technology',
        '3': 'sports', 'sports': 'sports',
        '4': 'politics', 'politics': 'politics'
      };
      
      const selectedCategory = categoryMap[incomingMsg];
      const newsItems = newsCategories[selectedCategory]?.slice(0, NEWS_ITEMS_PER_CATEGORY) || [];
      
      if (newsItems.length > 0) {
        let responseText = `📢 *Top ${selectedCategory.toUpperCase()} News*:\n\n`;
        newsItems.forEach((item, index) => {
          responseText += `*${index + 1}. ${item.title}*\n${item.description}\n\n`;
        });
        responseText += `Reply with 1-4 for more news or "menu"`;
        twiml.message(responseText);
      } else {
        twiml.message(`⚠️ No ${selectedCategory} news available. Try another category (1-4)`);
      }
    }
    else {
      twiml.message(
        `❌ Invalid option. Please choose:\n\n` +
        `1. General News\n2. Technology\n3. Sports\n4. Politics\n\n` +
        `Or type "menu" for options`
      );
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Error:', error);
    const errorTwiml = new MessagingResponse();
    errorTwiml.message('⚠️ Server error. Please try again later.');
    res.type('text/xml').send(errorTwiml.toString());
  }
});

module.exports = router;