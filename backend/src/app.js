// app.js used for server intiate , middlewares , routes handling

const cors = require('cors')
const express = require('express');
const app = express()
const cookieParser = require('cookie-parser')

const defaultOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173"
];
const configuredOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];
const isDevelopment = process.env.NODE_ENV !== "production";

function isVercelOrigin(origin) {
    try {
        const { protocol, hostname } = new URL(origin)
        return protocol === "https:" && hostname.endsWith(".vercel.app")
    } catch {
        return false
    }
}

function isAllowedOrigin(origin) {
    if (!origin) {
        return true
    }

    if (allowedOrigins.includes(origin)) {
        return true
    }

    if (isDevelopment) {
        return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
    }

    return isVercelOrigin(origin)
}

const corsOptions = {
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true)
        }

        return callback(new Error("CORS origin not allowed"))
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.set("trust proxy", 1)
app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))
// Require all the routes here 
const authRouter = require('./routes/auth.route.js')
const interviewRouter = require('./routes/interview.route.js')

app.get("/api/health", (req, res) => {
    res.status(200).json({
        ok: true,
        message: "Server is healthy"
    })
})

// Using all the routes here
// Learing: Give path correctly
app.use("/api/auth",authRouter)
app.use('/api/interview',interviewRouter)


module.exports = app
