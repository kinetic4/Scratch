class ResponseHandler {
    static success(res, data, message = 'Success', status = 200) {
        return res.status(status).json({
            success : true,
            message,
            data
        })
    }

    static error(res, error, status = 400) {
        return res.status(status).json({
            success: false,
            message: error.message || 'An error occured' ,
            error: process.env.NODE_ENV === 'development' ? error : undefined,
        })
    }
}

module.exports = ResponseHandler
