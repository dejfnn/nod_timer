import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TimerScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-tf-deep">
      <View className="flex-1 items-center justify-center px-screen-x">
        <Text className="text-txt-primary text-2xl font-bold">Timer</Text>
        <Text className="text-txt-secondary mt-2 text-center">
          Timer UI coming in Phase 2.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default TimerScreen;
