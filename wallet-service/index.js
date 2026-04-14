require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const cors = require('cors');
const fs = require('fs');
const http = require('http');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const razorpay = new Razorpay({ 
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_KEY_SECRET 
});

// --- 🛡️ SECURITY MIDDLEWARE ----
app.use('/api/2pc', (req, res, next) => {
    if (req.headers['x-service-token'] !== process.env.INTERNAL_SECRET) {
        return res.status(403).json({ error: 'FORBIDDEN_NODE' });
    }
    next();
});

// --- ⚛️ DB CONNECTION ---
mongoose.connect(process.env.MONGO_URI, { family: 4 })
    .then(() => console.log("🛰️ WALLET_SERVICE: CLOUD_SYNC_ACTIVE"))
    .catch(err => console.error("❌ WALLET_DB_ERROR:", err));

const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    reservedBalance: { type: Number, default: 0 }
}, { timestamps: true }));

// --- 🔍 UI FETCH ROUTE ---
app.get('/api/wallet/:userId', async (req, res) => {
    try {
        const user = await Wallet.findOne({ userId: req.params.userId });
        if (!user) return res.json({ userId: req.params.userId, balance: 0, reservedBalance: 0 });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'QUERY_FAILED' });
    }
});

// --- 🛠️ PHASE 1: PREPARE (Locks Funds) ---
app.post('/api/2pc/prepare', async (req, res) => {
    const { userId, amount } = req.body;
    try {
        const user = await Wallet.findOne({ userId });
        if (!user || user.balance < amount) throw new Error('INSUFFICIENT_FUNDS');

        user.balance -= amount;
        user.reservedBalance += amount;
        await user.save();
        
        console.log(`✅ WALLET_PREPARE: ${userId} | Locked: ₹${amount}`);
        res.status(200).json({ status: 'PREPARED' });
    } catch (err) {
        console.error(`❌ WALLET_PREPARE_REJECTED: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
});

// --- 🛠️ PHASE 2: COMMIT (Deducts from Reserved & Razorpay) ---
app.post('/api/2pc/commit', async (req, res) => {
    const { txId, userId, amount } = req.body;
    try {
        const user = await Wallet.findOne({ userId });
        if (user && user.reservedBalance >= amount) {
            user.reservedBalance -= amount;
            await user.save();
            
            // Generate Razorpay Order only after DB state is confirmed
            const rzpOrder = await razorpay.orders.create({ 
                amount: amount * 100, // INR in Paise
                currency: "INR", 
                receipt: txId 
            });
            
            console.log(`🎊 WALLET_COMMIT: ${userId} | RZP: ${rzpOrder.id}`);
            return res.status(200).json({ status: 'COMMITTED', order_id: rzpOrder.id });
        }
        throw new Error('COMMIT_DATA_MISMATCH');
    } catch (err) {
        console.error("❌ COMMIT_FAILED:", err.message);
        res.status(500).json({ error: 'COMMIT_FAILED' });
    }
});

// --- 🛠️ EMERGENCY: ROLLBACK (Unlocks Funds) ---
app.post('/api/2pc/rollback', async (req, res) => {
    const { userId, amount } = req.body;
    try {
        const user = await Wallet.findOne({ userId });
        if (user && user.reservedBalance >= amount) {
            user.balance += amount;
            user.reservedBalance -= amount;
            await user.save();
            console.log(`⏪ ROLLBACK_SUCCESS: Funds returned to ${userId}`);
        }
        res.status(200).send();
    } catch (err) {
        res.status(500).send();
    }
});

// --- 🚀 DUAL LISTENERS (TCP + UNIX IPC) ---
app.listen(3001, () => console.log("🚀 WALLET_TCP: 3001"));

const IPC_WALLET = process.platform === 'win32' ? '\\\\.\\pipe\\wallet_ipc' : '/tmp/wallet.sock';
if (process.platform !== 'win32' && fs.existsSync(IPC_WALLET)) fs.unlinkSync(IPC_WALLET);

http.createServer(app).listen(IPC_WALLET, () => {
    console.log(`🔌 WALLET_IPC: ${IPC_WALLET}`);
});