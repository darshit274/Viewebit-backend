const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Admin, AdminSetting } = require('../../models');
const ErrorHandler = require('../../utils/default/errorHandler');

// Configure multer for admin avatar uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `avatar-admin-${req.admin.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

exports.uploadAvatar = multer({
    storage,
    limits: { fileSize: 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only JPG, PNG, and GIF files are allowed'));
    }
});

function toFullAvatarUrl(req, avatar) {
    if (avatar && avatar.startsWith('/uploads/')) {
        return `${req.protocol}://${req.get('host')}${avatar}`;
    }
    return avatar || null;
}

async function findOrCreateAdminSetting(adminId) {
    const [settings] = await AdminSetting.findOrCreate({
        where: { admin_id: adminId },
        defaults: { admin_id: adminId }
    });
    return settings;
}

function serializeSettings(req, admin, settings) {
    return {
        name: admin.name,
        email: admin.email,
        avatar: toFullAvatarUrl(req, admin.avatar),
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: settings.two_factor_enabled,
        emailNotifications: settings.email_notifications,
        browserNotifications: settings.browser_notifications,
        weeklyReports: settings.weekly_reports,
        timezone: settings.timezone,
        language: settings.language,
        dateFormat: settings.date_format,
        defaultPageSize: settings.default_page_size,
        autoLogoutTime: settings.auto_logout_time,
        themeMode: settings.theme_mode
    };
}

exports.getSettings = async (req, res, next) => {
    try {
        const admin = await Admin.findByPk(req.admin.id, {
            attributes: ['id', 'name', 'email', 'avatar']
        });
        if (!admin) {
            return next(new ErrorHandler('Admin not found', 404));
        }

        const settings = await findOrCreateAdminSetting(admin.id);

        res.status(200).json({
            success: true,
            data: serializeSettings(req, admin, settings)
        });
    } catch (err) {
        console.error('Get admin settings error:', err);
        return next(new ErrorHandler('Failed to fetch settings', 500));
    }
};

async function applyProfile(admin, body) {
    const updates = {};
    if (body.name !== undefined && body.name.trim() !== '') updates.name = body.name.trim();
    if (body.email !== undefined && body.email.trim() !== '' && body.email.trim() !== admin.email) {
        const existing = await Admin.findOne({ where: { email: body.email.trim() } });
        if (existing && existing.id !== admin.id) {
            const error = new Error('An admin with this email already exists');
            error.statusCode = 400;
            throw error;
        }
        updates.email = body.email.trim();
    }
    if (Object.keys(updates).length > 0) {
        await admin.update(updates);
    }
}

async function applySecurity(admin, settings, body) {
    if (body.newPassword) {
        if (!body.currentPassword) {
            const error = new Error('Current password is required to set a new password');
            error.statusCode = 400;
            throw error;
        }
        if (body.newPassword !== body.confirmPassword) {
            const error = new Error('New password and confirm password do not match');
            error.statusCode = 400;
            throw error;
        }
        if (body.newPassword.length < 6) {
            const error = new Error('New password must be at least 6 characters');
            error.statusCode = 400;
            throw error;
        }
        const isValid = await bcrypt.compare(body.currentPassword, admin.password);
        if (!isValid) {
            const error = new Error('Current password is incorrect');
            error.statusCode = 400;
            throw error;
        }
        const hashedPassword = await bcrypt.hash(body.newPassword, 10);
        await admin.update({ password: hashedPassword });
    }

    if (body.twoFactorEnabled !== undefined) {
        await settings.update({ two_factor_enabled: !!body.twoFactorEnabled });
    }
}

async function applyNotifications(settings, body) {
    const updates = {};
    if (body.emailNotifications !== undefined) updates.email_notifications = !!body.emailNotifications;
    if (body.browserNotifications !== undefined) updates.browser_notifications = !!body.browserNotifications;
    if (body.weeklyReports !== undefined) updates.weekly_reports = !!body.weeklyReports;
    if (Object.keys(updates).length > 0) {
        await settings.update(updates);
    }
}

async function applyPreferences(settings, body) {
    const updates = {};
    if (body.timezone !== undefined) updates.timezone = body.timezone;
    if (body.language !== undefined) updates.language = body.language;
    if (body.dateFormat !== undefined) updates.date_format = body.dateFormat;
    if (body.defaultPageSize !== undefined) updates.default_page_size = parseInt(body.defaultPageSize) || 10;
    if (Object.keys(updates).length > 0) {
        await settings.update(updates);
    }
}

async function applySystem(settings, body) {
    const updates = {};
    if (body.autoLogoutTime !== undefined) {
        const minutes = parseInt(body.autoLogoutTime) || 480;
        if (minutes < 30 || minutes > 1440) {
            const error = new Error('Auto logout time must be between 30 and 1440 minutes');
            error.statusCode = 400;
            throw error;
        }
        updates.auto_logout_time = minutes;
    }
    if (body.themeMode !== undefined) updates.theme_mode = body.themeMode;
    if (Object.keys(updates).length > 0) {
        await settings.update(updates);
    }
}

exports.updateSettings = async (req, res, next) => {
    try {
        const { section } = req.params;
        const admin = await Admin.findByPk(req.admin.id);
        if (!admin) {
            return next(new ErrorHandler('Admin not found', 404));
        }
        const settings = await findOrCreateAdminSetting(admin.id);
        const body = req.body || {};

        if (!section || section === 'profile') await applyProfile(admin, body);
        if (!section || section === 'security') await applySecurity(admin, settings, body);
        if (!section || section === 'notifications') await applyNotifications(settings, body);
        if (!section || section === 'preferences') await applyPreferences(settings, body);
        if (!section || section === 'system') await applySystem(settings, body);

        await admin.reload();
        await settings.reload();

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: serializeSettings(req, admin, settings)
        });
    } catch (err) {
        console.error('Update admin settings error:', err);
        return next(new ErrorHandler(err.message || 'Failed to update settings', err.statusCode || 500));
    }
};

exports.updateAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new ErrorHandler('No file uploaded', 400));
        }

        const admin = await Admin.findByPk(req.admin.id);
        if (!admin) {
            return next(new ErrorHandler('Admin not found', 404));
        }

        if (admin.avatar && admin.avatar.startsWith('/uploads/')) {
            const oldAvatarPath = path.join(__dirname, '../..', admin.avatar);
            try {
                await fs.unlink(oldAvatarPath);
            } catch (error) {
                console.log('Error deleting old avatar:', error.message);
            }
        }

        const relativePath = `/uploads/avatars/${req.file.filename}`;
        await admin.update({ avatar: relativePath });

        res.status(200).json({
            success: true,
            message: 'Avatar updated successfully',
            data: { avatar_url: toFullAvatarUrl(req, relativePath) }
        });
    } catch (err) {
        console.error('Admin avatar upload error:', err);
        return next(new ErrorHandler('Failed to upload avatar', 500));
    }
};
