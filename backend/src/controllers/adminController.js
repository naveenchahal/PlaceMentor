import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

// ✅ GET all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        provider: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            interviewSessions: true,
            voiceInterviewSessions: true,
            userStreaks: true,
            gifts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ users });
  } catch (err) {
    console.error("GET ALL USERS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET single user detail
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        provider: true,
        isVerified: true,
        createdAt: true,
        interviewSessions: true,
        voiceInterviewSessions: true,
        userStreaks: true,
        gifts: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error("GET USER BY ID ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ MAKE user ADMIN
export const makeAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role: "ADMIN" },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json({ message: `${user.name} is now an ADMIN`, user });
  } catch (err) {
    console.error("MAKE ADMIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ REMOVE admin role (demote to USER)
export const removeAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-demotion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "You cannot demote yourself" });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role: "USER" },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json({ message: `${user.name} demoted to USER`, user });
  } catch (err) {
    console.error("REMOVE ADMIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ DELETE user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "You cannot delete yourself" });
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });

    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalInterviews,
      totalVoiceInterviews,
      totalGifts,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.interviewSession.count(),
      prisma.voiceInterviewSession.count(),
      prisma.gift.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

    return res.json({
      stats: {
        totalUsers,
        totalAdmins,
        totalInterviews,
        totalVoiceInterviews,
        totalGifts,
      },
      recentUsers,
    });
  } catch (err) {
    console.error("DASHBOARD STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};