'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, Italic, List, ListOrdered, Quote } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  invalid,
  id,
  placeholder = 'Describe the challenge…',
}: {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  invalid?: boolean
  id?: string
  placeholder?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2] }, link: false })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        'aria-label': placeholder,
        class:
          'min-h-36 px-3 py-2.5 text-sm outline-none [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    onBlur: () => onBlur?.(),
  })

  // Keep in sync when the value is reset externally (e.g. draft restored).
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    if (value !== current) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            h2: e.isActive('heading', { level: 2 }),
            ul: e.isActive('bulletList'),
            ol: e.isActive('orderedList'),
            quote: e.isActive('blockquote'),
            empty: e.isEmpty,
          }
        : null,
  })

  const tools = [
    { key: 'bold', icon: Bold, label: 'Bold', run: () => editor?.chain().focus().toggleBold().run() },
    { key: 'italic', icon: Italic, label: 'Italic', run: () => editor?.chain().focus().toggleItalic().run() },
    { key: 'h2', icon: Heading2, label: 'Heading', run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: 'ul', icon: List, label: 'Bullet list', run: () => editor?.chain().focus().toggleBulletList().run() },
    { key: 'ol', icon: ListOrdered, label: 'Numbered list', run: () => editor?.chain().focus().toggleOrderedList().run() },
    { key: 'quote', icon: Quote, label: 'Quote', run: () => editor?.chain().focus().toggleBlockquote().run() },
  ] as const

  return (
    <div
      className={cn(
        'relative rounded-lg border border-input bg-input/30 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        invalid && 'border-destructive ring-3 ring-destructive/20',
      )}
    >
      <div className="flex gap-0.5 border-b p-1">
        {tools.map(({ key, icon: Icon, label, run }) => (
          <button
            key={key}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={!!state?.[key]}
            onMouseDown={(e) => e.preventDefault()}
            onClick={run}
            className={cn(
              'grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              state?.[key] && 'bg-accent text-primary',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
      {state?.empty !== false && !value && (
        <span className="pointer-events-none absolute top-[2.85rem] left-3 text-sm text-muted-foreground">{placeholder}</span>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
