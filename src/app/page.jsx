'use client';

import { useState } from 'react';
import NoteList from '@/components/NoteList';
import CodeEditor from '@/components/CodeEditor';

export default function EditorPage() {
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  return (
    <div className="flex h-screen overflow-hidden bg-[#1e1e1e]">
      
      {/* Sidebar */}
      <aside className="w-96 bg-[#252526] border-r border-gray-700 overflow-y-auto">
        <NoteList onSelect={setSelectedNoteId} />
      </aside>

      {/* Main Editor */}
      <main className="flex-1 bg-[#1e1e1e] p-4 overflow-hidden">
        {selectedNoteId ? (
          <CodeEditor noteId={selectedNoteId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h2 className="text-lg font-semibold">No Note Selected</h2>
              <p className="text-sm mt-1">Select or create a note from the sidebar to start editing.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
