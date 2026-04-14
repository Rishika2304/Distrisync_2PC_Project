require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const cors = require('cors');
const fs = require('fs');
const http = require('http');

const app = express();
app.use(cors({ origin: '*' })); // This allows all connections during your demo
app.use(express.json());

// --- 🛡️ SECURITY ---
app.use('/api/2pc', (req, res, next) => {
    if (req.headers['x-service-token'] !== process.env.INTERNAL_SECRET) {
        return res.status(403).json({ error: 'FORBIDDEN_NODE' });
    }
    next();
});

// --- ⚛️ CLOUD DATABASE ---
mongoose.connect(process.env.MONGODB_URI, { family: 4 })
    .then(() => console.log("🛰️  ENERGY_SERVICE: CLOUD_SYNC_ACTIVE"))
    .catch(err => console.error("❌ CLOUD_SYNC_ERROR:", err));

// Fix: Use conditional model definition to prevent restart crashes
const Meter = mongoose.models.Meter || mongoose.model('Meter', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    energyBalance: { type: Number, default: 0 },
    reservedEnergy: { type: Number, default: 0 }
}, { timestamps: true }));

// --- 🔍 UI FETCH ROUTE ---
app.get('/api/energy/:userId', async (req, res) => {
    try {
        const user = await Meter.findOne({ userId: req.params.userId });
        if (!user) return res.json({ energyBalance: 0, reservedEnergy: 0 });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'QUERY_FAILED' });
    }
});

// --- 🛠️ PHASE 1: PREPARE (Direct Update for Atlas Compatibility) ---
// --- 🛠️ PHASE 1: PREPARE (Fixed for Buyers and Sellers) ---
app.post('/api/2pc/prepare', async (req, res) => {
    const { userId, amount, type } = req.body; // Add 'type' (credit or debit)
    try {
        const user = await Meter.findOne({ userId });
        if (!user) throw new Error('USER_NOT_FOUND');

        if (type === 'debit') {
            // Logic for the Seller (user_2)
            if (user.energyBalance < amount) throw new Error('INSUFFICIENT_RESOURCES');
            user.energyBalance -= amount;
            user.reservedEnergy += amount;
        } else {
            // Logic for the Buyer (user_1) - Just verify user exists
            console.log(`📡 PREPARE_CREDIT: ${userId} is ready to receive ${amount}kWh`);
        }

        await user.save();
        res.json({ status: 'PREPARED' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- 🛠️ PHASE 2: COMMIT (Actually adds the energy) ---
app.post('/api/2pc/commit', async (req, res) => {
    const { userId, amount, type } = req.body;
    try {
        const user = await Meter.findOne({ userId });
        if (user) {
            if (type === 'debit') {
                user.reservedEnergy -= amount; // Finalize seller deduction
            } else {
                user.energyBalance += amount; // FINALLY ADD ENERGY TO BUYER
            }
            await user.save();
        }
        res.json({ status: 'COMMITTED' });
    } catch (err) {
        res.status(500).json({ error: 'COMMIT_FAILED' });
    }
});
// --- 🛠️ EMERGENCY: ROLLBACK ---
app.post('/api/2pc/rollback', async (req, res) => {
    const { userId, amount } = req.body;
    try {
        const user = await Meter.findOne({ userId });
        if (user) {
            user.energyBalance += amount;
            user.reservedEnergy -= amount;
            await user.save();
        }
        res.status(200).send();
    } catch (err) {
        res.status(500).send();
    }
});

// --- 🚀 LISTENERS ---
app.listen(3002, () => console.log("🚀 ENERGY_SERVICE: PORT 3002 ACTIVE"));

const IPC_ENERGY = process.platform === 'win32' ? '\\\\.\\pipe\\energy_ipc' : '/tmp/energy.sock';
if (fs.existsSync(IPC_ENERGY) && process.platform !== 'win32') fs.unlinkSync(IPC_ENERGY);

http.createServer(app).listen(IPC_ENERGY, () => {
    console.log(`🔌 ENERGY_SERVICE: IPC ACTIVE ON ${IPC_ENERGY}`);
});