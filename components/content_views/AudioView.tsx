import React, { useState } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { AudioIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';

interface AudioViewProps {
    lessonId: string;
    user: User;
}

const SavedAudioViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean }> = ({ content, onRemove, isAdmin }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative">
        {isAdmin && (
            <div className="absolute top-4 right-4 z-10">
                <button onClick={onRemove} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="Remove Audio">
                    <TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
            </div>
        )}
        <h2 className="text-xl font-semibold mb-4 pr-12 truncate">{content.title}</h2>
        <div className="w-full">
            <audio controls className="w-full" src={content.body}>
                Your browser does not support the audio element.
            </audio>
        </div>
    </div>
);

const AddAudioForm: React.FC<{ lessonId: string; onAdd: () => void; onCancel: () => void; }> = ({ lessonId, onAdd, onCancel }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith('audio/')) {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Please select a valid audio file.');
            setFile(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || !title.trim()) { setError("Please provide a title."); return; }
        
        setIsSaving(true);
        setError(null);
        
        try {
            if (activeTab === 'upload') {
                if (!file) { setError("Please select a file to upload."); return; }
                
                // Use the proper file upload system
                await api.uploadFile(file, lessonId, title.trim(), 'audio');
            } else {
                if (!url.trim().startsWith('http')) { setError("Please enter a valid URL."); return; }
                
                // For URL-based audio, create content directly with the URL
                await api.addContent({ 
                    title: title.trim(), 
                    body: url.trim(), 
                    lessonId, 
                    type: 'audio' 
                });
            }
            
            onAdd();
        } catch (err) {
            console.error('Audio upload error:', err);
            setError("Failed to save audio. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto bg-white dark:bg-gray-800/50 p-8 rounded-lg shadow-md mt-6">
            <h3 className="text-lg font-semibold text-center mb-6 text-gray-800 dark:text-white">Add New Audio</h3>
            <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'upload' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Upload File</button>
                <button onClick={() => setActiveTab('url')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'url' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Add from URL</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label htmlFor="audioTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Audio Title</label>
                    <input id="audioTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"/>
                </div>
                {activeTab === 'upload' && (
                    <div>
                        <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Audio File</label>
                        <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md"><div className="space-y-1 text-center"><UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400"/><div className="flex text-sm text-gray-600 dark:text-gray-400"><label htmlFor="audioFile" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500"><span>{file ? 'Change file' : 'Upload an audio file'}</span><input id="audioFile" name="audioFile" type="file" className="sr-only" onChange={handleFileChange} accept="audio/*" /></label></div><p className="text-xs text-gray-500 dark:text-gray-500">{file ? file.name : 'MP3, WAV, etc.'}</p></div></div>
                    </div>
                )}
                {activeTab === 'url' && (
                    <div>
                        <label htmlFor="audioUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Audio URL</label>
                        <input id="audioUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://example.com/audio.mp3" className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"/>
                    </div>
                )}
                {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                <div className="flex gap-4">
                    <button type="button" onClick={onCancel} className="w-full px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" disabled={isSaving} className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'Save Audio'}</button>
                </div>
            </form>
        </div>
    );
};

export const AudioView: React.FC<AudioViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['audio']), [lessonId, version]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [showAddForm, setShowAddForm] = useState(false);

    const audioContents = groupedContent?.[0]?.docs || [];

    const handleDelete = (contentId: string) => {
        const action = async () => {
            await api.deleteContent(contentId);
            setVersion(v => v + 1);
            setConfirmModal({ isOpen: false, onConfirm: null });
        };
        setConfirmModal({ isOpen: true, onConfirm: action });
    };

    const handleAddSuccess = () => {
        setVersion(v => v + 1);
        setShowAddForm(false);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <AudioIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Audio</h1>
                </div>
                {user.role === 'admin' && !showAddForm && (
                    <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <PlusIcon className="w-5 h-5" />
                        <span>Add New Audio</span>
                    </button>
                )}
            </div>
            
            {isLoading && <div className="text-center py-10">Loading audio...</div>}
            
            {!isLoading && showAddForm && (
                <AddAudioForm lessonId={lessonId} onAdd={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
            )}

            {!isLoading && !showAddForm && audioContents.length > 0 && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {audioContents.map(audio => (
                        <SavedAudioViewer key={audio._id} content={audio} onRemove={() => handleDelete(audio._id)} isAdmin={user.role === 'admin'} />
                    ))}
                </div>
            )}

            {!isLoading && !showAddForm && audioContents.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <AudioIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">
                        No audio available for this chapter.
                        {user.role === 'admin' && " Click 'Add New Audio' to get started."}
                    </p>
                </div>
            )}
            
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })} onConfirm={confirmModal.onConfirm} title="Remove Audio" message="Are you sure you want to remove this audio file?" />
        </div>
    );
};
