const ErrorHandler = require('../../utils/default/errorHandler');
const { User } = require('../../models'); // Adjust the path as necessary
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMail } = require("../../utils/verifyEmail");




exports.register = async (req, res, next) => {
    try {
        const { username, email, password, phone } = req.body;


        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return next(new ErrorHandler('User Already Exists with this Email!', 400));

        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create new user
        function generate4DigitOTP() {
            return Math.floor(1000 + Math.random() * 9000);
        }
        const otp = generate4DigitOTP();
        const newUser = await User.create({
            username,
            email,
            phone,
            password: hashedPassword,
            otp
        });

        // Generate JWT token
        const payload = {
            id: newUser.uuid,
            email: newUser.email
        }





        try {
            await sendMail({
                receiver: email,
                subject: `OTP Verification Mail`,
                content: 'content',
                service: null,
                host: "smtp.gmail.com",
                htmlContent: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
        <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h2 style="color: #333; text-align: center;">Email Verification</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>Use the following OTP to complete your verification:</p>
          <h1 style="text-align: center; color: #007bff; letter-spacing: 4px;">${otp}</h1>
          <p style="color: #666;">This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
          <br/>
          <p style="font-size: 12px; color: #aaa; text-align: center;">If you did not request this, please ignore this email.</p>
          <p style="font-size: 12px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} MockTale</p>
        </div>
      </div>
    `,
                cc: null,
                bcc: null
            });
        } catch (error) {
            console.error("Error sending Verification Email:", error);

            return next(new ErrorHandler(500, "Failed to send Verification Email"));
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({
            message: 'User registered successfully',
            token
        });

    } catch (err) {
        const error = new ErrorHandler(
            'Error while Register User', 500
        );
        return next(error);
    }

}

exports.login = async (req, res,    next) => {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return next(new ErrorHandler('Invalid email !', 401));
        }
        // Check password
        const validated_password = await bcrypt.compare(password, user.password);
        if (!validated_password) {
            return next(new ErrorHandler('Invalid email or password', 401));
        }
        // Generate JWT token
        const payload = { id: user.uuid, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: 'Login successful',
            token,

        });

    } catch (err) {
        const error = new ErrorHandler(
            'Error while Login User', 500
        );
        return next(error);
    }
};

exports.otp_verify = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        // Find user by email   
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return next(new ErrorHandler('Invalid email !', 401));
        }
        // Check OTP
        if (user.otp !== otp) {
            return next(new ErrorHandler('Invalid OTP', 401));
        }

        user.otp = null; // Clear OTP after verification
        await user.save();  


        res.status(200).json({
            message: 'OTP verified successfully',
        });
    } catch (err) {
        const error = new ErrorHandler(
            'Error while verifying OTP', 500
        );
        return next(error);
    }
};

exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return next(new ErrorHandler('User not found with this email!', 404));
        }
        // Generate a new OTP
        const otp = Math.floor(1000 + Math.random() * 9000);
        user.otp = otp;
        await user.save();
        // Send reset link via email
        try {
            await sendMail({
                receiver: email,
                subject: `Password Reset Request`,
                content: 'content',
                service: null,
                host: "smtp.gmail.com",
                htmlContent: `

        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
        <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h2 style="color: #333; text-align: center;">Email Verification</h2>
          <p>Hi <strong>${user.username}</strong>,</p>
          <p>Use the following OTP to complete your verification:</p>
          <h1 style="text-align: center; color: #007bff; letter-spacing: 4px;">${otp}</h1>
          <p style="color: #666;">This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
          <br/>
          <p style="font-size: 12px; color: #aaa; text-align: center;">If you did not request this, please ignore this email.</p>
          <p style="font-size: 12px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} MockTale</p>
        </div>
      </div>
    `,
                cc: null,
                bcc: null
            });
        } catch (error) {
            console.error("Error sending Password Reset Email:", error);
            return next(new ErrorHandler(500, "Failed to send Password Reset Email"));
        }
        res.status(200).json({
            message: 'OTP sent to your email for password reset',
        });
    } catch (err) {
        const error = new ErrorHandler(
            'Error while processing forgot password request', 500
        );
        return next(error);
    }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const { email, newPassword } = req.body;   
        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return next(new ErrorHandler('User not found with this email!', 404));
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Update user's password
        user.password = hashedPassword;

        await user.save();
        res.status(200).json({
            message: 'Password reset successfully',
        });
    } catch (err) {
        const error = new ErrorHandler(
            'Error while resetting password', 500
        );
        return next(error);
    }
}


