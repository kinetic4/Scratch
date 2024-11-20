const message = require("../models/message");
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();


class ChatService {
    static async processMessage(userMessage) {
        const responses = {
           'greetings': [
                'Hello! How can I assist you today?',
                'Hi there! What can I help you with?',
                'Greetings! I\'m here to help.'
            ],
            'hi': [
                'Hi! How are you doing?',
                'Hello! How can I help you today?'
            ],
            'how are you': [
                'I\'m doing well, thank you for asking!',
                'I\'m great! How about you?',
                'Functioning perfectly and ready to help!'
            ],

            // Help Intents
            'help': [
                'I can help you with various queries. Ask me about general topics, get information, or just chat!',
                'I\'m an AI assistant. Feel free to ask me questions about anything!'
            ],

            // Knowledge Intents
            'who are you': [
                'I\'m an AI chatbot designed to assist you with various questions and conversations.',
                'I\'m an intelligent assistant powered by advanced natural language processing.'
            ],
            'what can you do': [
                'I can help you with general conversation, answer questions, provide information, and engage in friendly chat.',
                'My capabilities include answering questions, providing information, and having conversational interactions.'
            ],

            // Goodbye Intents
            'bye': [
                'Goodbye! Have a great day!',
                'See you later! Feel free to chat again anytime.',
                'Bye! Hope I could help you today.'
            ]
        }

        // basic intent of bot 
        const tokens = tokenizer.tokenize(userMessage.toLowerCase());
        let botResponse = "I'm not sure how to respond to that. Could you rephrase or ask something else?";

        // Check for exact and partial matches
        for (const [intent, responseList] of Object.entries(responses)) {
            if (
                tokens.some(token => token.includes(intent)) || 
                userMessage.toLowerCase().includes(intent)
            ) {
                // Randomly select a response from the intent's list
                botResponse = responseList[Math.floor(Math.random() * responseList.length)];
                break;
            }
        }   

         // Fallback for more dynamic responses
         if (botResponse === "I'm not sure how to respond to that. Could you rephrase or ask something else?") {
            const fallbackResponses = [
                "That's an interesting point. Could you elaborate?",
                "I'm still learning. Can you explain more about what you mean?",
                "Hmm, I'm not certain about that. Would you like to rephrase your question?"
            ];
            botResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }


        // save user message
        const saveMessage = await message.create({
            role: 'user',
            content: userMessage
        });


        // save bot response 
        const saveBotRes = await message.create({
            role: 'bot',
            content: botResponse
        });

        return {
            userMessage: saveMessage,
            botResponse: saveBotRes
        };
        
    }

    static async getChatHistory(limit = 50) {
        return await message.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .sort({ timestamp: 1 })
    }

    static async clearHistory() {
        return await message.deleteMany({})
    }
}

module.exports = ChatService;