export const isValidEmail = (email) => {
  return /\S+@\S+\.\S+/.test(email);
};

export const isValidPassword = (password) => {
  return password.length >= 8;
};

export const passwordsMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

export const isRequired = (value) => {
  return value.trim().length > 0;
};