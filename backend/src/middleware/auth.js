const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { runtime } = require("../state/runtime");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const headerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  // EventSource cannot set custom headers, so allow token via query string for GET requests.
  const queryToken = req.method === "GET" ? String(req.query.token || "").trim() : "";
  const token = headerToken || queryToken || null;

  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const decoded = jwt.verify(token, secret);
    let user;
    const useDb = runtime.dbReady && !runtime.memoryMode;
    if (!useDb) {
      user = runtime.users.find((item) => item._id === decoded.userId);
      if (user) {
        user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl || null,
          preferences: user.preferences || undefined
        };
      }
    } else {
      user = await User.findById(decoded.userId).select("-passwordHash");
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return next();
  };
}

module.exports = { authenticate, allowRoles };
