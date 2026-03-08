"use client";

import { useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { StatBox, SystemMessage, Spoiler } from "@/components/editor/extensions";
import "@/styles/editor.css";

// Extensions are static config — defined once at module level to avoid
// recreating the array (and triggering Tiptap diffing) on every render.
const extensions = [
  StarterKit,
  Underline,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Table.configure({
    resizable: false,
  }),
  TableRow,
  TableCell,
  TableHeader,
  Link.configure({
    openOnClick: true,
    HTMLAttributes: {
      class: 'text-primary underline',
    },
  }),
  Image.configure({
    inline: false,
    allowBase64: false,
  }),
  StatBox,
  SystemMessage,
  Spoiler,
]

interface TiptapRendererProps {
  content: string | object;
  className?: string;
}

export function TiptapRenderer({ content, className = "" }: TiptapRendererProps) {
  // Supabase returns jsonb as parsed object, but content might also be a JSON string.
  // Memoized to avoid re-parsing large JSON on every render.
  const parsedContent = useMemo(
    () => content ? (typeof content === 'string' ? JSON.parse(content) : content) : "",
    [content]
  )

  const editor = useEditor({
    extensions,
    content: parsedContent,
    editable: false,
    editorProps: {
      attributes: {
        class: `tiptap-editor prose dark:prose-invert max-w-none ${className}`,
      },
    },
  });

  if (!editor) {
    return <div className="animate-pulse h-96 bg-muted rounded" />;
  }

  return <EditorContent editor={editor} />;
}
