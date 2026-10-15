
import { Stack } from "expo-router";

import { AuthProvider } from "../contexts/AuthContext";
import PinGate from "../components/PinGate";

export default function RootLayout() {
  return (
    <AuthProvider>
      <PinGate>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="create-task" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="pin-setup" />
          <Stack.Screen name="pin-manage" />
          <Stack.Screen name="security-settings" />
          <Stack.Screen name="edit-task/[id]" />
          <Stack.Screen name="task/[id]" />
        </Stack>
      </PinGate>
    </AuthProvider>
  );
}
