const ErrorHandler = require('../../utils/default/errorHandler');
const { User, TestSession, Test, sequelize } = require('../../models'); // ✅ Add sequelize instance
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendMail } = require("../../utils/verifyEmail");
const { Sequelize, Op } = require('sequelize');




exports.register = async (req, res, next) => {
    try {
        const { username, name, email, password, phone, mobile, device_id } = req.body;

        // Handle field mapping - accept both naming conventions
        const finalUsername = username || name;
        const finalPhone = phone || mobile;


        // Check if user already exists with email or username
        const existingUserByEmail = await User.findOne({ where: { email } });
        if (existingUserByEmail) {
            return next(new ErrorHandler('User already exists with this email!', 400));
        }

        const existingUserByUsername = await User.findOne({ where: { username: finalUsername } });
        if (existingUserByUsername) {
            return next(new ErrorHandler('Username is already taken!', 400));
        }
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create new user
        function generate4DigitOTP() {
            return Math.floor(1000 + Math.random() * 9000);
        }
        const otp = generate4DigitOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // ✅ FIX: Generate id manually (trigger is broken due to table self-reference)
        const maxIdResult = await User.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
            raw: true
        });
        const nextId = (maxIdResult?.maxId || 0) + 1;

        const newUser = await User.create({
            id: nextId, // ✅ FIX: Explicitly provide id
            username: finalUsername,
            email,
            phone: finalPhone,
            password: hashedPassword,
            otp,
            otpExpiry,
            isEmailVerified: false,
            // Lock the account to the signup device when the mobile app provides one.
            // Web signups don't send device_id, so this stays null for them — web logins
            // are not device-locked. Admin can clear via /admin/users/:id/reset-device.
            device_id: device_id || null
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
          <p>Hi <strong>${finalUsername}</strong>,</p>
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

        const tokenPayload = { 
            uuid: newUser.uuid,
            email: newUser.email 
        };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                uuid: newUser.uuid,
                username: newUser.username,
                email: newUser.email,
                isEmailVerified: newUser.isEmailVerified
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        console.error('Registration error stack:', err.stack);
        const error = new ErrorHandler(
            'Error while Register User: ' + err.message, 500
        );
        return next(error);
    }

}

exports.login = async (req, res,    next) => {
    try {
        const { email, password, device_id } = req.body;
        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return next(new ErrorHandler('Invalid email !', 401));
        }
        // Check if email is verified
        if (!user.isEmailVerified) {
            return next(new ErrorHandler('Please verify your email before logging in', 403));
        }

        // Check password
        const validated_password = await bcrypt.compare(password, user.password);
        if (!validated_password) {
            return next(new ErrorHandler('Invalid email or password', 401));
        }

        // Device lock check (app only — device_id is only sent by the mobile app, never by web)
        if (device_id) {
            if (user.device_id && user.device_id !== device_id) {
                // Device mismatch — could be reinstall on same phone or a different device.
                // Send OTP to the registered email so the student can verify their identity.
                // If OTP is correct, the device_id is updated and they are logged in.
                // This avoids admin intervention for legitimate reinstalls.
                const otp = Math.floor(1000 + Math.random() * 9000);
                const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
                await user.update({ otp, otpExpiry });

                // Sign a short-lived token carrying the new device_id so otp_verify can
                // update it after the student proves their identity via OTP.
                const deviceChangeToken = jwt.sign(
                    { userId: user.uuid, newDeviceId: device_id },
                    process.env.JWT_SECRET,
                    { expiresIn: '10m' }
                );

                try {
                    await sendMail({
                        receiver: user.email,
                        subject: 'Device Verification - MockTale Academy',
                        htmlContent: `Your device verification OTP is: <b>${otp}</b><br/>Valid for 10 minutes.<br/><br/>If you did not reinstall the app, please ignore this email.`
                    });
                } catch (_) { /* email failure should not block the response */ }

                return res.status(403).json({
                    success: false,
                    errorCode: 'DEVICE_VERIFICATION_REQUIRED',
                    message: 'New device detected. Enter the OTP sent to your registered email to continue.',
                    deviceChangeToken
                });
            }
            // First login from app, or same device — save/confirm device_id
            await user.update({ device_id });
        }

        // Generate a unique session ID and save it — invalidates any previous session
        const sessionId = require('crypto').randomUUID();
        await user.update({ current_session_id: sessionId, lastLogin: new Date() });

        // Generate JWT token (includes sessionId to enforce single-device login)
        const payload = {
            uuid: user.uuid,  // Use UUID as primary identifier
            email: user.email,
            sessionId
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                uuid: user.uuid,
                username: user.username,
                email: user.email,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        const error = new ErrorHandler(
            'Error while Login User: ' + err.message, 500
        );
        return next(error);
    }
};

