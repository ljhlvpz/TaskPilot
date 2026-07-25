import { register, login, logout, resetPassword } from "../firebase/auth";

export const registerUser = async (email, password) => {
  return await register(email, password);
};

export const loginUser = async (email, password) => {
  return await login(email, password);
};

export const logoutUser = async () => {
  return await logout();
};

export const forgotPassword = async (email) => {
  return await resetPassword(email);
};