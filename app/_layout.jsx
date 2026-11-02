import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider, useAppTheme } from "../contexts/ThemeContext";
import PinGate from "../components/PinGate";

function AppNavigator() {
  const { isDark, colors } = useAppTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthProvider>
        <PinGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="create-task" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="preferences" />
            <Stack.Screen name="pin-setup" />
            <Stack.Screen name="pin-manage" />
            <Stack.Screen name="security-settings" />
            <Stack.Screen name="edit-task/[id]" />
            <Stack.Screen name="task/[id]" />
          </Stack>
        </PinGate>
      </AuthProvider>
    </>
  );
}

export default function RootLayout() {
  return <ThemeProvider><AppNavigator /></ThemeProvider>;
}
