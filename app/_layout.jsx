import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
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
        <Stack.Screen name="edit-task/[id]" />
        <Stack.Screen name="task/[id]" />
      </Stack>
    </AuthProvider>
  );
}