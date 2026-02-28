import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/ui";

const SettingsScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <View className="px-screen-x pt-4 pb-2">
        <Text className="text-txt-primary text-2xl font-bold">Settings</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={<Ionicons name="settings-outline" size={56} color="#5a6270" />}
          title="Settings coming in Phase 5"
          description="Configure defaults, working hours, notifications, and manage data."
        />
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
