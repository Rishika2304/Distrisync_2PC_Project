const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    // Unique ID for the consumer (e.g., 'consumer_01')
    userId: { type: String, required: true, unique: true },

    // Liquid cash available for new trades
    balance: { type: Number, default: 0 },

    // Funds currently "on hold" during the 2-Phase Commit process
    reservedBalance: { type: Number, default: 0 } 

}, { timestamps: true });

// Ensure we export it as 'Wallet' to match your index.js reference
module.exports = mongoose.model('Wallet', WalletSchema);

