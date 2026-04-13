require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const amqp = require('amqplib');
const cors = require('cors');
const http = require('http');

const app = express();
app.use(cors());
app.use(express.json());

const LEDGER_DIR = path.join(__dirname, '..', 'transaction-ledger');
const IPC_WALLET = process.platform === 'win32' ? '\\\\.\\pipe\\wallet_ipc' : '/tmp/wallet.sock';
const IPC_ENERGY = process.platform === 'win32' ? '\\\\.\\pipe\\energy_ipc' : '/tmp/energy.sock';

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("⚛️  COORDINATOR_DB_CONNECTED"))
  .catch(err => console.error("DB_SYNC_ERROR:", err));

// --- IPC WRAPPER ---
const ipcRequest = (socketPath, apiPath, body) => {
    return new Promise((resolve, reject) => {
        const options = {
            socketPath: socketPath,
            path: apiPath,
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'x-service-token': process.env.INTERNAL_SECRET 
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }); }
                catch (e) { resolve({ status: res.statusCode, data: {} }); }
            });
        });

        req.setTimeout(5000, () => { req.destroy(); reject(new Error(`IPC_TIMEOUT at ${socketPath}`)); });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
};

// --- LOGGING UTILS ---
const logToGit = async (message) => {
    const logEntry = `[${new Date().toISOString()}] ${message}\n`;
    const ledgerFile = path.join(LEDGER_DIR, 'ledger.txt');
    if (!fs.existsSync(LEDGER_DIR)) fs.mkdirSync(LEDGER_DIR, { recursive: true });
    fs.appendFileSync(ledgerFile, logEntry);
    exec(`cd "${LEDGER_DIR}" && git init && git add ledger.txt && git commit -m "Audit: ${message}" --allow-empty`);
};

// --- NEW: HISTORY ROUTE FOR SIDEBAR LEDGER ---
// This reads your git-synced ledger and sends it to the Frontend
app.get('/api/history', async (req, res) => {
    try {
        const ledgerFile = path.join(LEDGER_DIR, 'ledger.txt');
        if (fs.existsSync(ledgerFile)) {
            const data = fs.readFileSync(ledgerFile, 'utf8');
            const lines = data.split('\n').filter(line => line).reverse();
            res.json({ success: true, logs: lines });
        } else {
            res.json({ success: true, logs: ["LEDGER_INITIALIZED: NO_TRADES_YET"] });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: "FAILED_TO_READ_AUDIT_TRAIL" });
    }
});

// --- MAIN 2-PHASE COMMIT ROUTE ---
app.post('/api/trade', async (req, res) => {
    const txId = `TX-${Date.now()}`;
    const { buyerId, sellerId, amount_kwh, cost_inr } = req.body;

    await logToGit(`START_TX: ${txId} | Buyer: ${buyerId} Seller: ${sellerId}`);

    try {
        const [wPrep, eSellerPrep, eBuyerPrep] = await Promise.all([
            ipcRequest(IPC_WALLET, '/api/2pc/prepare', { txId, userId: buyerId, amount: cost_inr }),
            ipcRequest(IPC_ENERGY, '/api/2pc/prepare', { txId, userId: sellerId, amount: amount_kwh, type: 'debit' }),
            ipcRequest(IPC_ENERGY, '/api/2pc/prepare', { txId, userId: buyerId, amount: amount_kwh, type: 'credit' })
        ]);

        if (wPrep.status !== 200 || eSellerPrep.status !== 200 || eBuyerPrep.status !== 200) {
            throw new Error('PREPARE_REJECTED');
        }

        console.log("✅ PREPARE COMPLETE. COMMITTING...");
        const wCommit = await ipcRequest(IPC_WALLET, '/api/2pc/commit', { txId, userId: buyerId, amount: cost_inr });
        
        await Promise.all([
            ipcRequest(IPC_ENERGY, '/api/2pc/commit', { txId, userId: sellerId, amount: amount_kwh, type: 'debit' }),
            ipcRequest(IPC_ENERGY, '/api/2pc/commit', { txId, userId: buyerId, amount: amount_kwh, type: 'credit' })
        ]);

        const rzpOrderId = wCommit.data.order_id || 'N/A';
        await logToGit(`TX_COMMITTED: ${txId} | RZP_ID: ${rzpOrderId}`);

        res.json({ status: 'SUCCESS', txId, order_id: rzpOrderId });

    } catch (error) {
        console.error(`❌ ATOMIC FAIL: ${txId} | Rolling back...`);
        await Promise.all([
            ipcRequest(IPC_WALLET, '/api/2pc/rollback', { txId, userId: buyerId, amount: cost_inr }).catch(() => {}),
            ipcRequest(IPC_ENERGY, '/api/2pc/rollback', { txId, userId: sellerId, amount: amount_kwh }).catch(() => {})
        ]);
        
        await logToGit(`TX_ABORTED: ${txId} | Reason: ${error.message}`);
        res.status(500).json({ status: 'FAILED', reason: error.message });
    }
});

app.listen(3003, () => console.log("⚡ Coordinator Active (IPC Integrated)"));