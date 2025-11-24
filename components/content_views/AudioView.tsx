import React, { useState, useEffect } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { AudioIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';

interface AudioViewProps {
    lessonId: string;
    user: User;
}

const SavedAudioViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean }> = ({ content, onRemove, isAdmin }) => {
    // Determine the audio source - use the content file serving endpoint
    const getAudioSrc = () => {
        if (content.filePath && content.body === '') {
            // Local file upload - use content-specific file serving endpoint
            return `/api/content/${content._id}/file`;
        } else if (content.body && content.body.startsWith('http')) {
            // External URL
            return content.body;
        } else if (content.body && content.body.startsWith('data:audio/')) {
            // Base64 audio data
            return content.body;
        } else if (content.body && content.body.trim() !== '') {
            // Other body content (external URL)
            return content.body;
        }
        // Fallback: return empty string if no valid source
        return '';
    };



    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative w-full">
            {isAdmin && (
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onRemove} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="Remove Audio">
                        <TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            )}
            <h2 className="text-xl font-semibold mb-4 pr-12 truncate">{content.title}</h2>
            
            <div className="w-full">
                <audio controls className="w-full" src={getAudioSrc()}>
                    Your browser does not support the audio element.
                </audio>
            </div>
        </div>
    );
};

const AddAudioForm: React.FC<{ lessonId: string; onAdd: () => void; onCancel: () => void; }> = ({ lessonId, onAdd, onCancel }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
    const [title, setTitle] = useState('Loading title...');
    const [folderPath, setFolderPath] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
    const [url, setUrl] = useState('');
    const { showToast } = useToast();

    // Optimized Path and Title Logic - Fast loading with minimal API calls
    useEffect(() => {
        const fetchTitleAndPath = async () => {
            try {
                console.log('=== FAST AUDIO PATH GENERATION START ===');
                
                // Strategy 1: Try breadcrumbs first (fastest for lessons)
                const breadcrumbs = await api.getBreadcrumbs(lessonId);
                if (breadcrumbs && breadcrumbs.trim()) {
                    const parts = breadcrumbs.split(' > ').filter(part => part.trim());
                    if (parts.length >= 2) {
                        const fileName = parts[parts.length - 1];
                        const hierarchyPath = parts.join('/');
                        const fullVirtualPath = `${hierarchyPath}/Audio/${fileName}.mp3`;
                        
                        console.log('Fast audio path from breadcrumbs:', fullVirtualPath);
                        setTitle(fileName);
                        setFolderPath(fullVirtualPath);
                        return;
                    }
                }
                
                console.log('Breadcrumbs failed, trying fast search...');
                
                // Strategy 2: Fast identification with minimal calls
                let foundLevel = false;
                let breadcrumbParts: string[] = [];
                let fileName = 'New Audio';
                
                // Get all classes first (usually just 2-3)
                const classes = await api.getClasses();
                
                // Try each class - parallel approach would be better but this is still fast
                for (const classItem of classes) {
                    const subjects = await api.getSubjectsByClassId(classItem._id);
                    
                    for (const subject of subjects) {
                        const units = await api.getUnitsBySubjectId(subject._id);
                        
                        // Check if lessonId matches any unit directly
                        const unit = units.find(u => u._id === lessonId);
                        if (unit) {
                            breadcrumbParts = [classItem.name, subject.name, unit.name];
                            fileName = unit.name;
                            foundLevel = true;
                            break;
                        }
                        
                        // Check subUnits
                        for (const unitItem of units) {
                            const subUnits = await api.getSubUnitsByUnitId(unitItem._id);
                            
                            const subUnit = subUnits.find(su => su._id === lessonId);
                            if (subUnit) {
                                breadcrumbParts = [classItem.name, subject.name, unitItem.name, subUnit.name];
                                fileName = subUnit.name;
                                foundLevel = true;
                                break;
                            }
                            
                            // Only check lessons if we haven't found it yet
                            if (!foundLevel) {
                                for (const subUnitItem of subUnits) {
                                    const lessons = await api.getLessonsBySubUnitId(subUnitItem._id);
                                    const lesson = lessons.find(l => l._id === lessonId);
                                    if (lesson) {
                                        // Should have been caught by breadcrumbs, but just in case
                                        breadcrumbParts = [classItem.name, subject.name, unitItem.name, subUnitItem.name, lesson.name];
                                        fileName = lesson.name;
                                        foundLevel = true;
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (foundLevel) break;
                    }
                    if (foundLevel) break;
                }
                
                // Generate final path
                if (foundLevel && breadcrumbParts.length > 0) {
                    const hierarchyPath = breadcrumbParts.join('/');
                    const fullVirtualPath = `${hierarchyPath}/Audio/${fileName}.mp3`;
                    
                    console.log('Fast audio path from search:', fullVirtualPath);
                    setTitle(fileName);
                    setFolderPath(fullVirtualPath);
                } else {
                    // Quick fallback
                    console.log('Quick audio fallback for:', lessonId);
                    const fallbackTitle = `Audio_${lessonId.slice(-4)}`;
                    const fallbackPath = `Class/Audio/${fallbackTitle}.mp3`;
                    
                    setTitle(fallbackTitle);
                    setFolderPath(fallbackPath);
                }
                
            } catch (e) {
                console.error('Fast audio path generation error:', e);
                setTitle('New Audio');
                setFolderPath('Default/Audio/New Audio.mp3');
            }
        };
        
        if (lessonId) {
            // No timeout delay for faster response
            fetchTitleAndPath();
        } else {
            setTitle('Select a lesson/unit first');
            setFolderPath('Audio/Pending Selection');
        }
    }, [lessonId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith('audio/')) {
            setFile(selectedFile);
            setError(null);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewDataUrl(reader.result as string);
            reader.readAsDataURL(selectedFile);
        } else {
            setError('Please select a valid audio file.');
            setFile(null);
            setPreviewDataUrl(null);
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
                
                // Use FormData for proper file upload
                const formData = new FormData();
                formData.append('file', file);
                formData.append('lessonId', lessonId);
                formData.append('type', 'audio');
                formData.append('title', title.trim());
                
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log('Audio uploaded successfully:', result);
            } else {
                // Handle URL-based audio
                if (!url.trim().startsWith('http')) { setError("Please enter a valid URL."); return; }
                
                await api.addContent({ 
                    title: title.trim(), 
                    body: url, 
                    lessonId, 
                    type: 'audio',
                    metadata: { category: 'External', subCategory: 'External Link' } as any 
                });
            }
            
            showToast('Audio added successfully', 'success');
            onAdd();
        } catch (err) { 
            console.error('Audio upload error:', err);
            setError(err instanceof Error ? err.message : "Failed to save audio. Please try again."); 
            showToast('Failed to save audio', 'error');
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
                    <input 
                        id="audioTitle" 
                        type="text" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        required 
                        className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                    />
                     <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono truncate" title={folderPath}>
                        Path: {folderPath}
                    </p>
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
                {previewDataUrl && activeTab === 'upload' && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview</label>
                        <audio controls src={previewDataUrl} className="w-full">Your browser does not support the audio element.</audio>
                     </div>
                )}
                {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                <div className="flex gap-4">
                    <button type="button" onClick={onCancel} className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors sm:w-full sm:px-4 sm:h-auto sm:justify-start">
                        <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="hidden sm:inline">Cancel</span>
                    </button>
                    <button type="submit" disabled={isSaving} className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors sm:w-full sm:px-4 sm:h-auto sm:justify-start">
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin sm:mr-2" />
                        ) : (
                            <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Audio'}</span>
                    </button>
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
    const { showToast } = useToast();

    const audioContents = groupedContent?.[0]?.docs || [];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const action = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion(v => v + 1);
                showToast('Audio deleted', 'error');
            } catch (e) {
                showToast('Failed to delete audio', 'error');
            }
            setConfirmModal({ isOpen: false, onConfirm: null });
        };
        setConfirmModal({ isOpen: true, onConfirm: action });
    };

    const handleAddSuccess = () => {
        setVersion(v => v + 1);
        setShowAddForm(false);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div className="flex items-center">
                    <AudioIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Audio</h1>
                </div>
                {canEdit && !showAddForm && (
                    <button onClick={() => setShowAddForm(true)} className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors sm:px-4 sm:w-auto sm:h-auto" title="Add New Audio">
                        <PlusIcon className="w-5 h-5" />
                        <span className="hidden sm:inline sm:ml-2">Add New</span>
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading && <div className="text-center py-10">Loading audio...</div>}
                
                {!isLoading && showAddForm && (
                    <AddAudioForm lessonId={lessonId} onAdd={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
                )}

                {!isLoading && !showAddForm && audioContents.length > 0 && (
                     <div className="flex flex-col gap-6 pb-6 w-full">
                        {audioContents.map(audio => (
                            <SavedAudioViewer key={audio._id} content={audio} onRemove={() => handleDelete(audio._id)} isAdmin={canEdit} />
                        ))}
                    </div>
                )}

                {!isLoading && !showAddForm && audioContents.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                        <AudioIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="mt-4 text-gray-500">
                            No audio available for this chapter.
                            {canEdit && " Click 'Add New Audio' to get started."}
                        </p>
                    </div>
                )}
            </div>
            
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })} onConfirm={confirmModal.onConfirm} title="Remove Audio" message="Are you sure you want to remove this audio file?" />
        </div>
    );
};