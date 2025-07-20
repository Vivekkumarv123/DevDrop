'use client';

import { useEffect, useState, useCallback } from 'react';
import { database } from '../lib/firebase';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import {
    Plus, Edit3, Trash2, Check, X, Search,
    Loader2, Calendar, Hash, FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NoteList({ onSelect }) {
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
        } catch (err) {
            setError('Failed to create code.');
            console.error(err);
        } finally { setIsCreating(false); }
    }, [newNoteName, notes]);

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

    const handleNoteSelect = useCallback((noteId, noteName) => {
        setSelectedNoteId(noteId);
        onSelect(noteId, noteName);
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
        <>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 border-b p-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Codes
                        </h2>
                    </div>
                    <p className="text-sm text-gray-500">Codes count: {notes.length}</p>
                </div>

                {/* Search */}
                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search codes..."
                            className="w-full pl-10 pr-3 py-2 text-black border rounded focus:ring focus:ring-blue-100"
                        />
                    </div>
                </div>

                {/* Create Note */}
                <div className="p-4 flex gap-2">
                    <input
                        value={newNoteName}
                        onChange={(e) => setNewNoteName(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, createNote)}
                        placeholder="New code name..."
                        className="flex-1 px-3 py-2 border text-black rounded focus:ring focus:ring-blue-100"
                        disabled={isCreating}
                    />
                    <button
                        onClick={createNote}
                        disabled={isCreating || !newNoteName.trim()}
                        className="bg-blue-600 text-white px-3 py-2 rounded cursor-pointer hover:bg-blue-700 disabled:bg-gray-300"
                    >
                        {isCreating ? 'Creating...' : 'Add'}
                    </button>
                </div>

                {/* Notes List */}
                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No codes found.</div>
                    ) : (
                        filteredNotes.map(note => (
                            <div
                                key={note.id}
                                className={`p-4 flex justify-between items-center hover:bg-gray-50 transition ${selectedNoteId === note.id ? 'bg-blue-50' : ''}`}
                            >
                                {editingNoteId === note.id ? (
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                            onKeyPress={(e) => handleKeyPress(e, saveRename, note.id)}
                                            className="flex-1 px-2 py-1 border rounded text-gray-900"
                                            autoFocus
                                        />
                                        <button onClick={() => saveRename(note.id)} className="text-green-600">
                                            <Check />
                                        </button>
                                        <button onClick={cancelRenaming} className="text-gray-600">
                                            <X />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleNoteSelect(note.id, note.name)}
                                            className="flex-1 text-left"
                                        >
                                            <div className="font-medium text-gray-900">{note.name}</div>
                                            <div className="text-xs text-gray-500">Modified {formatDate(note.lastModified)}</div>
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => startRenaming(note)} className="text-yellow-600 cursor-pointer">
                                                <Edit3 />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setNoteToDelete(note);
                                                    setDeleteModalOpen(true);
                                                }}
                                                className="text-red-600 cursor-pointer"
                                            >
                                                <Trash2 />
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
                    <div className="p-3 text-sm text-red-600 text-center">{error}</div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModalOpen && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                        >
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-gray-900">
                                <Trash2 className="w-5 h-5 text-red-600" />
                                Confirm Deletion
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Are you sure you want to delete <span className="font-medium">{noteToDelete?.name}</span>?
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    className="px-3 py-1 rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        deleteNote(noteToDelete.id);
                                        setDeleteModalOpen(false);
                                    }}
                                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
