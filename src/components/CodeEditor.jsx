'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { database } from '../lib/firebase';
import { ref, update, onValue, off } from 'firebase/database';

import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import { Copy, Check, Loader2, Code2, Wifi, WifiOff, Sparkles } from 'lucide-react';

export default function CodeEditor({ noteId }) {
  const editorContainerRef = useRef(null);
  const viewRef = useRef(null);
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [charCount, setCharCount] = useState(0);

  const handleCopy = useCallback(async () => {
    try {
      const code = viewRef.current?.state.doc.toString() || '';
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, []);

  const updateStats = useCallback((doc) => {
    const content = doc.toString();
    setLineCount(doc.lines);
    setCharCount(content.length);
  }, []);

  useEffect(() => {
    if (!editorContainerRef.current || !noteId) return;

    const noteRef = ref(database, `notes/${noteId}`);

    const state = EditorState.create({
      doc: '',
      extensions: [
        lineNumbers(),
        history(),
        javascript(),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((updateEvent) => {
          if (updateEvent.docChanged) {
            updateStats(updateEvent.state.doc);
            if (!isRemoteUpdate) {
              setIsSaving(true);
              const currentCode = updateEvent.state.doc.toString();
              update(noteRef, { content: currentCode }).finally(() =>
                setTimeout(() => setIsSaving(false), 300)
              );
            }
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    viewRef.current = view;

    const unsubscribe = onValue(
      noteRef,
      (snapshot) => {
        setIsConnected(true);
        const data = snapshot.val();
        const content = data?.content || '';
        if (view.state.doc.toString() !== content) {
          setIsRemoteUpdate(true);
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: content },
          });
          updateStats(view.state.doc);
          setIsRemoteUpdate(false);
        }
      },
      (error) => {
        setIsConnected(false);
        console.error('Firebase connection error:', error);
      }
    );

    return () => {
      view?.destroy();
      off(noteRef);
    };
  }, [noteId, isRemoteUpdate, updateStats]);

  // Theme state and toggle
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className={
      theme === 'dark'
        ? 'min-h-screen bg-gradient-to-br from-[#232526] via-[#1e1e1e] to-[#007cf0] p-4 text-gray-200'
        : 'min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e2e8f0] to-[#a7f3d0] p-4 text-gray-900'
    }>
      <div className={
        'max-w-6xl mx-auto space-y-4 shadow-2xl rounded-xl border relative ' +
        (theme === 'dark'
          ? 'border-gray-800 bg-[#18181b]/80'
          : 'border-gray-300 bg-white/80')
      }>
        {/* DevDrop Badge */}
        <div className="absolute right-0 z-20">
          <span className={
            'px-5 py-2 rounded-full font-bold shadow-lg animate-pulse ' +
            (theme === 'dark'
              ? 'text-white bg-gradient-to-r from-[#007cf0] to-[#00dfd8] border border-blue-400'
              : 'text-gray-900 bg-gradient-to-r from-[#a7f3d0] to-[#38bdf8] border border-blue-200')
          }>DevDrop 🚀</span>
        </div>

        {/* Header */}
        <div className={
          'flex justify-between items-center px-6 py-4 rounded-t-xl border-b shadow-md ' +
          (theme === 'dark'
            ? 'bg-[#232526] border-gray-700'
            : 'bg-[#e2e8f0] border-gray-300')
        }>
          <div className="flex items-center gap-4">
            <Code2 className={theme === 'dark' ? 'w-8 h-8 text-blue-400 drop-shadow-lg' : 'w-8 h-8 text-blue-600 drop-shadow-lg'} />
            <div>
              <h1 className={theme === 'dark' ? 'text-2xl font-bold tracking-tight text-white' : 'text-2xl font-bold tracking-tight text-gray-900'}>DevDrop Code Editor</h1>
              <p className={theme === 'dark' ? 'text-sm text-gray-400' : 'text-sm text-gray-600'}>Realtime collaborative editing with style</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <button
              onClick={toggleTheme}
              className={
                'px-3 py-1 rounded-lg font-semibold shadow border transition-colors ' +
                (theme === 'dark'
                  ? 'bg-[#007cf0] text-white border-blue-400 hover:bg-[#00dfd8]'
                  : 'bg-[#a7f3d0] text-gray-900 border-blue-200 hover:bg-[#38bdf8]')
              }
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className={theme === 'dark' ? 'w-5 h-5 text-green-400 animate-pulse' : 'w-5 h-5 text-green-600 animate-pulse'} />
                  <span className={theme === 'dark' ? 'text-green-400 font-semibold' : 'text-green-600 font-semibold'}>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className={theme === 'dark' ? 'w-5 h-5 text-red-400 animate-pulse' : 'w-5 h-5 text-red-600 animate-pulse'} />
                  <span className={theme === 'dark' ? 'text-red-400 font-semibold' : 'text-red-600 font-semibold'}>Disconnected</span>
                </>
              )}
            </div>
            {isSaving && (
              <div className={theme === 'dark' ? 'flex items-center gap-2 text-blue-400' : 'flex items-center gap-2 text-blue-600'}>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div
          ref={editorContainerRef}
          className={
            'rounded-b-xl overflow-y-auto shadow-inner ' +
            (theme === 'dark'
              ? 'border border-gray-700 bg-[#18181b]'
              : 'border border-gray-300 bg-white')
          }
          style={{ height: '500px' }}
        />

        {/* Footer */}
        <div className={
          'flex justify-between items-center px-6 py-3 rounded-b-xl border-t shadow-md ' +
          (theme === 'dark'
            ? 'bg-[#232526] border-gray-700'
            : 'bg-[#e2e8f0] border-gray-300')
        }>
          <div className={theme === 'dark' ? 'flex gap-6 text-sm text-gray-400' : 'flex gap-6 text-sm text-gray-600'}>
            <span>Lines: <span className={theme === 'dark' ? 'text-gray-200 font-bold' : 'text-gray-900 font-bold'}>{lineCount}</span></span>
            <span>Chars: <span className={theme === 'dark' ? 'text-gray-200 font-bold' : 'text-gray-900 font-bold'}>{charCount}</span></span>
            <div className={theme === 'dark' ? 'flex items-center gap-2 text-[12px] text-gray-500' : 'flex items-center gap-2 text-[12px] text-gray-400'}>
              <Sparkles className={theme === 'dark' ? 'w-4 h-4 text-yellow-400 animate-bounce' : 'w-4 h-4 text-yellow-500 animate-bounce'} />
              Developed by <span className={theme === 'dark' ? 'text-blue-300 font-bold ml-1' : 'text-blue-600 font-bold ml-1'}>Vivek Kumar Verma</span>
            </div>
          </div>
          <button
            onClick={handleCopy}
            disabled={copied}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg border ${
              theme === 'dark'
                ? 'border-blue-500'
                : 'border-blue-300'
            } ${
              copied
                ? theme === 'dark'
                  ? 'bg-green-600 text-white animate-pulse'
                  : 'bg-green-300 text-gray-900 animate-pulse'
                : theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                  : 'bg-gradient-to-r from-blue-200 to-blue-400 hover:from-blue-300 hover:to-blue-500 text-gray-900'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
