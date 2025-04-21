const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');

// Configuration
const NEWS_ITEMS_PER_CATEGORY = 5; // Number of news items to return

// Enhanced mock data with more items
const newsCategories = {
  'general': [
    { title: 'Global Summit Addresses Climate Change', description: 'World leaders gather to discuss new climate initiatives.' },
    { title: 'Economy Shows Signs of Recovery', description: 'Latest economic indicators suggest gradual recovery.' },
    { title: 'Major City Announces Green Initiative', description: 'Plan includes renewable energy and public transport upgrades.' },
    { title: 'International Health Organization Issues Alert', description: 'New guidelines released for emerging health concern.' },
    { title: 'Education Reforms Approved', description: 'Changes aim to improve accessibility and quality.' }
  ],
  'technology': [
    { title: 'New AI Model Breaks Performance Records', description: 'Researchers unveil groundbreaking AI architecture.' },
    { title: 'Quantum Computing Milestone Achieved', description: 'Company announces stable quantum operations.' },
    { title: 'Tech Giant Unveils New Smartphone', description: 'Latest model features breakthrough battery technology.' },
    { title: 'Open Source Project Reaches Major Milestone', description: 'Community-driven software hits version 5.0.' },
    { title: 'Cybersecurity Firm Discovers Critical Vulnerability', description: 'Patch released for widely-used software.' }
  ],
  // ... (similar expansions for sports and politics)
};

// Health check endpoint (improved)
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WhatsApp NewsBot',
    version: '1.0.0'
  });
});

// Twilio webhook handler (enhanced)
router.post('/', async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body.trim().toLowerCase();
  
  try {
    // Validate incoming message
    if (!incomingMsg) {
      throw new Error('Empty message received');
    }

    // Process message
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
    console.error(`[${new Date().toISOString()}] Error:`, {
      error: error.message,
      incomingMsg,
      stack: error.stack
    });
    
    const errorTwiml = new MessagingResponse();
    errorTwiml.message(
      `⚠️ We encountered an error processing your request.\n` +
      `Please try again later or contact support.`
    );
    res.type('text/xml').send(errorTwiml.toString());
  }
});

module.exports = router;