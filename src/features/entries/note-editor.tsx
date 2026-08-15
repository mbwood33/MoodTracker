import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

type NoteEditorProps = {
  value: string;
  document: JSONContent | null;
  onChange: (note: { plainText: string; document: JSONContent }) => void;
  onBlur?: () => void;
};

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      size="icon-sm"
      title={label}
      type="button"
      variant={active ? 'secondary' : 'ghost'}
    >
      {children}
    </Button>
  );
}

/**
 * Stores both the Tiptap document and a plain-text projection. Plain-text
 * legacy entries initialise safely as a simple paragraph.
 */
export function NoteEditor({
  value,
  document,
  onChange,
  onBlur,
}: NoteEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: document ?? value,
    editorProps: {
      attributes: {
        'aria-label': 'Note',
        class:
          'min-h-28 px-3 py-2 text-base outline-none prose prose-sm max-w-none dark:prose-invert',
      },
    },
    onUpdate: ({ editor: updatedEditor }) =>
      onChange({
        plainText: updatedEditor.getText(),
        document: updatedEditor.getJSON(),
      }),
    onBlur: () => onBlur?.(),
  });

  useEffect(() => {
    if (!editor) return;

    const documentChanged = document
      ? JSON.stringify(editor.getJSON()) !== JSON.stringify(document)
      : editor.getText() !== value;
    if (documentChanged)
      editor.commands.setContent(document ?? value, { emitUpdate: false });
  }, [document, editor, value]);

  if (!editor) return null;

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt('Paste a link URL');
    if (url?.trim()) editor.chain().focus().setLink({ href: url.trim() }).run();
  };

  return (
    <div className="border-input bg-background overflow-hidden rounded-xl border">
      <div
        aria-label="Note formatting"
        className="border-input flex flex-wrap gap-1 border-b p-1"
        role="toolbar"
      >
        <ToolbarButton
          active={editor.isActive('bold')}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          label="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('bulletList')}
          label="Bulleted list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('link')}
          label="Add or remove link"
          onClick={toggleLink}
        >
          <Link2 aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor.can().chain().focus().undo().run()}
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={!editor.can().chain().focus().redo().run()}
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <RemoveFormatting aria-hidden="true" className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