exports.otp_verify = async (req, res, next) => {
    try {
        const { email, otp, deviceChangeToken } = req.body;
        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return next(new ErrorHandler('Invalid email !', 401));
        }
        // Check if OTP exists
        if (!user.otp || !user.otpExpiry) {
            return next(new ErrorHandler('No OTP found. Please request a new one.', 400));
        }

        // Check if OTP has expired
        if (new Date() > user.otpExpiry) {
            return next(new ErrorHandler('OTP has expired. Please request a new one.', 400));
        }

        // Check OTP
        if (user.otp !== parseInt(otp)) {
            return next(new ErrorHandler('Invalid OTP', 401));
        }

        // Clear OTP and mark email as verified
        user.otp = null;
        user.otpExpiry = null;
        user.isEmailVerified = true;

        // If this OTP was for device re-enrollment, update the device_id
        if (deviceChangeToken) {
            try {
                const decoded = jwt.verify(deviceChangeToken, process.env.JWT_SECRET);
                if (decoded.userId === user.uuid && decoded.newDeviceId) {
                    user.device_id = decoded.newDeviceId;
                }
            } catch (_) { /* invalid/expired token — ignore, device_id unchanged */ }
        }

        await user.save();

        res.status(200).json({
            success: true,
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
        // Generate a new OTP with expiry
        const otp = Math.floor(1000 + Math.random() * 9000);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        user.otp = otp;
        user.otpExpiry = otpExpiry;
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
            success: true,
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
            success: true,
            message: 'Password reset successfully',
        });
    } catch (err) {
        const error = new ErrorHandler(
            'Error while resetting password', 500
        );
        return next(error);
    }
};

// Get user profile (protected route)
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.uuid, {
            attributes: ['uuid', 'username', 'email', 'fullName', 'phoneNumber', 'dateOfBirth', 'schoolName', 'city', 'state', 'avatarUrl', 'isEmailVerified', 'created_at', 'updated_at']
        });
        
        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }
        
        // Get user statistics
        const stats = await getUserStatistics(user.uuid);
        
        // Convert avatar URL to full URL if it's a local path
        const userData = user.toJSON();
        if (userData.avatarUrl && userData.avatarUrl.startsWith('/uploads/')) {
            userData.avatarUrl = `${req.protocol}://${req.get('host')}${userData.avatarUrl}`;
        }
        
        res.status(200).json({
            success: true,
            data: {
                ...userData,
                stats
            }
        });
    } catch (err) {
        console.error('Error in getProfile:', err);
        const error = new ErrorHandler(
            'Error while fetching user profile', 500
        );
        return next(error);
    }
};

