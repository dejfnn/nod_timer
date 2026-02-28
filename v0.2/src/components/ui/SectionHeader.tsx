import { View, Text } from "react-native";

/**
 * Linear-style section header — uppercase, tracked, muted.
 * Used to label groups of cards or content sections.
 */

interface SectionHeaderProps {
  title: string;
  /** Optional right-side action or count */
  right?: React.ReactNode;
  className?: string;
}

export const SectionHeader = ({
  title,
  right,
  className = "",
}: SectionHeaderProps) => (
  <View className={`flex-row items-center justify-between px-screen-x mb-3 ${className}`}>
    <Text
      className="text-section-label text-txt-muted uppercase"
      style={{ letterSpacing: 1.5 }}
    >
      {title}
    </Text>
    {right && <View>{right}</View>}
  </View>
);
