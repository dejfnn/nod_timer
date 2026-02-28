import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "@/db/client";
import { requestNotificationPermissions } from "@/services/notifications";
import { ToastContainer } from "@/components/ui";
import "../../global.css";

const RootLayout = () => {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setDbReady(true);

        // Request notification permissions (non-blocking)
        requestNotificationPermissions().catch(() => {});
      } catch (e) {
        console.error("Failed to initialize database:", e);
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();
  }, []);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-tf-deep">
        <Text className="text-danger text-lg">Database Error</Text>
        <Text className="text-txt-secondary mt-2">{error}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View className="flex-1 items-center justify-center bg-tf-deep">
        <ActivityIndicator size="large" color="#00d4aa" />
        <Text className="text-txt-secondary mt-4">Initializing TimeFlow...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="clients"
          options={{
            headerShown: true,
            title: "Clients",
            headerStyle: { backgroundColor: "#0a0e1a" },
            headerTintColor: "#e8eaed",
            headerShadowVisible: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="tags"
          options={{
            headerShown: true,
            title: "Tags",
            headerStyle: { backgroundColor: "#0a0e1a" },
            headerTintColor: "#e8eaed",
            headerShadowVisible: false,
            presentation: "card",
          }}
        />
      </Stack>
      <ToastContainer />
    </SafeAreaProvider>
  );
};

export default RootLayout;