// Resend OTP for email verification
exports.resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return next(new ErrorHandler('User not found with this email!', 404));
        }
        
        if (user.isEmailVerified) {
            return next(new ErrorHandler('Email is already verified', 400));
        }
        
        // Generate new OTP
        const otp = Math.floor(1000 + Math.random() * 9000);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();
        
        // Send OTP email
        try {
            await sendMail({
                receiver: email,
                subject: `OTP Verification - Resent`,
                content: 'content',
                service: null,
                host: "smtp.gmail.com",
                htmlContent: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
                    <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <h2 style="color: #333; text-align: center;">Email Verification - Resent</h2>
                        <p>Hi <strong>${user.username}</strong>,</p>
                        <p>Here's your new OTP to complete your verification:</p>
                        <h1 style="text-align: center; color: #007bff; letter-spacing: 4px;">${otp}</h1>
                        <p style="color: #666;">This OTP is valid for <strong>10 minutes</strong>. Please do not share it with anyone.</p>
                        <br/>
                        <p style="font-size: 12px; color: #aaa; text-align: center;">If you did not request this, please ignore this email.</p>
                        <p style="font-size: 12px; color: #aaa; text-align: center;">&copy; ${new Date().getFullYear()} MockTale</p>
                    </div>
                </div>`,
                cc: null,
                bcc: null
            });
        } catch (error) {
            console.error("Error sending OTP Email:", error);
            return next(new ErrorHandler(500, "Failed to send OTP Email"));
        }
        
        res.status(200).json({
            success: true,
            message: 'New OTP sent to your email',
        });
    } catch (err) {
        const error = new ErrorHandler(
            'Error while resending OTP', 500
        );
        return next(error);
    }
};

// Helper function to get user statistics
async function getUserStatistics(userUuid) {
    try {
        // Total tests completed
        const testsCompleted = await TestSession.count({
            where: {
                user_id: userUuid,
                status: 'completed'
            }
        });

        // Calculate average score
        const sessions = await TestSession.findAll({
            where: {
                user_id: userUuid,
                status: 'completed'
            }
        });

        let totalScore = 0;
        let totalPercentage = 0;
        let scoredSessions = 0;

        for (const session of sessions) {
            const score = await calculateSessionScore(session.id);
            if (score.total > 0) {
                totalScore += score.obtained;
                totalPercentage += score.percentage;
                scoredSessions++;
            }
        }

        const averageScore = scoredSessions > 0 ? totalPercentage / scoredSessions : 0;

        // Study hours (based on time spent in tests)
        let totalTimeSpent = 0;
        
        try {
            const completedSessions = await TestSession.findAll({
                where: {
                    user_id: userUuid,
                    status: 'completed',
                    started_at: { [Op.ne]: null },
                    completed_at: { [Op.ne]: null }
                },
                attributes: ['started_at', 'completed_at']
            });

            // Calculate total time spent by summing the differences
            totalTimeSpent = completedSessions.reduce((total, session) => {
                const startTime = new Date(session.started_at).getTime();
                const endTime = new Date(session.completed_at).getTime();
                const sessionTime = Math.max(0, (endTime - startTime) / 1000); // Convert to seconds
                return total + sessionTime;
            }, 0);
        } catch (error) {
            console.error('Error calculating total time spent:', error);
            totalTimeSpent = 0;
        }

        const studyHours = Math.round(totalTimeSpent / 3600); // Convert seconds to hours

        // Current streak (consecutive days with completed tests)
        const streak = await calculateStreak(userUuid);

        // User rank (simplified - based on average score)
        const rank = await calculateUserRank(userUuid, averageScore);

        return {
            testsCompleted,
            totalScore: Math.round(totalScore),
            averageScore: Math.round(averageScore * 10) / 10,
            rank,
            studyHours,
            streak
        };
    } catch (error) {
        console.error('Error calculating user statistics:', error);
        return {
            testsCompleted: 0,
            totalScore: 0,
            averageScore: 0,
            rank: 0,
            studyHours: 0,
            streak: 0
        };
    }
}

// Helper function to calculate session score
async function calculateSessionScore(sessionId) {
    const { UserAnswer, Question } = require('../../models');
    
    const userAnswers = await UserAnswer.findAll({
        where: { test_session_id: sessionId },
        include: [{
            model: Question,
            as: 'question',
            attributes: ['correct_option', 'marks']
        }]
    });

    let correct = 0;
    let wrong = 0;
    let obtained = 0;
    let total = 0;

    userAnswers.forEach(answer => {
        if (answer.question) {
            total += answer.question.marks || 1;
            if (answer.selected_option === answer.question.correct_option) {
                correct++;
                obtained += answer.question.marks || 1;
            } else if (answer.selected_option) {
                wrong++;
            }
        }
    });

    const unanswered = await Question.count({
        include: [{
            model: Test,
            as: 'test',
            include: [{
                model: TestSession,
                as: 'sessions',
                where: { id: sessionId }
            }]
        }]
    }) - userAnswers.length;

    const percentage = total > 0 ? (obtained / total) * 100 : 0;

    return {
        correct,
        wrong,
        unanswered,
        obtained,
        total,
        percentage
    };
}

// Helper function to calculate streak
async function calculateStreak(userUuid) {
    const sessions = await TestSession.findAll({
        where: {
            user_id: userUuid,
            status: 'completed'
        },
        attributes: ['completed_at'],
        order: [['completed_at', 'DESC']]
    });

    if (sessions.length === 0) return 0;

    let streak = 1;
    let lastDate = new Date(sessions[0].completed_at);
    lastDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sessions.length; i++) {
        const currentDate = new Date(sessions[i].completed_at);
        currentDate.setHours(0, 0, 0, 0);
        
        const dayDiff = Math.floor((lastDate - currentDate) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
            streak++;
            lastDate = currentDate;
        } else {
            break;
        }
    }

    return streak;
}

// Helper function to calculate user rank
async function calculateUserRank(userUuid, userAvgScore) {
    // Simple ranking based on average score
    // In a real app, this would be more sophisticated
    const betterUsers = await User.count({
        include: [{
            model: TestSession,
            as: 'testSessions',
            where: { status: 'completed' },
            required: true
        }],
        group: ['User.id'],
        having: Sequelize.literal(`AVG(CASE WHEN testSessions.status = 'completed' THEN 1 ELSE 0 END) > ${userAvgScore}`)
    });

    return (betterUsers?.length || 0) + 1;
}

// Logout — clears the session so no other device can use this session
exports.logout = async (req, res, next) => {
    try {
        await User.update(
            { current_session_id: null },
            { where: { uuid: req.user.uuid } }
        );
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        return next(new ErrorHandler('Error while logging out', 500));
    }
};

// Change user password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userUuid = req.user.uuid;

        if (!currentPassword || !newPassword) {
            return next(new ErrorHandler('Current password and new password are required', 400));
        }

        // Find the user
        const user = await User.findOne({ where: { uuid: userUuid } });
        if (!user) {
            return next(new ErrorHandler('User not found', 404));
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return next(new ErrorHandler('Current password is incorrect', 400));
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await User.update(
            { password: hashedNewPassword },
            { where: { uuid: userUuid } }
        );

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        next(new ErrorHandler('Internal server error', 500));
    }
};


