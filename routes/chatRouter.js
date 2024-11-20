const express = require('express')
const ChatController = require('../controller/chatController')
const router =  express.Router() 
const ChatService = require('../services/chatService')


router.get('/chat', async (req, res) => {
    try {
      const messages = await ChatService.getChatHistory(50); // Limit to last 50 messages
      res.render('chatbot', { 
        messages: messages || [],
        title: 'AI Chatbot' 
      }); 
    } catch (err) {
      console.error('Error fetching chat history', err);
      res.render('chatbot', { 
        messages: [], 
        title: 'AI Chatbot',
        error: 'Unable to load chat history' 
      });
    }
  });
  

router.post('/message', ChatController.sendMessage);
router.delete('/history', ChatController.clearHistory);

module.exports = router