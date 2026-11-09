module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ||
      "./android/app/google-services.json",
  },
  plugins: [
    ...(config.plugins || []),
    "./plugins/withTaskPilotWidget",
  ],
});
