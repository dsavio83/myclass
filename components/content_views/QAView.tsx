import React, { useState } from 'react';
import { Content, User, ResourceType } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QAIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon, ChevronRightIcon } from '../icons/AdminIcons';
import { ContentModal } from '../ContentModal';
import { ConfirmModal } from '../ConfirmModal';

interface QAViewProps {
    lessonId: string;
    user: User;
}

const QACard: React.FC<{ item: Content; }> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-4 flex justify-between items-center cursor-pointer">
                <h3 className="font-semibold text-gray-800 dark:text-white">{item.title}</h3>
                <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </div>
            {isOpen && (
                <div className="p-4 border-t dark:border-gray-700">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: item.body }} />
                </div>
            )}
        </div>
    );
};

export const QAView: React.FC<QAViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['qa']), [lessonId, version]);
    
    const [modalState, setModalState] = useState<{ isOpen: boolean; content: Content | null }>({ isOpen: false, content: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });

    const qaItems = groupedContent?.[0]?.docs || [];
    const resourceType: ResourceType = 'qa';

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
                    <QAIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Q&A</h1>
                </div>
            </div>

            {isLoading && <div className="text-center py-10">Loading Q&A...</div>}

            {!isLoading && qaItems.length > 0 && (
                <div className="space-y-4">
                    {qaItems.map(item => <QACard key={item._id} item={item} />)}
                </div>
            )}
            
            {!isLoading && qaItems.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <QAIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No Q&A available for this chapter.</p>
                </div>
            )}

            <ContentModal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, content: null })} onSave={handleSave} contentToEdit={modalState.content} resourceType={resourceType} />
            <ConfirmModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, onConfirm: null })} onConfirm={confirmModalState.onConfirm} title="Delete" message="Are you sure you want to delete this Question & Answer?" />
        </div>
    );
};
