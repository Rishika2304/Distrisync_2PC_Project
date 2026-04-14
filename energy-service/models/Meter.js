const mongoose = require('mongoose');

const MeterSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    available_kwh: { type: Number, default: 0 },
    locked_kwh: { type: Number, default: 0 } 
}, { timestamps: true });

module.exports = mongoose.model('Meter', MeterSchema);

// In JavaScript, we use console.log instead of echo!
console.log("PHASE 2 COMPLETE: ENVIRONMENTS AND MONGODB SCHEMAS READY!");