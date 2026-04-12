const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        const userRole = req.user.role.toLowerCase();
        
        const hasRole = allowedRoles.some(role => role.toLowerCase() === userRole);

        if (!hasRole) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};

module.exports = checkRole;
