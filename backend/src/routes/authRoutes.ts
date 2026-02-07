import express from 'express';
import { register, login, getCurrentUser, changePassword, setPassword, hasPassword } from '../controllers/authController';
import { getWechatQRCode, checkWechatLoginStatus, getWechatAvailable, wechatOAuthRedirect, wechatOAuthCallback, checkSubscriptionStatus, getFollowQRCode, getBindWechatQRCode, checkBindWechatStatus, unbindWechat } from '../controllers/wechatAuthController';
import { getSmsStatus, sendSmsCode, smsLogin, resetPasswordByPhone, sendResetCode, sendBindPhoneCode, bindPhone } from '../controllers/smsAuthController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private (requires authentication)
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   GET /api/auth/wechat/available
 * @desc    Check if wechat login is available
 * @access  Public
 */
router.get('/wechat/available', getWechatAvailable);

/**
 * @route   GET /api/auth/wechat/qrcode
 * @desc    Get wechat login QR code URL
 * @access  Public
 */
router.get('/wechat/qrcode', getWechatQRCode);

/**
 * @route   GET /api/auth/wechat/status
 * @desc    Check wechat login status (polling)
 * @access  Public
 */
router.get('/wechat/status', checkWechatLoginStatus);

/**
 * @route   GET /api/auth/wechat/oauth
 * @desc    WeChat OAuth redirect (for in-app browser)
 * @access  Public
 */
router.get('/wechat/oauth', wechatOAuthRedirect);

/**
 * @route   GET /api/auth/wechat/oauth/callback
 * @desc    WeChat OAuth callback
 * @access  Public
 */
router.get('/wechat/oauth/callback', wechatOAuthCallback);

/**
 * @route   GET /api/auth/wechat/subscription
 * @desc    Check if user has subscribed to the official account
 * @access  Private
 */
router.get('/wechat/subscription', authenticate, checkSubscriptionStatus);

/**
 * @route   GET /api/auth/wechat/follow-qrcode
 * @desc    Get QR code for following the official account
 * @access  Public
 */
router.get('/wechat/follow-qrcode', getFollowQRCode);

/**
 * @route   GET /api/auth/sms/status
 * @desc    Check if SMS login is available
 * @access  Public
 */
router.get('/sms/status', getSmsStatus);

/**
 * @route   POST /api/auth/sms/send
 * @desc    Send SMS verification code
 * @access  Public
 */
router.post('/sms/send', sendSmsCode);

/**
 * @route   POST /api/auth/sms/login
 * @desc    Login with phone and SMS code
 * @access  Public
 */
router.post('/sms/login', smsLogin);

/**
 * @route   POST /api/auth/sms/send-reset-code
 * @desc    Send SMS code for password reset
 * @access  Public
 */
router.post('/sms/send-reset-code', sendResetCode);

/**
 * @route   POST /api/auth/sms/reset-password
 * @desc    Reset password via phone + SMS code
 * @access  Public
 */
router.post('/sms/reset-password', resetPasswordByPhone);

/**
 * @route   GET /api/auth/has-password
 * @desc    Check if user has set password
 * @access  Private
 */
router.get('/has-password', authenticate, hasPassword);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (for users who have password)
 * @access  Private
 */
router.post('/change-password', authenticate, changePassword);

/**
 * @route   POST /api/auth/set-password
 * @desc    Set password (for phone registered users)
 * @access  Private
 */
router.post('/set-password', authenticate, setPassword);

/**
 * @route   GET /api/auth/bindWechat/qrcode
 * @desc    Get QR code for binding WeChat
 * @access  Private
 */
router.get('/bindWechat/qrcode', authenticate, getBindWechatQRCode);

/**
 * @route   GET /api/auth/bindWechat/status
 * @desc    Check binding status (polling)
 * @access  Private
 */
router.get('/bindWechat/status', authenticate, checkBindWechatStatus);

/**
 * @route   POST /api/auth/unbindWechat
 * @desc    Unbind WeChat
 * @access  Private
 */
router.post('/unbindWechat', authenticate, unbindWechat);

/**
 * @route   POST /api/auth/sms/send-bind-code
 * @desc    Send SMS code for binding phone (for WeChat users)
 * @access  Private
 */
router.post('/sms/send-bind-code', authenticate, sendBindPhoneCode);

/**
 * @route   POST /api/auth/sms/bind-phone
 * @desc    Bind phone number to current account
 * @access  Private
 */
router.post('/sms/bind-phone', authenticate, bindPhone);

export default router;
