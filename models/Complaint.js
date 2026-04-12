const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    complaintId: { type: String, unique: true },
    userId: { type: String, required: true },
    customer: { type: String, required: true },
    issue: { type: String, required: true },
    details: { type: String },
    type: { type: String, default: 'Complaint' },
    status: { 
        type: String, 
        enum: ['Open', 'In Progress', 'Resolved', 'Pending'], 
        default: 'Open' 
    },
    priority: { 
        type: String, 
        enum: ['Low', 'Medium', 'High'], 
        default: 'Medium' 
    },
    resolutionNote: { type: String }
}, { timestamps: true });

// Generate sequential complaintId before saving
complaintSchema.pre('save', async function(next) {
    if (!this.complaintId) {
        const Complaint = mongoose.model('Complaint');
        const lastComplaint = await Complaint.findOne({ complaintId: { $regex: /^CMP-/ } }).sort({ complaintId: -1 });
        let nextNum = 1;
        if (lastComplaint && lastComplaint.complaintId) {
            const parts = lastComplaint.complaintId.split('-');
            if (parts.length === 2) {
                const lastNum = parseInt(parts[1]);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
        }
        this.complaintId = `CMP-${String(nextNum).padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
