import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

/**
 * A small modal text prompt for naming/renaming a Folder (ticket 05).
 * `Alert.prompt` only exists on iOS — this app targets iOS and Android
 * from initial release (see spec.md), so any free-text input has to go
 * through a real component instead.
 */
export function TextPromptModal({
  visible,
  title,
  confirmLabel = "Save",
  initialValue = "",
  placeholder,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  confirmLabel?: string;
  initialValue?: string;
  placeholder?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const textColor = useThemeColor({}, "text");
  const separatorColor = useThemeColor({}, "separator");
  const placeholderColor = useThemeColor({}, "placeholder");
  const tintColor = useThemeColor({}, "tint");

  // Reset to the current initialValue every time the modal opens — this
  // component instance is reused across e.g. renaming different Folders
  // one after another, so it can't just seed state once on mount.
  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0;
  const submit = () => {
    if (canSubmit) {
      onSubmit(trimmed);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <ThemedView style={[styles.card, { borderColor: separatorColor }]}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {title}
          </ThemedText>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            style={[
              styles.input,
              { color: textColor, borderColor: separatorColor },
            ]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <Pressable onPress={onCancel} hitSlop={8}>
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={submit} hitSlop={8} disabled={!canSubmit}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: tintColor, opacity: canSubmit ? 1 : 0.4 }}
              >
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 16,
  },
  title: {
    textAlign: "center",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
  },
});
