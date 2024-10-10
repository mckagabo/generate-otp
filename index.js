import { Client } from 'node-appwrite';  // Named import for Client class
import randomstring from 'randomstring';
import redis from 'redis';
import twilio from 'twilio';

// Initialize Appwrite SDK client
const client = new Client();
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

export default async ({req,res,log,error}) => { // Using CommonJS syntax
         if(req.method=='GET'){
            const otp=randomstring.generate({
                length: 6,
                charset: 'numeric'
            });
            try {
                const expiresInSeconds = 5 * 60; // 5 minutes expiration time
                await redisClient.setEx(`otp:${otp}`, expiresInSeconds, otp);
                log('OTP:',otp);
                return res.send('Yes I can hear you but make sure it is a post request'+otp)  
            } catch (error) {
                log(error)
                return res.send('Error:'+otp)  ;
            }
         }

         if(req.method=='POST'){
                // 1. Generate a random OTP
           // Generate a 6-digit OTP using randomstring
        const otp = randomstring.generate({
            length: 6,
            charset: 'numeric'
        });
            try{
            const phoneNumber = req.body.phone;
            const userId = req.body.userid;
    
            if (!userId || !phoneNumber) {
                error('Invalid input: Missing userId or phone number',req.body);
                log('Invalid input: Missing userId or phone number',req.body);
                return res.json({ success: false, message: 'Invalid input: Missing userId or phone number'});
            }
         
         
        
            // 2. Store the OTP in Redis with an expiration time (5 minutes)
            const expiresInSeconds = 5 * 60; // 5 minutes expiration time
            await redisClient.setEx(`otp:${userId}`, expiresInSeconds, otp);
            log(otp,'Was set in redis with this id:'+id);
            // 3. Send the OTP via SMS using Twilio
            const twilioClient = twilio(accountSid, authToken);
            await twilioClient.messages.create({
                body: `Your OTP code is: ${otp}`,
                from: process.env.TWILIO_PHONE_NUMBER, // Environment variable for Twilio phone number
                to: phoneNumber
            });
           
            log('Everything is fine', otp);
            return res.json({ success: true, message: 'OTP sent via SMS successfully.' });
            
        } catch (err) {
             // 2. Store the OTP in Redis with an expiration time (5 minutes)
             const expiresInSeconds = 5 * 60; // 5 minutes expiration time
             await redisClient.setEx(`otp:${otp}`, expiresInSeconds, otp);
            error('Error:', err.message);
            log('Sorry',err.message);
            return res.json({ success: false, message: 'Failed to send OTP'+otp, error: err.message, request:req.body});
        }
        
     }
     
};
