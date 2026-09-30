const express = require("express");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");

const router = express.Router();

// Get all members with optional search
router.get("/", async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [
                { name: regex },
                { email: regex },
                { memberId: regex },
                { department: regex }
            ];
        }

        const members = await Member.find(query).sort({ createdAt: -1 });
        res.json(members);
    } catch (error) {
        res.status(500).json({
            message: error.message || "Failed to fetch members"
        });
    }
});

// Get single member
router.get("/:id", async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }
        res.json(member);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add member
router.post("/", async (req, res) => {
    try {
        const { name, email, phone, memberId, department } = req.body;

        if (!name || !email || !phone || !memberId || !department) {
            return res.status(400).json({
                message: "All fields (name, email, phone, memberId, department) are required"
            });
        }

        // Check for duplicates
        const existingEmail = await Member.findOne({ email: email.trim().toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({
                message: "A member with this email address already exists"
            });
        }

        const existingId = await Member.findOne({ memberId: memberId.trim() });
        if (existingId) {
            return res.status(400).json({
                message: "A member with this Member ID already exists"
            });
        }

        const member = await Member.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            memberId: memberId.trim(),
            department: department.trim()
        });

        res.status(201).json(member);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

// Update member
router.put("/:id", async (req, res) => {
    try {
        const { name, email, phone, memberId, department } = req.body;
        const currentMember = await Member.findById(req.params.id);

        if (!currentMember) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        // Check email uniqueness if modified
        if (email && email.trim().toLowerCase() !== currentMember.email) {
            const existingEmail = await Member.findOne({ email: email.trim().toLowerCase() });
            if (existingEmail) {
                return res.status(400).json({
                    message: "A member with this email address already exists"
                });
            }
            currentMember.email = email.trim().toLowerCase();
        }

        // Check memberId uniqueness if modified
        if (memberId && memberId.trim() !== currentMember.memberId) {
            const existingId = await Member.findOne({ memberId: memberId.trim() });
            if (existingId) {
                return res.status(400).json({
                    message: "A member with this Member ID already exists"
                });
            }
            currentMember.memberId = memberId.trim();
        }

        if (name) currentMember.name = name.trim();
        if (phone) currentMember.phone = phone.trim();
        if (department) currentMember.department = department.trim();

        const updated = await currentMember.save();
        res.json(updated);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

// Delete member
router.delete("/:id", async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);

        if (!member) {
            return res.status(404).json({
                message: "Member not found"
            });
        }

        // Check if member has active issued books
        const activeCount = await Transaction.countDocuments({
            member: req.params.id,
            status: "Issued"
        });

        if (activeCount > 0) {
            return res.status(400).json({
                message: `Cannot delete member. Member currently has ${activeCount} issued book(s) that must be returned first.`
            });
        }

        await Member.findByIdAndDelete(req.params.id);

        res.json({
            message: "Member deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;