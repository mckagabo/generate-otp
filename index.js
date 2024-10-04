const sdk = require('node-appwrite');
const crypto = require('crypto');
const redis = require('redis');
const twilio = require('twilio');

// Initialize Appwrite SDK client
const client = new sdk.Client();
const accountSid = process.env.TWILIO_ACCOUNT_SID; // Environment variable for Twilio SID
const authToken = process.env.TWILIO_AUTH_TOKEN;   // Environment variable for Twilio Auth Token

client
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT) // Your Appwrite endpoint
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID) // Project ID from the function environment
    .setKey(process.env.APPWRITE_API_KEY);               // API key for Appwrite

// Initialize Redis Client
const redisClient = redis.createClient({
    url: process.env.REDIS_URL // Set up Redis URL in your environment variables
});
redisClient.connect();

export default async({ req, res, log, error })=> {
    try {
        const userId = req.payload.userId;      // Get userId from request payload
        const phoneNumber = req.payload.phone;  // Get phone number from request payload

        // 1. Generate a random OTP
        const otp = crypto.randomInt(100000, 999999).toString();

        // 2. Store the OTP in Redis with an expiration time (5 minutes)
        const expiresInSeconds = 15 * 60; // 5 minutes expiration time
        await redisClient.setEx(`otp:${userId}`, expiresInSeconds, otp);

        // 3. Send the OTP via SMS using Twilio
        const twilioClient = twilio(accountSid, authToken);
        await twilioClient.messages.create({
            body: `Your OTP code is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER, // Environment variable for Twilio phone number
            to: phoneNumber
        });
        log('Everything is fine',otp);
        return res.json({ success: true, message: 'OTP sent via SMS successfully.' });
    } catch (error) {
        console.error('Error:', error);
        log('Error:',error);

        // If something goes wrong, log an error
        error('Hello, Errors!');
        return res.json({ success: false, message: 'Failed to send OTP', error });
    }
};