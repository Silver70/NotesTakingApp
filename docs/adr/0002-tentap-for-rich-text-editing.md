---
status: accepted
---

# Use TenTap (@10play/tentap-editor) for rich-text editing

Every note's content will be persisted in whatever document schema the editor produces, so switching editors later means migrating every stored note, not just swapping a UI component. We evaluated the actively-maintained options for React Native: `@expensify/react-native-live-markdown` is the most actively developed and most New Architecture-native, but it's a markdown-syntax highlighter, not a WYSIWYG editor — it supports only one heading level and has no list support at all, which fails our formatting requirements outright. `react-native-cn-quill` and `react-native-pell-rich-editor` are WebView-wrapped (Quill.js/pell.js) and cover the formatting marks we need, but both show maintenance-risk signals (stalled maintainer, "inactive" health scores) and neither states New Architecture compatibility explicitly. We chose TenTap (Tiptap/ProseMirror-based) because it's the only candidate that explicitly documents New Architecture support, works via Expo Dev Client with no ejecting, and natively covers every mark in our Extended formatting tier (h1–h6, bold, italic, underline, bulleted/numbered lists, checklists).

## Consequences

Requires a custom Expo Dev Client — it does not run in plain Expo Go. If TenTap turns out to be unstable in practice, `react-native-cn-quill` is the fallback, accepting its maintainer-handoff risk.
