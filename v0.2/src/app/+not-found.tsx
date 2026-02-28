import { View, Text } from "react-native";
import { Link, Stack } from "expo-router";

const NotFoundScreen = () => {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View className="flex-1 items-center justify-center bg-tf-deep">
        <Text className="text-txt-primary text-2xl font-bold">404</Text>
        <Text className="text-txt-secondary mt-2">
          This screen does not exist.
        </Text>
        <Link href="/" className="mt-4">
          <Text className="text-primary underline">Go to Dashboard</Text>
        </Link>
      </View>
    </>
  );
};

export default NotFoundScreen;
