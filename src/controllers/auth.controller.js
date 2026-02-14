import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const toSafeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};

export const register = async (req, res) => {
  const { name, email, phone, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, phone, password: hashed }
  });

  res.json(toSafeUser(user));
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return res.status(404).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

  res.json({ token, user: toSafeUser(user) });
};

export const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(toSafeUser(user));
};

export const updateProfile = async (req, res) => {
  const { name, phone } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {})
    }
  });

  res.json(toSafeUser(updated));
};

export const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) {
    return res.status(400).json({ message: "Old password is incorrect" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashed }
  });

  res.json({ message: "Password updated", user: toSafeUser(updated) });
};

export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No avatar file provided" });
  }

  // Normalize path for URL usage
  const relativePath = `/${req.file.path.replace(/\\/g, "/")}`;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatarUrl: relativePath }
  });

  res.json({ user: toSafeUser(updated) });
};