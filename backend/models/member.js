const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        phone: {
            type: String,
            required: true
        },

        memberId: {
            type: String,
            required: true,
            unique: true
        },

        department: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Member", memberSchema);