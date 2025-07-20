'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '../lib/firebase';
import { ref, onValue, push, set, remove, update, off } from 'firebase/database';
import {
  Plus, Edit3, Trash2, Check, X, Search, Loader2,
  Copy, Code2, Wifi, WifiOff, Sparkles, Menu, ChevronLeft,
  Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

export default function EditorPage() {
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    // Set initial width and handle resize
    setWindowWidth(window.innerWidth);

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setIsSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#1e1e1e] overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 bg-[#252526] border-b border-gray-700">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-200">DevDrop Editor</h1>
        <div className="w-8"></div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || windowWidth > 768) && (
          <motion.aside
            initial={{ x: windowWidth <= 768 ? -300 : 0 }}
            animate={{ x: 0 }}
            exit={{ x: windowWidth <= 768 ? -300 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-full md:w-80 absolute md:relative z-20 h-full bg-[#252526] border-r border-gray-700 overflow-y-auto"
          >
            <div className="p-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                Codes
              </h2>
              <button
                onClick={toggleSidebar}
                className="md:hidden p-1 rounded-md text-gray-400 hover:bg-gray-700"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            <NoteList
              onSelect={(id, closeSidebar = true) => {
                setSelectedNoteId(id);
                if (window.innerWidth <= 768 && closeSidebar) {
                  setIsSidebarOpen(false);
                }
              }}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Editor */}
      <main className="flex-1 bg-[#1e1e1e] overflow-hidden">
        {selectedNoteId ? (
          <CodeEditor noteId={selectedNoteId} />
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center max-w-md">
              <div className="bg-[#252526] p-5 rounded-xl border border-gray-700">
                <Code2 className="w-10 h-10 mx-auto text-blue-500 mb-3" />
                <h1 className="text-xl font-semibold text-gray-200 mb-2">DevDrop</h1>
                <h2 className="text-lg font-semibold text-gray-200 mb-2">No Note Selected</h2>
                <p className="text-gray-400 mb-5 text-sm">
                  Select or create a note from the sidebar to start editing.
                </p>
                <button
                  onClick={toggleSidebar}
                  className="bg-blue-600 md:hidden hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 mx-auto text-sm"
                >
                  <Menu className="w-4 h-4" />
                  <span>Browse Notes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NoteList({ onSelect }) {
  const [notes, setNotes] = useState([]);
  const [newNoteName, setNewNoteName] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const filteredNotes = notes.filter(note =>
    note.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  useEffect(() => {
    const notesRef = ref(database, 'notes');
    const unsubscribe = onValue(
      notesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const updates = {};
        const noteList = Object.keys(data).map((key) => {
          if (!data[key]?.name) updates[key] = { ...data[key], name: key };
          return {
            id: key,
            name: data[key]?.name ?? key,
            createdAt: data[key]?.createdAt || Date.now(),
            lastModified: data[key]?.lastModified || Date.now(),
          };
        });
        if (Object.keys(updates).length > 0) update(notesRef, updates);
        noteList.sort((a, b) => b.lastModified - a.lastModified);
        setNotes(noteList);
        setLoading(false);
      },
      (error) => {
        setError('Failed to load codes. Please try again.');
        setLoading(false);
        console.error('Firebase error:', error);
      }
    );
    return () => unsubscribe();
  }, []);

  const createNote = useCallback(async () => {
    const trimmedName = newNoteName.trim();
    if (!trimmedName) { setError('Please enter a code name'); return; }
    if (trimmedName.length > 100) { setError('Code name too long'); return; }
    if (notes.some(note => note.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A code with this name already exists');
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      const newNoteRef = push(ref(database, 'notes'));
      const now = Date.now();
      await set(newNoteRef, { name: trimmedName, content: '', createdAt: now, lastModified: now });
      setNewNoteName('');
      // Select the new note after creation
      onSelect(newNoteRef.key, false);
      setSelectedNoteId(newNoteRef.key);
    } catch (err) {
      setError('Failed to create code.');
      console.error(err);
    } finally { setIsCreating(false); }
  }, [newNoteName, notes, onSelect]);

  const deleteNote = useCallback(async (noteId) => {
    try {
      await remove(ref(database, `notes/${noteId}`));
      if (onSelect && selectedNoteId === noteId) {
        onSelect(null);
        setSelectedNoteId(null);
      }
    } catch (err) {
      setError('Failed to delete code.');
      console.error(err);
    }
  }, [onSelect, selectedNoteId]);

  const startRenaming = useCallback((note) => {
    setEditingNoteId(note.id);
    setEditedName(note.name);
    setError('');
  }, []);

  const cancelRenaming = useCallback(() => {
    setEditingNoteId(null);
    setEditedName('');
    setError('');
  }, []);

  const saveRename = useCallback(async (noteId) => {
    const trimmedName = editedName.trim();
    if (!trimmedName) { setError('Code name cannot be empty'); return; }
    if (trimmedName.length > 100) { setError('Code name too long'); return; }
    if (notes.some(note => note.name.toLowerCase() === trimmedName.toLowerCase() && note.id !== noteId)) {
      setError('A code with this name already exists');
      return;
    }
    try {
      await update(ref(database, `notes/${noteId}`), { name: trimmedName, lastModified: Date.now() });
      setEditingNoteId(null);
      setEditedName('');
      setError('');
    } catch (err) {
      setError('Failed to rename code.');
      console.error(err);
    }
  }, [editedName, notes]);

  const handleNoteSelect = useCallback((noteId) => {
    setSelectedNoteId(noteId);
    onSelect(noteId, true);
  }, [onSelect]);

  const handleKeyPress = useCallback((e, action, ...args) => {
    if (e.key === 'Enter') { e.preventDefault(); action(...args); }
    if (e.key === 'Escape' && editingNoteId) { cancelRenaming(); }
  }, [editingNoteId, cancelRenaming]);

  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  }, []);

  return (
    <div className="p-2">
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search codes..."
            className="w-full pl-10 pr-3 py-2 text-gray-200 bg-[#2d2d2d] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Create Note */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <input
          value={newNoteName}
          onChange={(e) => setNewNoteName(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, createNote)}
          placeholder="New code name..."
          className="flex-1 px-4 py-2 text-gray-200 bg-[#2d2d2d] border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={isCreating}
        />
        <button
          onClick={createNote}
          disabled={isCreating || !newNoteName.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-600"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </>
          )}
        </button>
      </div>

      {/* Notes Count */}
      <div className="text-sm text-gray-500 mb-4 flex justify-between items-center">
        <span>{notes.length} {notes.length === 1 ? 'code' : 'codes'}</span>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Notes List */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? "No matching codes found" : "No codes created yet"}
          </div>
        ) : (
          filteredNotes.map(note => (
            <div
              key={note.id}
              className={`p-4 rounded-lg flex justify-between items-center transition ${selectedNoteId === note.id ? 'bg-blue-900/20 border border-blue-500/50' : 'bg-[#2d2d2d] hover:bg-[#3a3a3a]'}`}
            >
              {editingNoteId === note.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, saveRename, note.id)}
                    className="flex-1 px-1 py-1 bg-[#1e1e1e] border border-gray-700 rounded text-gray-200"
                    autoFocus
                  />
                  <button onClick={() => saveRename(note.id)} className="text-green-500 p-1 hover:bg-green-500/10 rounded">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={cancelRenaming} className="text-gray-400 p-1 hover:bg-gray-500/10 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleNoteSelect(note.id)}
                    className="flex-1 text-left group"
                  >
                    <div className="font-medium text-gray-200 group-hover:text-white transition-colors">{note.name}</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Modified {formatDate(note.lastModified)}</div>
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startRenaming(note)}
                      className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-full transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setNoteToDelete(note);
                        setDeleteModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 text-sm text-red-400 bg-red-900/30 rounded-lg border border-red-700/50 text-center"
        >
          {error}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#2d2d2d] rounded-xl shadow-lg p-6 w-full max-w-sm border border-gray-700"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-200">
                <Trash2 className="w-5 h-5 text-red-400" />
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to delete <span className="font-medium text-gray-200">{noteToDelete?.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteNote(noteToDelete.id);
                    setDeleteModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CodeEditor({ noteId }) {
  const editorContainerRef = useRef(null);
  const viewRef = useRef(null);
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [charCount, setCharCount] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [currentContent, setCurrentContent] = useState('');

  // Refs to track state without recreating effects
  const isRemoteUpdateRef = useRef(isRemoteUpdate);
  const updateStatsRef = useRef(() => { });
  const setIsSavingRef = useRef(() => { });
  const setIsConnectedRef = useRef(() => { });

  // Keep refs updated
  useEffect(() => {
    isRemoteUpdateRef.current = isRemoteUpdate;
  }, [isRemoteUpdate]);

  useEffect(() => {
    updateStatsRef.current = (doc) => {
      const content = doc.toString();
      setLineCount(doc.lines);
      setCharCount(content.length);
    };
  }, []);

  useEffect(() => {
    setIsSavingRef.current = setIsSaving;
    setIsConnectedRef.current = setIsConnected;
  }, []);

  // Smooth theme toggle
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

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

  // Initialize editor
  const initEditor = useCallback(() => {
    if (!editorContainerRef.current || !noteId) return;

    // Clear previous editor
    if (viewRef.current) {
      setCurrentContent(viewRef.current.state.doc.toString());
      viewRef.current.destroy();
    }

    const noteRef = ref(database, `notes/${noteId}`);

    // Create state with current content
    const state = EditorState.create({
      doc: currentContent,
      extensions: [
        lineNumbers(),
        history(),
        javascript(),
        theme === 'dark' ? oneDark : [],
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((updateEvent) => {
          if (updateEvent.docChanged) {
            updateStatsRef.current(updateEvent.state.doc);
            if (!isRemoteUpdateRef.current) {
              setIsSavingRef.current(true);
              const currentCode = updateEvent.state.doc.toString();
              update(noteRef, { content: currentCode }).finally(() =>
                setTimeout(() => setIsSavingRef.current(false), 300)
              );
            }
          }
        }),
      ],
    });

    // Create new editor view
    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });

    viewRef.current = view;

    // Firebase listener
    const unsubscribe = onValue(
      noteRef,
      (snapshot) => {
        setIsConnectedRef.current(true);
        const data = snapshot.val();
        const content = data?.content || '';
        if (view.state.doc.toString() !== content) {
          isRemoteUpdateRef.current = true;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: content },
          });
          updateStatsRef.current(view.state.doc);
          isRemoteUpdateRef.current = false;
        }
      },
      (error) => {
        setIsConnectedRef.current(false);
        console.error('Firebase connection error:', error);
      }
    );

    return () => {
      view.destroy();
      unsubscribe();
      off(noteRef);
    };
  }, [noteId, theme, currentContent]);

  // Initialize editor on mount and theme change
  useEffect(() => {
    const cleanup = initEditor();
    return cleanup;
  }, [initEditor]);

  return (
    <div className={`flex flex-col h-full transition-colors duration-500 ease-in-out ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-[#f0f4f8]'}`}>
      {/* Header */}
      <div className={`p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors duration-500 ease-in-out ${theme === 'dark' ? 'bg-[#232526]' : 'bg-[#e2e8f0]'}`}>
        <div className="flex items-center gap-2">
          <Code2 className={`w-6 h-6 transition-colors duration-500 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h1 className={`text-lg font-bold transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              DevDrop Editor
            </h1>
            <p className={`text-xs transition-colors duration-500 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Realtime collaborative editing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-xs">
            {isConnected ? (
              <>
                <Wifi className={`w-3.5 h-3.5 transition-colors duration-500 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`transition-colors duration-500 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  Connected
                </span>
              </>
            ) : (
              <>
                <WifiOff className={`w-3.5 h-3.5 transition-colors duration-500 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                <span className={`transition-colors duration-500 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  Disconnected
                </span>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            className={`relative w-14 h-7 rounded-full flex items-center px-1 ${theme === 'dark'
                ? 'bg-blue-600'
                : 'bg-blue-200'
              }`}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <motion.div
              className={`absolute w-5 h-5 rounded-full flex items-center justify-center ${theme === 'dark'
                  ? 'bg-white text-blue-600'
                  : 'bg-white text-yellow-500'
                }`}
              initial={false}
              animate={{
                x: theme === 'dark' ? 28 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
            >
              {theme === 'dark' ? (
                <Moon className="w-3 h-3" />
              ) : (
                <Sun className="w-3 h-3" />
              )}
            </motion.div>
          </motion.button>

          <motion.button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-lg font-medium text-sm flex items-center gap-1 ${theme === 'dark'
                ? copied
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : copied
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </motion.button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden transition-colors duration-500 ease-in-out">
        <div
          ref={editorContainerRef}
          className={`h-full transition-colors duration-500 ease-in-out ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white'}`}
        />
      </div>

      {/* Footer */}
      <div className={`p-3 flex flex-wrap justify-between items-center gap-3 text-sm transition-colors duration-500 ease-in-out ${theme === 'dark' ? 'bg-[#232526]' : 'bg-[#e2e8f0]'}`}>
        <div className={`flex flex-wrap gap-4 items-center transition-colors duration-500 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <span>Lines: <span className={`transition-colors duration-500 ${theme === 'dark' ? 'text-gray-200 font-medium' : 'text-gray-900 font-medium'}`}>{lineCount}</span></span>
          <span>Chars: <span className={`transition-colors duration-500 ${theme === 'dark' ? 'text-gray-200 font-medium' : 'text-gray-900 font-medium'}`}>{charCount}</span></span>
          {isSaving && (
            <div className={`flex items-center gap-1 transition-colors duration-500 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>

        <div className={`flex items-center gap-2 text-xs transition-colors duration-500 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          <Sparkles className={`transition-colors duration-500 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`} size={14} />
          Developed by <span className={`transition-colors duration-500 ${theme === 'dark' ? 'text-blue-300 font-medium' : 'text-blue-600 font-medium'}`}>Vivek Kumar Verma</span>
        </div>
      </div>
    </div>
  );
}