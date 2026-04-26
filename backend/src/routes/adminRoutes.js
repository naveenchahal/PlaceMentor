import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/checkRole.js";
import {
  getAllUsers,
  getUserById,
  makeAdmin,
  removeAdmin,
  deleteUser,
  getDashboardStats,
} from "../controllers/adminController.js";

const router = express.Router();

// 🔒 All admin routes require: logged in + ADMIN role
router.use(authMiddleware, checkRole("ADMIN"));

router.get("/stats", getDashboardStats);        // GET /api/admin/stats
router.get("/users", getAllUsers);              // GET /api/admin/users
router.get("/users/:id", getUserById);          // GET /api/admin/users/:id
router.patch("/users/:id/make-admin", makeAdmin);    // PATCH /api/admin/users/:id/make-admin
router.patch("/users/:id/remove-admin", removeAdmin); // PATCH /api/admin/users/:id/remove-admin
router.delete("/users/:id", deleteUser);        // DELETE /api/admin/users/:id

export default router;
