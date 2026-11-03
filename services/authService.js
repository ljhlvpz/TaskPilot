
import {
  register,
  login,
  logout,
  resetPassword,
  loginWithGoogleCredential,
} from "../firebase/auth";

export const googleLoginUser = async (idToken) => {
  return loginWithGoogleCredential(idToken);
};

export const registerUser = async (email, password) => {
  return register(email, password);
};

export const loginUser = async (email, password) => {
  return login(email, password);
};

export const logoutUser = async () => {
  return logout();
};

export const forgotPassword = async (email) => {
  return resetPassword(email);
};
