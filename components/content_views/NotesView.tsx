import React, { useState, useEffect } from 'react';
import { Content, User, ResourceType } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { NotesIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { NoteEditor } from './NoteEditor';

declare global {
    interface Window {
        MathJax: any;
    }
}

interface NotesViewProps {
    lessonId: string;
    user: User;
}

const NoteCard: React.FC<{ item: Content; onEdit: (c: Content) => void; onDelete: (id: string) => void; isAdmin: boolean; }> = ({ item, onEdit, onDelete, isAdmin }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 relative group">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 pr-24">{item.title}</h3>
        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: item.body }} />
        {isAdmin && (
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(item)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit Note"><EditIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" /></button>
                <button onClick={() => onDelete(item._id)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete Note"><TrashIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" /></button>
            </div>
        )}
    </div>
);

export const NotesView: React.FC<NotesViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['notes']), [lessonId, version]);
    
    // `editingNote` can be a Content object to edit, `true` to create a new one, or `null` to show the list.
    const [editingNote, setEditingNote] = useState<Content | boolean | null>(null);
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });

    const notes = groupedContent?.[0]?.docs || [];
    const resourceType: ResourceType = 'notes';

    useEffect(() => {
        // When notes data changes, re-run MathJax to typeset any formulas
        if (window.MathJax && !isLoading && notes.length > 0 && editingNote === null) {
            window.MathJax.typesetPromise();
        }
    }, [notes, isLoading, editingNote]);

    const handleSave = async (body: string) => {
        if (typeof editingNote === 'object' && editingNote !== null) { // Editing existing note
            await api.updateContent(editingNote._id, { body });
        } else { // Creating new note
            // Generate title from class and chapter (lesson) name using breadcrumbs
            try {
                const breadcrumbs = await api.getBreadcrumbs(lessonId);
                // Extract the class and lesson name from breadcrumbs path
                // Expected format: "Class > Subject > Unit > SubUnit > Lesson"
                const pathParts = breadcrumbs.split(' > ');
                const className = pathParts[0] || 'Class';
                const lessonName = pathParts[pathParts.length - 1] || 'Lesson';
                const title = `${className} - ${lessonName} - Notes`;
                
                await api.addContent({ title, body, lessonId, type: resourceType });
            } catch (error) {
                // Fallback to a default title if breadcrumbs fail
                const title = `Notes - ${lessonId}`;
                await api.addContent({ title, body, lessonId, type: resourceType });
            }
        }
        setVersion(v => v + 1);
        setEditingNote(null);
    };

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    const handleCancelEdit = () => {
        setEditingNote(null);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <NotesIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Notes</h1>
                </div>
                {user.role === 'admin' && !editingNote && (
                    <button onClick={() => setEditingNote(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <PlusIcon className="w-5 h-5" /><span>Add New Note</span>
                    </button>
                )}
            </div>

            {editingNote ? (
                <NoteEditor 
                    initialValue={typeof editingNote === 'object' && editingNote !== null ? editingNote.body : ''}
                    onSave={handleSave}
                    onCancel={handleCancelEdit}
                />
            ) : (
                <div>
                    {isLoading && <div className="text-center py-10">Loading notes...</div>}

                    {!isLoading && notes.length > 0 && (
                        <div className="space-y-6">
                            {notes.map(note => <NoteCard key={note._id} item={note} onEdit={setEditingNote} onDelete={handleDelete} isAdmin={user.role === 'admin'} />)}
                        </div>
                    )}
                    
                    {!isLoading && notes.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                            <NotesIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500">No notes available for this chapter.</p>
                        </div>
                    )}
                </div>
            )}

            <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })} onConfirm={confirmModalState.onConfirm} title="Delete Note" message="Are you sure you want to delete this note?" />
        </div>
    );
};