const ResponseHandler = require('../utils/responseHandle')
const ChatService = require('../services/chatService')

class ChatController {
    static async sendMessage(req, res) {
        try {
            const { message } = req.body;
            
            if (!message) {
                return ResponseHandler.error(res, new Error('Message is required'), 400);
            }

            const result = await ChatService.processMessage(message);
            return ResponseHandler.success(res, result, 'Message processed successfully');
        } catch (error) {
            return ResponseHandler.error(res, error);
        }
    }

    static async getChatHistory(req, res) {
        try {
            const history = await ChatService.getChatHistory();
            return ResponseHandler.success(res, history, 'Chat history retrieved successfully');
        } catch (error) {
            return ResponseHandler.error(res, error);
        }
    }

    static async clearHistory(req, res) {
        try {
            await ChatService.clearHistory();
            return ResponseHandler.success(res, null, 'Chat history cleared successfully');
        } catch (error) {
            return ResponseHandler.error(res, error);
        }
    }
}

module.exports = ChatController;