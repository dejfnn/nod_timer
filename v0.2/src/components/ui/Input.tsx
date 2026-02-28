import { useState, forwardRef } from "react";
import { TextInput, View, Text, Pressable } from "react-native";
import type { TextInputProps } from "react-native";

/**
 * Styled text input with label, error state, and optional icon slots.
 * Follows the Obsidian Chronograph surface layering.
 */

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Press handler for iconRight — turns it into a pressable button */
  onIconRightPress?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      iconLeft,
      iconRight,
      onIconRightPress,
      className = "",
      ...rest
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? "border-danger"
      : focused
        ? "border-primary"
        : "border-tf-border";

    return (
      <View className={className}>
        {label && (
          <Text className="text-xs font-medium text-txt-secondary mb-1.5 ml-1">
            {label}
          </Text>
        )}

        <View
          className={`
            flex-row items-center
            bg-tf-card rounded-xl border ${borderColor}
            px-3 py-2.5
          `}
        >
          {iconLeft && <View className="mr-2">{iconLeft}</View>}

          <TextInput
            ref={ref}
            className="flex-1 text-txt-primary text-sm"
            placeholderTextColor="#5a6270"
            cursorColor="#4A90D9"
            selectionColor="rgba(74, 144, 217, 0.3)"
            onFocus={(e) => {
              setFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              rest.onBlur?.(e);
            }}
            {...rest}
          />

          {iconRight &&
            (onIconRightPress ? (
              <Pressable onPress={onIconRightPress} className="ml-2 p-1">
                {iconRight}
              </Pressable>
            ) : (
              <View className="ml-2">{iconRight}</View>
            ))}
        </View>

        {error && (
          <Text className="text-xs text-danger mt-1 ml-1">{error}</Text>
        )}
        {hint && !error && (
          <Text className="text-xs text-txt-muted mt-1 ml-1">{hint}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = "Input";
