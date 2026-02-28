import { useEffect, useRef } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useToastStore, type ToastVariant } from "@/stores/toastStore";

/** Color mapping for toast variants. */
const variantConfig: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: string; iconName: keyof typeof Ionicons.glyphMap }
> = {
  success: {
    bg: "rgba(0, 212, 170, 0.12)",
    border: "rgba(0, 212, 170, 0.3)",
    text: "#00d4aa",
    icon: "#00d4aa",
    iconName: "checkmark-circle",
  },
  error: {
    bg: "rgba(231, 76, 60, 0.12)",
    border: "rgba(231, 76, 60, 0.3)",
    text: "#e74c3c",
    icon: "#e74c3c",
    iconName: "alert-circle",
  },
  info: {
    bg: "rgba(74, 144, 217, 0.12)",
    border: "rgba(74, 144, 217, 0.3)",
    text: "#4A90D9",
    icon: "#4A90D9",
    iconName: "information-circle",
  },
};

/** Single toast item with fade animation. */
const ToastItem = ({
  id,
  message,
  variant,
}: {
  id: number;
  message: string;
  variant: ToastVariant;
}) => {
  const dismiss = useToastStore((s) => s.dismiss);
  const opacity = useRef(new Animated.Value(0)).current;
  const config = variantConfig[variant];

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Fade out before auto-dismiss
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 2600);

    return () => clearTimeout(timer);
  }, [opacity]);

  return (
    <Animated.View style={{ opacity, marginBottom: 8 }}>
      <Pressable
        onPress={() => dismiss(id)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: config.bg,
          borderWidth: 1,
          borderColor: config.border,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Ionicons
          name={config.iconName}
          size={18}
          color={config.icon}
          style={{ marginRight: 10 }}
        />
        <Text
          style={{ color: config.text, fontSize: 14, fontWeight: "500", flex: 1 }}
          numberOfLines={2}
        >
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

/**
 * Toast container — place this once in the root layout.
 * Renders all active toasts at the top of the screen.
 */
export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 60,
        left: 20,
        right: 20,
        zIndex: 9999,
      }}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
        />
      ))}
    </View>
  );
};
