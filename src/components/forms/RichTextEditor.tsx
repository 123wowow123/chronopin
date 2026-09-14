'use client';

/* eslint-disable @typescript-eslint/no-explicit-any -- Editor.js plugins are loosely typed */

import { useEffect, useId, useRef } from 'react';

type EditorInstance = {
  isReady: Promise<void>;
  save: () => Promise<unknown>;
  destroy?: () => void;
  blocks: { renderFromHTML: (html: string) => Promise<void> };
};

// A block editor (Editor.js) for a pin's description, stored as HTML. Images
// dropped in are uploaded through /upload.
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const holderId = `editor-${useId().replace(/:/g, '')}`;
  const editorRef = useRef<EditorInstance | null>(null);
  const lastEmitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValue = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let cancelled = false;
    let instance: EditorInstance | null = null;

    (async () => {
      const modules = await Promise.all([
        import('@editorjs/editorjs'),
        import('@editorjs/header'),
        import('@editorjs/list'),
        import('@editorjs/embed'),
        import('@editorjs/image'),
        import('@sotaproject/strikethrough'),
        import('editorjs-parser'),
      ]);
      if (cancelled) return;
      const [EditorJS, Header, List, Embed, ImageTool, Strikethrough, Parser] = modules.map((m: any) => m.default ?? m);
      const parser = new Parser();
      const editor: EditorInstance = new EditorJS({
        holder: holderId,
        placeholder: placeholder || 'Tell everyone what the content is about',
        tools: {
          header: { class: Header, shortcut: 'CMD+SHIFT+H', inlineToolbar: true },
          list: { class: List, inlineToolbar: true, config: { defaultStyle: 'unordered' } },
          strikethrough: Strikethrough,
          embed: { class: Embed, inlineToolbar: true },
          image: { class: ImageTool, config: { endpoints: { byFile: '/upload/uploadFile', byUrl: '/upload/fetchUrl' } } },
        },
        onChange: async () => {
          const html = parser.parse(await editor.save());
          lastEmitted.current = html;
          onChangeRef.current(html);
        },
      });
      instance = editor;
      await editor.isReady;
      if (cancelled) return;
      editorRef.current = editor;
      if (initialValue.current) {
        await editor.blocks.renderFromHTML(initialValue.current);
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current = null;
      instance?.destroy?.();
    };
  }, [holderId, placeholder]);

  // A value set from outside (a scrape, loading the pin) replaces the content.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      initialValue.current = value;
      editorRef.current?.blocks.renderFromHTML(value || '');
    }
  }, [value]);

  return <div id={holderId} className="min-h-40 rounded bg-black px-3 py-2 text-ink ring-1 ring-raised-2" />;
}
