import React, { useState } from 'react';
import { Content, User, ResourceType } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { PlusIcon, EditIcon, TrashIcon, ChevronRightIcon } from '../icons/AdminIcons';
import { ContentModal } from '../ContentModal';
import { ConfirmModal } from '../ConfirmModal';
import { RESOURCE_TYPES } from '../../constants';

interface GenericContentViewProps {
    lessonId: string;
    user: User;
    resourceType: ResourceType;
}

const ContentCard: React.FC<{ item: Content; onEdit: (c: Content) => void; onDelete: (id: string) => void; isAdmin: boolean; }> = ({ item, onEdit, onDelete, isAdmin }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-4 flex justify-between items-center group cursor-pointer">
                <h3 className="font-semibold text-gray-800 dark:text-white">{item.title}</h3>
                <div className="flex items-center">
                    {isAdmin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-4">
                            <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit"><EditIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(item._id); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" title="Delete"><TrashIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" /></button>
                        </div>
                    )}
                    <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </div>
            </div>
            {isOpen && (
                <div className="p-4 border-t dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.body}</p>
                </div>
            )}
        </div>
    );
};


export const GenericContentView: React.FC<GenericContentViewProps> = ({ lessonId, user, resourceType }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, [resourceType]), [lessonId, version, resourceType]);

    const [modalState, setModalState] = useState<{ isOpen: boolean; content: Content | null }>({ isOpen: false, content: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });

    const contentItems = groupedContent?.[0]?.docs || [];
    const resourceInfo = RESOURCE_TYPES.find(r => r.key === resourceType) || { key: resourceType, label: resourceType, Icon: () => null };

    const handleSave = async (contentData: { title: string; body: string }) => {
        if (modalState.content) {
            await api.updateContent(modalState.content._id, contentData);
        } else {
            await api.addContent({ ...contentData, lessonId, type: resourceType });
        }
        setVersion(v => v + 1);
        setModalState({ isOpen: false, content: null });
    };

    const handleDelete = (contentId: string) => {
        const confirmAction = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            setConfirmModalState({ isOpen: false, onConfirm: null });
        };
        setConfirmModalState({ isOpen: true, onConfirm: confirmAction });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <resourceInfo.Icon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white capitalize">{resourceInfo.label}</h1>
                </div>
                {user.role === 'admin' && (
                    <button onClick={() => setModalState({ isOpen: true, content: null })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <PlusIcon className="w-5 h-5" /><span>Add New </span>
                    </button>
                )}
            </div>

            {isLoading && <div className="text-center py-10">Loading content...</div>}
            
            {!isLoading && contentItems.length > 0 && (
                <div className="space-y-4">
                    {contentItems.map(item => <ContentCard key={item._id} item={item} onEdit={(c) => setModalState({isOpen: true, content: c})} onDelete={handleDelete} isAdmin={user.role === 'admin'} />)}
                </div>
            )}
            
            {!isLoading && contentItems.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <resourceInfo.Icon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No {resourceInfo.label.toLowerCase()} available for this chapter.</p>
                </div>
            )}

            <ContentModal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, content: null })} onSave={handleSave} contentToEdit={modalState.content} resourceType={resourceType} />
            <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })} onConfirm={confirmModalState.onConfirm} title={`Delete ${resourceInfo.label}`} message={`Are you sure you want to delete this ${resourceInfo.label.toLowerCase()}?`} />
        </div>
    );
};