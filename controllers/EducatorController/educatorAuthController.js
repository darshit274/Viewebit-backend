const ErrorHandler = require('../../utils/default/errorHandler');
const { Educator } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMail } = require('../../utils/verifyEmail');

function generate6DigitOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}

// Educator login - Step 1: Verify credentials and send OTP
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const educator = await Educator.findOne({ where: { email } });
        if (!educator) {
            return next(new ErrorHandler('Invalid email or password', 401));
        }

        if (!educator.isActive) {
            return next(new ErrorHandler('Account is deactivated. Contact your institution admin.', 403));
        }

        const isPasswordValid = await bcrypt.compare(password, educator.password);
        if (!isPasswordValid) {
            return next(new ErrorHandler('Invalid email or password', 401));
        }

        const otp = generate6DigitOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        educator.otp = otp.toString();
        educator.otpExpiry = otpExpiry;
        await educator.save();

        try {
            await sendMail({
                receiver: email,
                subject: `Viewebit Educator Panel - Login Verification Code`,
                content: 'content',
                service: null,
                host: "smtp.gmail.com",
                htmlContent: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
                  <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h2 style="color: #333; text-align: center;">Educator Login Verification</h2>
                    <p>Hi <strong>${educator.name}</strong>,</p>
                    <p>Use the following code to complete your login:</p>
                    <h1 style="text-align: center; color: #7C3AED; letter-spacing: 4px; background-color: #f0f0f0; padding: 15px; border-radius: 8px;">${otp}</h1>
                    <p style="color: #666;">This verification code is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
                    <br/>
                    <p style="font-size: 12px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} Viewebit Academy - Educator Panel</p>
                  </div>
                </div>
              `,
                cc: null,
                bcc: null
            });
        } catch (error) {
            console.error("Error sending Educator OTP Email:", error);
            return next(new ErrorHandler("Failed to send verification code. Please try again.", 500));
        }

        res.status(200).json({
            success: true,
            message: 'Verification code sent to your email',
            data: { email: educator.email, requiresOTP: true }
        });
    } catch (err) {
        console.error('Educator login error:', err);
        return next(new ErrorHandler('Login failed', 500));
    }
};

// Educator login - Step 2: Verify OTP and issue token
exports.verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const educator = await Educator.findOne({ where: { email } });
        if (!educator) return next(new ErrorHandler('Educator not found', 404));

        if (!educator.otp || !educator.otpExpiry) {
            return next(new ErrorHandler('No verification code found. Please request a new one.', 400));
        }

        if (new Date() > new Date(educator.otpExpiry)) {
            educator.otp = null;
            educator.otpExpiry = null;
            await educator.save();
            return next(new ErrorHandler('Verification code has expired. Please login again.', 400));
        }

        if (educator.otp !== otp.toString()) {
            return next(new ErrorHandler('Invalid verification code', 401));
        }

        const sessionId = require('crypto').randomUUID();
        educator.otp = null;
        educator.otpExpiry = null;
        educator.lastLogin = new Date();
        educator.current_session_id = sessionId;
        await educator.save();

        const payload = { id: educator.id, email: educator.email, sessionId };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                educator: {
                    id: educator.id,
                    name: educator.name,
                    email: educator.email,
                    avatar: educator.avatar,
                    designation: educator.designation,
                    institution_id: educator.institution_id,
                    branch_id: educator.branch_id,
                    department_id: educator.department_id,
                    last_login: educator.lastLogin
                },
                token
            }
        });
    } catch (err) {
        console.error('Educator OTP verification error:', err);
        return next(new ErrorHandler('OTP verification failed', 500));
    }
};

exports.resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        const educator = await Educator.findOne({ where: { email } });
        if (!educator) return next(new ErrorHandler('Educator not found', 404));

        const otp = generate6DigitOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        educator.otp = otp.toString();
        educator.otpExpiry = otpExpiry;
        await educator.save();

        try {
            await sendMail({
                receiver: email,
                subject: `Viewebit Educator Panel - New Verification Code`,
                content: 'content',
                service: null,
                host: "smtp.gmail.com",
                htmlContent: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
                  <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <h2 style="color: #333; text-align: center;">Educator Login Verification</h2>
                    <p>Hi <strong>${educator.name}</strong>,</p>
                    <p>Here is your new verification code:</p>
                    <h1 style="text-align: center; color: #7C3AED; letter-spacing: 4px; background-color: #f0f0f0; padding: 15px; border-radius: 8px;">${otp}</h1>
                    <p style="color: #666;">This verification code is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
                    <br/>
                    <p style="font-size: 12px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} Viewebit Academy - Educator Panel</p>
                  </div>
                </div>
              `,
                cc: null,
                bcc: null
            });
        } catch (error) {
            console.error("Error sending Educator OTP Email:", error);
            return next(new ErrorHandler("Failed to send verification code. Please try again.", 500));
        }

        res.status(200).json({ success: true, message: 'New verification code sent to your email' });
    } catch (err) {
        console.error('Educator resend OTP error:', err);
        return next(new ErrorHandler('Failed to resend verification code', 500));
    }
};

exports.getProfile = async (req, res, next) => {
    try {
        const educator = await Educator.findByPk(req.educator.id, {
            attributes: { exclude: ['password', 'otp', 'otpExpiry', 'current_session_id'] }
        });
        if (!educator) return next(new ErrorHandler('Educator not found', 404));
        res.status(200).json({ success: true, data: educator });
    } catch (err) {
        console.error('Get educator profile error:', err);
        return next(new ErrorHandler('Failed to fetch profile', 500));
    }
};

exports.logout = async (req, res, next) => {
    try {
        await Educator.update(
            { current_session_id: null },
            { where: { id: req.educator.id } }
        );
        res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (err) {
        console.error('Educator logout error:', err);
        return next(new ErrorHandler('Logout failed', 500));
    }
};
