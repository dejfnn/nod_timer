import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/ui";

const DashboardScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <View className="px-screen-x pt-4 pb-2">
        <Text className="text-txt-primary text-2xl font-bold">Dashboard</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={<Ionicons name="grid-outline" size={56} color="#5a6270" />}
          title="Dashboard coming in Phase 3"
          description="Metric cards, charts, and daily summaries will appear here."
        />
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;
