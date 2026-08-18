import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Card } from "@/components/ui/card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { deriveTitle } from "@/db/repository";
import type { NoteRow } from "@/db/schema";
import { useThemeColor } from "@/hooks/use-theme-color";
import { formatShortDate } from "@/lib/format-date";
import { toPlainText } from "@/lib/notes/rich-text";

/** The body preview under a Note card's title — the plain-text projection
 * of `content` (see lib/notes/rich-text.ts), minus its own first line
 * (already shown as the title) and any blank lines around it. */
function deriveSnippet(content: string): string {
  const lines = toPlainText(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(1).join(" ");
}

/**
 * A single Note, as a card: an eyebrow line (a date, or — for global
 * search results — the Folder it lives in), its derived title, and a
 * short body preview. Shared by Home, Folder-browse, and Search (ticket-
 * less UI pass) — `onDelete` is omitted by Search, which only opens a
 * Note (see CONTEXT.md's "Search" and the previous search-results-list's
 * own comment), so no delete affordance renders there.
 */
export function NoteCard({
  note,
  onPress,
  onDelete,
  subtitle,
}: {
  note: NoteRow;
  onPress: () => void;
  onDelete?: () => void;
  subtitle?: string;
}) {
  const title = deriveTitle(note.content);
  const snippet = deriveSnippet(note.content);
  const placeholder = useThemeColor({}, "placeholder");
  const icon = useThemeColor({}, "icon");

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={styles.card}>
        <View style={styles.header}>
          <ThemedText
            style={[styles.eyebrow, { color: placeholder }]}
            numberOfLines={1}
          >
            {subtitle ?? formatShortDate(note.updatedAt)}
          </ThemedText>
          {onDelete && (
            <Pressable
              onPress={onDelete}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Delete Note"
            >
              <IconSymbol name="trash.fill" size={16} color={icon} />
            </Pressable>
          )}
        </View>
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        {snippet.length > 0 && (
          <ThemedText
            numberOfLines={2}
            style={[styles.snippet, { color: placeholder }]}
          >
            {snippet}
          </ThemedText>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 17,
  },
  snippet: {
    fontSize: 14,
    lineHeight: 19,
  },
});
