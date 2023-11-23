const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const moderatorAccess = (req, res, next) => {
  if (req.session.user && req.session.user.role === "moderator") {
    return next();
  } else if (req.session.user && req.session.user.role !== "moderator") {
    return res.status(403).json({ error: "Acccess Forbidden" });
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

const workerAccess = (req, res, next) => {
  if (req.session.user && req.session.user.role !== "user") {
    return next();
  } else if (req.session.user && req.session.user.role === "user") {
    return res.status(403).json({ error: "Acccess Forbidden" });
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

module.exports = { isAuthenticated, workerAccess, moderatorAccess };
