import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PROJECT_COLORS } from "@/constants/config";

/**
 * 4x4 color swatch grid for project color selection.
 * Selected swatch shows a checkmark overlay.
 */

interface ColorSwatchPickerProps {
  /** Currently selected color hex */
  selectedColor: string;
  /** Called when a color is selected */
  onSelect: (color: string) => void;
  /** Colors array — defaults to PROJECT_COLORS */
  colors?: string[];
  className?: string;
}

export const ColorSwatchPicker = ({
  selectedColor,
  onSelect,
  colors = PROJECT_COLORS,
  className = "",
}: ColorSwatchPickerProps) => {
  return (
    <View className={`flex-row flex-wrap gap-2 ${className}`}>
      {colors.map((color) => {
        const isSelected = color.toLowerCase() === selectedColor.toLowerCase();
        return (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            className="items-center justify-center rounded-xl"
            style={({ pressed }) => [
              {
                width: 44,
                height: 44,
                backgroundColor: color,
                borderWidth: isSelected ? 3 : 1,
                borderColor: isSelected
                  ? "#ffffff"
                  : "rgba(255, 255, 255, 0.12)",
                borderRadius: 12,
              },
              pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] },
            ]}
            accessibilityLabel={`Color ${color}`}
            accessibilityState={{ selected: isSelected }}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={22} color="#ffffff" />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};
