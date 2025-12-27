'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { database } from '../lib/firebase';
import { ref, onValue, push, set, remove, update, off } from 'firebase/database';
import {
  Plus, Edit3, Trash2, Check, X, Search, Loader2,
  Copy, Code2, Wifi, WifiOff, Sparkles, Menu, ChevronLeft,
  Sun, Moon, File, FileText, Image, FileCode, Download, Upload, FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { githubLight } from '@uiw/codemirror-theme-github';


export default function EditorPage() {
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    if (windowWidth > 768) setIsSidebarOpen(true);
  }, [windowWidth]);

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
  const [loading, setLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const filteredNotes = useMemo(() =>
    notes.filter(note => note.name.toLowerCase().includes(searchTerm.toLowerCase()))
    , [notes, searchTerm]);

  // 🆕 ADD THESE HELPER FUNCTIONS HERE
  const getNoteWithFiles = useCallback(async (noteId) => {
    return new Promise((resolve, reject) => {
      const noteRef = ref(database, `notes/${noteId}`);
      onValue(
        noteRef,
        (snapshot) => {
          const data = snapshot.val();
          resolve(data);
        },
        reject,
        { onlyOnce: true }
      );
    });
  }, []);

  const deleteFilesFromCloudinary = useCallback(async (files) => {
    if (!files || Object.keys(files).length === 0) return;

    const publicIds = Object.values(files).map(file => file.id);

    try {
      const response = await fetch('/api/cloudinary/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_ids: publicIds })
      });

      if (!response.ok) {
        console.warn('Failed to delete some files from Cloudinary');
      }
    } catch (error) {
      console.warn('Cloudinary deletion failed:', error);
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timeout);
    }
  }, [error]);



  // ✅ Use the correct Firebase reference for notes list
  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;

    const loadNotes = () => {
      setLoading(true);
      const notesRef = ref(database, 'notes');

      unsubscribe = onValue(
        notesRef,
        (snapshot) => {
          if (!isMounted) return;

          const data = snapshot.val() || {};
          const noteList = Object.entries(data).map(([key, value]) => ({
            id: key,
            name: value?.name || key,
            createdAt: value?.createdAt || Date.now(),
            lastModified: value?.lastModified || Date.now(),
            fileCount: Object.keys(value?.files || {}).length // 🆕 ADD FILE COUNT
          }));

          noteList.sort((a, b) => b.lastModified - a.lastModified);

          // Use requestAnimationFrame for smooth UI updates
          requestAnimationFrame(() => {
            if (isMounted) {
              setNotes(noteList);
              setLoading(false);
            }
          });
        },
        (error) => {
          if (!isMounted) return;

          requestAnimationFrame(() => {
            if (isMounted) {
              setError('Failed to load codes. Please try again.');
              setLoading(false);
            }
          });

          console.error('Firebase error:', error);
        }
      );
    };

    loadNotes();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []); // ✅ No dependencies needed for the main notes list

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
      await set(newNoteRef, {
        name: trimmedName,
        content: '',
        createdAt: now,
        lastModified: now,
        files: {}
      });
      setNewNoteName('');
      onSelect(newNoteRef.key, false);
      setSelectedNoteId(newNoteRef.key);
    } catch (err) {
      setError('Failed to create code.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }, [newNoteName, notes, onSelect]);

  const deleteNote = useCallback(async (noteId) => {
    try {
      // 1. Get note data with files before deletion
      const noteData = await getNoteWithFiles(noteId);
      const files = noteData?.files || {};

      // 2. Delete files from Cloudinary first
      await deleteFilesFromCloudinary(files);

      // 3. Delete note from Firebase
      await remove(ref(database, `notes/${noteId}`));

      // 4. Update UI state
      if (selectedNoteId === noteId) {
        onSelect(null);
        setSelectedNoteId(null);
      }

    } catch (err) {
      setError('Failed to delete code.');
      console.error('Delete note error:', err);
    }
  }, [getNoteWithFiles, deleteFilesFromCloudinary, onSelect, selectedNoteId]);

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
      await update(ref(database, `notes/${noteId}`), {
        name: trimmedName,
        lastModified: Date.now()
      });
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
          className="bg-blue-600 cursor-pointer disabled:cursor-not-allowed hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-600"
        >

          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Plus className="w-4  h-4" />
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
      <div className="space-y-2 max-h-[70vh] overflow-y-auto [&::-webkit-scrollbar]:hidden scrollbar-none">

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
              className={`p-4 rounded-lg flex  justify-between items-center transition ${selectedNoteId === note.id ? 'bg-blue-900/20 border border-blue-500/50' : 'bg-[#2d2d2d] hover:bg-[#3a3a3a]'}`}
            >
              {editingNoteId === note.id ? (
                <div className="flex-1  flex gap-2">
                  <input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, saveRename, note.id)}
                    className="flex-1 px-1 py-1 bg-[#1e1e1e] border border-gray-700 rounded text-gray-200"
                    autoFocus
                  />
                  <button onClick={() => saveRename(note.id)} className="text-green-500 cursor-pointer p-1 hover:bg-green-500/10 rounded">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={cancelRenaming} className="text-gray-400 p-1 cursor-pointer hover:bg-gray-500/10 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleNoteSelect(note.id)}
                    className="flex-1 cursor-pointer text-left group"
                  >
                    <div className="font-medium text-gray-200 group-hover:text-white transition-colors">{note.name}</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors flex justify-between">
                      <span>Modified {formatDate(note.lastModified)}</span>
                      {note.fileCount > 0 && (
                        <span className="text-blue-400">
                          {note.fileCount} file{note.fileCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startRenaming(note)}
                      className="p-2 text-gray-400 cursor-pointer hover:text-yellow-500 hover:bg-yellow-500/10 rounded-full transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setNoteToDelete(note);
                        setDeleteModalOpen(true);
                      }}
                      className="p-2 text-gray-400 cursor-pointer  hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
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
                  className="px-4 py-2 rounded-lg cursor-pointer text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteNote(noteToDelete.id);
                    setDeleteModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg cursor-pointer bg-red-600 text-white hover:bg-red-700 transition-colors"
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
  const [files, setFiles] = useState({});
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [cloudinaryWidget, setCloudinaryWidget] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const noteRef = useMemo(() => ref(database, `notes/${noteId}`), [noteId]);
  const saveTimeoutRef = useRef(null);
  const lastContentRef = useRef('');

  const editorExtensions = useMemo(() => [
    lineNumbers(),
    history(),
    javascript(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    theme === 'dark' ? oneDark : githubLight,
    EditorView.updateListener.of((updateEvent) => {
      if (updateEvent.docChanged) {
        const content = updateEvent.state.doc.toString();
        setLineCount(updateEvent.state.doc.lines);
        setCharCount(content.length);

        if (!isRemoteUpdate) {
          // Store content for comparison
          lastContentRef.current = content;
          
          // Clear existing timeout
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            setIsSaving(false);
          }

          // Set saving state
          setIsSaving(true);

          // Debounce: only save after user stops typing for 800ms
          saveTimeoutRef.current = setTimeout(() => {
            update(noteRef, { content, lastModified: Date.now() })
              .then(() => setIsConnected(true))
              .catch(() => setIsConnected(false))
              .finally(() => setIsSaving(false));
          }, 800);
        }
      }
    }),
    EditorView.theme({
      "&": { height: "100%" },
      ".cm-scroller": {
        overflow: "auto",
        maxHeight: "calc(100vh - 100px)",
        minHeight: "32lh"
      },
      ".cm-content": {
        minHeight: "32lh",
        paddingBottom: "100px"
      }
    })
  ], [theme, noteRef, isRemoteUpdate]);

  // Key sanitization function
  const sanitizeKey = useCallback((key) => {
    return key.replace(/[.#$/[\]]/g, '_');
  }, []);

  useEffect(() => {
    setFiles({});
    setSelectedFiles([]);
  }, [noteId]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;
    let view = null;

    setFiles({});
    setSelectedFiles([]);

    if (editorContainerRef.current && noteId) {
      if (viewRef.current) {
        viewRef.current.destroy();
      }

      const state = EditorState.create({
        doc: '',
        extensions: editorExtensions
      });

      view = new EditorView({
        state,
        parent: editorContainerRef.current
      });

      viewRef.current = view;

      unsubscribe = onValue(
        noteRef,
        (snapshot) => {
          if (!isMounted) return;

          setIsConnected(true);
          const data = snapshot.val();
          const content = data?.content || '';
          const files = data?.files || {};

          // Only update if mounted
          if (isMounted) {
            setFiles(files);

            if (view.state.doc.toString() !== content) {
              setIsRemoteUpdate(true);
              view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: content }
              });
              setLineCount(view.state.doc.lines);
              setCharCount(content.length);
              setIsRemoteUpdate(false);
            }
          }
        },
        (error) => {
          if (isMounted) {
            setIsConnected(false);
            console.error('Firebase connection error:', error);
          }
        }
      );
    }

    return () => {
      isMounted = false;
      if (view) view.destroy();
      if (unsubscribe) unsubscribe();
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteId, theme, editorExtensions, noteRef]);

  // Initialize Cloudinary widget
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;

      script.onload = () => {
        const widget = window.cloudinary.createUploadWidget(
          {
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
            sources: ['local', 'url'],
            multiple: true,
            maxFiles: 10,
            maxFileSize: 10000000, // 10MB
            resourceType: 'auto',
            clientAllowedFormats: ['image', 'video', 'audio', 'pdf', 'text', 'json', 'zip'],
            showPoweredBy: false,
            styles: {
              palette: {
                window: "#1e1e1e",
                windowBorder: "#505050",
                tabIcon: "#ffb300",
                menuIcons: "#ffb300",
                textDark: "#000000",
                textLight: "#FFFFFF",
                link: "#ffb300",
                action: "#ffb300",
                inactiveTabIcon: "#B8B8B8",
                error: "#F44235",
                inProgress: "#2196F3",
                complete: "#20B832",
                sourceBg: "#2d2d2d"
              },
              fonts: {
                default: {
                  active: true
                }
              }
            }
          },
          (error, result) => {
            if (!error && result && result.event === "success") {
              const originalPublicId = result.info.public_id;
              const sanitizedKey = sanitizeKey(originalPublicId);

              const newFile = {
                id: originalPublicId,
                name: result.info.original_filename,
                url: result.info.secure_url,
                type: result.info.resource_type,
                size: result.info.bytes,
                format: result.info.format,
                timestamp: Date.now()
              };

              // ✅ Get the CURRENT noteId from the DOM or a ref
              const currentNoteId = document.querySelector('[data-current-note-id]')?.getAttribute('data-current-note-id');

              if (!currentNoteId) {
                setFileError('No active note selected');
                setIsUploading(false);
                return;
              }

              const currentNoteRef = ref(database, `notes/${currentNoteId}`);

              setFiles(prevFiles => {
                const mergedFiles = {
                  ...prevFiles,
                  [sanitizedKey]: newFile
                };

                // Defer Firebase update to prevent render conflicts
                setTimeout(() => {
                  update(currentNoteRef, { files: mergedFiles })
                    .then(() => {
                      setIsUploading(false);
                    })
                    .catch(err => {
                      console.error("Firebase update error:", err);
                      setFileError('Failed to save file reference');
                      setIsUploading(false);
                    });
                }, 0);

                return mergedFiles;
              });

              setIsUploading(false);
            }
            else if (error) {
              setFileError(error.message || 'Upload failed');
              setIsUploading(false);
            }
            else if (result && result.event === "close") {
              setIsUploading(false);
            }
            else if (result && result.event === "queues-start") {
              setIsUploading(true);
            }
          }
        );
        setCloudinaryWidget(widget);
      };

      document.body.appendChild(script);
      return () => document.body.removeChild(script);
    }
  }, [sanitizeKey, noteRef]); // Only include sanitizeKey and noteRef

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

  const deleteFile = useCallback(async (file) => {
    try {
      // Call API to delete from Cloudinary using original ID
      const response = await fetch('/api/cloudinary/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: file.id })
      });

      if (!response.ok) {
        throw new Error('Failed to delete file from Cloudinary');
      }

      // Update Firebase using fresh reference
      const sanitizedKey = sanitizeKey(file.id);
      const updatedFiles = { ...files };
      delete updatedFiles[sanitizedKey];

      // Create fresh reference using current noteId
      const currentNoteRef = ref(database, `notes/${noteId}`);
      await update(currentNoteRef, { files: updatedFiles });

      // Remove from selected files if present
      setSelectedFiles(prev => prev.filter(id => id !== sanitizedKey));
    } catch (error) {
      setFileError(error.message);
      setTimeout(() => setFileError(''), 3000);
    }
  }, [files, noteId, sanitizeKey]); // Use noteId instead of noteRef

  const deleteSelectedFiles = useCallback(async () => {
    try {
      // Delete all selected files from Cloudinary
      await Promise.all(
        selectedFiles.map(sanitizedKey => {
          const file = files[sanitizedKey];
          return fetch('/api/cloudinary/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: file.id })
          });
        })
      );

      // Update Firebase
      const updatedFiles = { ...files };
      selectedFiles.forEach(sanitizedKey => {
        delete updatedFiles[sanitizedKey];
      });

      // Create fresh reference using current noteId
      const currentNoteRef = ref(database, `notes/${noteId}`);
      await update(currentNoteRef, { files: updatedFiles });
      setFiles(updatedFiles);
      setSelectedFiles([]);
    } catch (error) {
      setFileError('Failed to delete selected files');
      setTimeout(() => setFileError(''), 3000);
    }
  }, [selectedFiles, files, noteId]);

  const toggleFileSelection = (sanitizedKey) => {
    setSelectedFiles(prev =>
      prev.includes(sanitizedKey)
        ? prev.filter(id => id !== sanitizedKey)
        : [...prev, sanitizedKey]
    );
  };

  const getFileIcon = (type, format) => {
    if (type === 'image') return <Image className="w-4 h-4" />;
    if (type === 'video') return <File className="w-4 h-4" />;
    if (format === 'pdf') return <FileText className="w-4 h-4" />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json'].includes(format))
      return <FileCode className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === Object.keys(files).length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(Object.keys(files));
    }
  };


  const fileArray = Object.values(files);

  return (
    <div
      className={`flex flex-col h-full transition-colors duration-500 ease-in-out ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-[#f0f4f8]'}`}
      data-current-note-id={noteId}
    >
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

      {/* File Manager */}
      <div className={`border-t transition-colors duration-500 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className={`p-3 flex items-center justify-between cursor-pointer ${theme === 'dark' ? 'bg-[#252526]' : 'bg-gray-100'}`}
          onClick={() => setIsFileManagerOpen(!isFileManagerOpen)}>
          <div className="flex items-center gap-2">
            <File className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Files ({fileArray.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isUploading && (
              <Loader2 className={`w-4 h-4 animate-spin ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                cloudinaryWidget?.open();
              }}
              className={`p-2 rounded-md flex items-center gap-1 text-sm ${theme === 'dark'
                ? 'bg-blue-700 hover:bg-blue-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              <Upload className="w-4 h-4" />
              <span>Add Files</span>
            </motion.button>
            <motion.div
              animate={{ rotate: isFileManagerOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {isFileManagerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`overflow-hidden ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}
            >
              <div className="p-3 max-h-60 overflow-y-auto">
                {selectedFiles.length > 0 && (
                  <div className="mb-3 flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                      {selectedFiles.length} selected
                    </span>
                    <button
                      onClick={deleteSelectedFiles}
                      className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${theme === 'dark'
                        ? 'bg-red-800 hover:bg-red-700 text-red-100'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Selected</span>
                    </button>
                  </div>
                )}

                {fileArray.length === 0 ? (
                  <div className={`text-center py-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    No files attached to this code
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fileArray.map(file => (
                      <div
                        key={file.id}
                        className={`p-3 rounded-md flex items-center justify-between ${theme === 'dark'
                          ? selectedFiles.includes(file.id) ? 'bg-blue-900/30' : 'bg-[#2d2d2d]'
                          : selectedFiles.includes(file.id) ? 'bg-blue-100' : 'bg-white border'
                          }`}
                        onClick={() => toggleFileSelection(file.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${theme === 'dark' ? 'bg-[#3a3a3a]' : 'bg-gray-100'}`}>
                            {getFileIcon(file.type, file.format)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                              {file.name}
                            </div>
                            <div className="flex gap-3 text-xs">
                              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                                {file.format.toUpperCase()}
                              </span>
                              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                                {formatFileSize(file.size)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={file.url.replace("/upload/", "/upload/fl_attachment/")}
                            download={file.url.substring(file.url.lastIndexOf("/") + 1)}
                            className={`p-2 rounded-md ${theme === "dark" ? "hover:bg-[#3a3a3a]" : "hover:bg-gray-100"
                              }`}
                            title="Download"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-4 h-4" />
                          </a>


                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file);
                            }}
                            className={`p-2 rounded-md ${theme === 'dark' ? 'hover:bg-red-900/50' : 'hover:bg-red-100'}`}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {fileError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 p-2 text-sm text-center rounded-md ${theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}
                  >
                    {fileError}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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