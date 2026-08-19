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
      {/* The backdrop is the modal's boundary for a screen reader too:
          `accessibilityViewIsModal` stops VoiceOver from reaching the
          screen underneath, which is still mounted behind the overlay.
          Android's TalkBack gets the equivalent from `importantForAccessibility`
          on the same node. */}
      <View
        style={styles.backdrop}
        accessibilityViewIsModal
        accessibilityRole="alert"
        accessibilityLabel={title}
      >
        <ThemedView style={styles.card}>
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
            accessibilityLabel={title}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              style={styles.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <ThemedText type="defaultSemiBold">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={submit}
              hitSlop={8}
              disabled={!canSubmit}
              style={[
                styles.confirmButton,
                { backgroundColor: tintColor, opacity: canSubmit ? 1 : 0.4 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              // Communicates the greyed-out state, which `opacity` alone
              // only conveys to people who can see it.
              accessibilityState={{ disabled: !canSubmit }}
              accessibilityHint={
                canSubmit ? undefined : "Enter a name to continue"
              }
            >
              <ThemedText type="defaultSemiBold" style={styles.confirmLabel}>
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
    borderRadius: 24,
    padding: 24,
    gap: 18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    textAlign: "center",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 18,
  },
  confirmLabel: {
    color: "#FFFFFF",
  },
});
