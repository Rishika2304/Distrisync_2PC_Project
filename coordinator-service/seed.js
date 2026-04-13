require('dotenv').config();
const mongoose = require('mongoose');

async function seedDatabase() {
    const wURI = process.env.SEED_WALLET_URI;
    const eURI = process.env.SEED_ENERGY_URI;

    if (!wURI || !eURI) {
        console.error("❌ ERROR: SEED_WALLET_URI or SEED_ENERGY_URI is missing in .env");
        process.exit(1);
    }

    try {
        console.log("🛰️ Connecting to Cloud Databases...");
        const walletConn = await mongoose.createConnection(wURI).asPromise();
        const energyConn = await mongoose.createConnection(eURI).asPromise();

        const Wallet = walletConn.model('Wallet', new mongoose.Schema({
            userId: { type: String, required: true, unique: true },
            balance: { type: Number, default: 0 },
            reservedBalance: { type: Number, default: 0 }
        }));

        const Meter = energyConn.model('Meter', new mongoose.Schema({
            userId: { type: String, required: true, unique: true },
            energyBalance: { type: Number, default: 0 },
            reservedEnergy: { type: Number, default: 0 }
        }));

        console.log("🧹 Clearing old entries...");
        await Wallet.deleteMany({});
        await Meter.deleteMany({});

        const testUsers = [
            { id: "user_1", money: 5000, energy: 10 },
            { id: "user_2", money: 100,  energy: 900 },
            { id: "user_3", money: 1500, energy: 300 }
        ];

        for (const u of testUsers) {
            await Wallet.create({ userId: u.id, balance: u.money });
            await Meter.create({ userId: u.id, energyBalance: u.energy });
            console.log(`✅ Success: ${u.id} seeded.`);
        }

        console.log("\n🚀 ALL DATABASES PRIMED!");
        await walletConn.close();
        await energyConn.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ Critical Seed Error:", err.message);
        process.exit(1);
    }
}

seedDatabase();