const supabase = require("../db");

// Middleware to verify Supabase JWT and check allow-list
async function verifyAllowedUser(req, res, next) {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid Authorization header" });
        }
        const token = authHeader.split(" ")[1];
        // Verify JWT and get user info
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        // Check if email is in allowed_emails table
        const { data: allowed, error: emailError } = await supabase
            .from("allowed_emails")
            .select("email")
            .eq("email", user.email)
            .single();
        if (emailError || !allowed) {
            return res.status(403).json({ error: "User not allowed" });
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(500).json({ error: "Auth check failed" });
    }
}

module.exports = { verifyAllowedUser };
