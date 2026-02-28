import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DashboardScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-tf-deep">
      <View className="flex-1 items-center justify-center px-screen-x">
        <Text className="text-txt-primary text-2xl font-bold">
          Dashboard
        </Text>
        <Text className="text-txt-secondary mt-2 text-center">
          Dashboard coming in Phase 3. Database layer is ready.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;
