const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    let authHeader = req.headers.authorization;

    // ✅ Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    // ✅ Extract token
    const token = authHeader.split(" ")[1];

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.secret_key);

    // ✅ Attach clothUser info to request
    req.user = {
      id: decoded.id, // this is your clothUser._id
    };

    next(); // ✅ Allow request to continue
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token. Please login again.",
    });
  }
};
