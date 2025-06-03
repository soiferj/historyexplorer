require("dotenv").config();
const express = require("express");
const cors = require("cors");
const supabase = require("./db");

const app = express();

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// CORS setup: allow all origins in development, restrict in production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://historyexplorer.onrender.com' 
    : true, // allow all origins in dev
  credentials: true // if you need cookies/auth
}));
app.use(express.json());

app.get("/", (req, res) => res.send("History Map API Running"));

const eventsRouter = require("./routes/events");
app.use("/events", eventsRouter);

const allowedEmailsRouter = require("./routes/allowedEmails");
app.use("/allowed-emails", allowedEmailsRouter);

const historicalMapRouter = require("./routes/historicalMap");
app.use("/historical-map", historicalMapRouter);

const summaryRouter = require("./routes/summary");
app.use("/summary", summaryRouter);

const chatbotRouter = require("./routes/chatbot");
app.use("/chatbot", chatbotRouter);

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

// Remove global app.use(verifyAllowedUser); -- only use as route middleware

// Log errors globally
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
