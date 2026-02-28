import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, EmptyState } from "@/components/ui";

const SettingsScreen = () => {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <View className="px-screen-x pt-4 pb-2">
        <Text className="text-txt-primary text-2xl font-bold">Settings</Text>
      </View>

      {/* Management links */}
      <View className="px-screen-x mt-4 gap-2">
        <Card variant="interactive" onPress={() => router.push("/clients")}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name="people-outline"
                size={20}
                color="#9aa0b0"
                style={{ marginRight: 12 }}
              />
              <Text className="text-txt-primary text-sm font-medium">
                Manage Clients
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5a6270" />
          </View>
        </Card>

        <Card variant="interactive" onPress={() => router.push("/tags")}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name="pricetags-outline"
                size={20}
                color="#9aa0b0"
                style={{ marginRight: 12 }}
              />
              <Text className="text-txt-primary text-sm font-medium">
                Manage Tags
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5a6270" />
          </View>
        </Card>
      </View>

      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={<Ionicons name="settings-outline" size={56} color="#5a6270" />}
          title="More settings coming in Phase 5"
          description="Configure defaults, working hours, notifications, and manage data."
        />
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
