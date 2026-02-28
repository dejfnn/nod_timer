import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/ui";

const ReportsScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <View className="px-screen-x pt-4 pb-2">
        <Text className="text-txt-primary text-2xl font-bold">Reports</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={<Ionicons name="bar-chart-outline" size={56} color="#5a6270" />}
          title="Reports coming in Phase 4"
          description="Summary, detailed, and weekly reports with CSV export."
        />
      </View>
    </SafeAreaView>
  );
};

export default ReportsScreen;
