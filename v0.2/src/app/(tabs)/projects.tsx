import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/ui";

const ProjectsScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-tf-deep" edges={["top"]}>
      <View className="px-screen-x pt-4 pb-2">
        <Text className="text-txt-primary text-2xl font-bold">Projects</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          icon={<Ionicons name="folder-outline" size={56} color="#5a6270" />}
          title="Projects coming in Phase 3"
          description="Create and manage projects with color coding, clients, and billing."
        />
      </View>
    </SafeAreaView>
  );
};

export default ProjectsScreen;
