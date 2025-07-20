'use client';

import { useState, useEffect, useCallback } from 'react';
import NoteList from '@/components/NoteList';
import CodeEditor from '@/components/CodeEditor';
import { X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function EditorPage() {
  const [openTabs, setOpenTabs] = useState([]); // { id, name }
  const [activeTabId, setActiveTabId] = useState(null);

  // Load tabs and active tab from localStorage on mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('openTabs');
    const savedActiveTabId = localStorage.getItem('activeTabId');

    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        if (Array.isArray(parsedTabs)) {
          setOpenTabs(parsedTabs);
        }
      } catch (e) {
        console.error('Failed to parse openTabs from localStorage', e);
      }
    }

    if (savedActiveTabId) {
      setActiveTabId(savedActiveTabId);
    }
  }, []);

  // Persist openTabs and activeTabId on changes
  useEffect(() => {
    localStorage.setItem('openTabs', JSON.stringify(openTabs));
    localStorage.setItem('activeTabId', activeTabId ?? '');
  }, [openTabs, activeTabId]);

  const handleSelectNote = useCallback((noteId, noteName) => {
    setOpenTabs((prevTabs) => {
      const exists = prevTabs.find((tab) => tab.id === noteId);
      if (exists) return prevTabs;
      return [...prevTabs, { id: noteId, name: noteName }];
    });
    setActiveTabId(noteId);
  }, []);

  const handleCloseTab = useCallback((tabId) => {
    setOpenTabs((prevTabs) => {
      const newTabs = prevTabs.filter((tab) => tab.id !== tabId);
      if (tabId === activeTabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const handleNoteDeleted = useCallback((deletedNoteId) => {
    handleCloseTab(deletedNoteId);
  }, [handleCloseTab]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedTabs = Array.from(openTabs);
    const [removed] = reorderedTabs.splice(result.source.index, 1);
    reorderedTabs.splice(result.destination.index, 0, removed);

    setOpenTabs(reorderedTabs);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#1e1e1e]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#252526] border-r border-gray-700 overflow-y-auto">
        <NoteList onSelect={handleSelectNote} onDelete={handleNoteDeleted} />
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs with Drag-and-Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tabs" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex bg-[#1e1e1e] border-b border-gray-700 overflow-x-auto"
              >
                {openTabs.map((tab, index) => (
                  <Draggable key={tab.id} draggableId={tab.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => setActiveTabId(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-gray-700 ${
                          activeTabId === tab.id
                            ? 'bg-[#252526] text-white'
                            : 'text-gray-400 hover:bg-[#2d2d2d]'
                        } ${
                          snapshot.isDragging ? 'bg-[#333]' : ''
                        }`}
                      >
                        <span className="truncate max-w-[140px]">{tab.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTab(tab.id);
                          }}
                          className="hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {activeTabId ? (
            <CodeEditor noteId={activeTabId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <h2 className="text-lg font-semibold">No Note Open</h2>
              <p className="text-sm mt-1">Select or create a note from the sidebar to start editing.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
