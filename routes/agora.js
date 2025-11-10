const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-token');

// Agora credentials
const APP_ID = 'f873c059d3384c93b0a7a4c5755eafcd';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || ''; // Get from Agora Console or env

/**
 * Generate Agora RTC token
 * GET /api/agora/token?channelName=xxx&uid=0
 */
router.get('/token', (req, res) => {
  try {
    const { channelName, uid } = req.query;
    
    if (!channelName) {
      return res.status(400).json({ error: 'channelName is required' });
    }
    
    const uidInt = parseInt(uid) || 0;
    
    // If no certificate, return empty token (for testing/free accounts)
    if (!APP_CERTIFICATE) {
      console.log(`⚠️ No APP_CERTIFICATE, returning empty token for channel: ${channelName}`);
      return res.json({
        token: '',
        appId: APP_ID,
        channelName,
        uid: uidInt,
        message: 'Using empty token (testing mode)',
      });
    }
    
    const role = RtcRole.PUBLISHER;
    
    // Token expires in 24 hours
    const expirationTimeInSeconds = 3600 * 24;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uidInt,
      role,
      privilegeExpiredTs
    );
    
    console.log(`✅ Agora token generated for channel: ${channelName}`);
    
    res.json({
      token,
      appId: APP_ID,
      channelName,
      uid: uidInt,
      expiresAt: privilegeExpiredTs,
    });
  } catch (error) {
    console.error('❌ Error generating Agora token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
