// Usage: authorize('admin') or authorize('admin', 'invigilator')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = { authorize };
