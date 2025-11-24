import React, { useState, useEffect } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { VideoIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';
import { useToast } from '../../context/ToastContext';

interface VideoViewProps {
    lessonId: string;
    user: User;
}

// ... (getYouTubeEmbedUrl and SavedVideoViewer remain same)
const getYouTubeEmbedUrl = (raw: string | undefined | null): string | null => {
    if (!raw) return null;
    const url = raw.trim();

    // Quick check to avoid parsing non-URLs (like file paths)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return null;
    }

    if (url.includes('youtube.com/embed/')) {
        return url;
    }
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        let videoId: string | null = null;
        if (host === 'youtu.be') {
            videoId = u.pathname.split('/')[1] || null;
            if (videoId) videoId = videoId.split('?')[0].split('/')[0];
        }
        else if (host.includes('youtube.com')) {
            if (u.pathname === '/watch') videoId = u.searchParams.get('v');
            else if (u.pathname.startsWith('/shorts/')) videoId = u.pathname.split('/')[2] || null;
            else if (u.pathname.startsWith('/embed/')) videoId = u.pathname.split('/')[2] || null;
            else if (u.pathname.startsWith('/v/')) videoId = u.pathname.split('/')[2] || null;
        }

        if (videoId) {
            videoId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
            return `https://www.youtube.com/embed/${videoId}?rel=0`;
        }
        return null;
    } catch (error) {
        // Silent failure for invalid URLs
        return null;
    }
};

const SavedVideoViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; }> = ({ content, onRemove, isAdmin }) => {
    const [videoError, setVideoError] = useState(false);
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setVideoError(false);
        setLoading(true);
        const body = (content.body || '').trim();
        const generatedEmbed = getYouTubeEmbedUrl(body);
        if (generatedEmbed) setEmbedUrl(generatedEmbed);
        else {
            const isHttpUrl = /^https?:\/\//i.test(body);
            const isDataUrl = body.startsWith('data:video/');
            if (!isHttpUrl && !isDataUrl) setEmbedUrl(null);
        }
        setLoading(false);
    }, [content]);

    const body = (content.body || '').trim();
    const isYouTube = !!embedUrl;

    let directVideoUrl: string | null = null;
    if (!isYouTube) {
        if (content.filePath) {
            directVideoUrl = `/api/content/${content._id}/file`;
        } else if (body.startsWith('http') || body.startsWith('data:video/')) {
            directVideoUrl = body;
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative flex flex-col h-full">
            {isAdmin && (
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onRemove} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md transition-colors" title="Remove Video">
                        <TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            )}
            <h2 className="text-xl font-semibold mb-4 pr-12 truncate shrink-0 text-gray-800 dark:text-white">{content.title}</h2>

            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-inner">
                {loading && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                )}
                {isYouTube && embedUrl && (
                    <iframe key={embedUrl} src={embedUrl} className="w-full h-full" title={content.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onError={() => setVideoError(true)} />
                )}
                {isYouTube && videoError && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gray-200 dark:bg-gray-700">
                        <p className="text-red-600 dark:text-red-400 font-semibold">Error loading YouTube video</p>
                        <a href={body} target="_blank" rel="noopener noreferrer" className="mt-2 text-blue-600 hover:underline">Watch on YouTube</a>
                    </div>
                )}
                {directVideoUrl && (
                    <video src={directVideoUrl} controls className="w-full h-full" onError={() => setVideoError(true)}>Your browser does not support the video tag.</video>
                )}
                {!isYouTube && !directVideoUrl && !loading && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gray-200 dark:bg-gray-700">
                        <VideoIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 font-semibold">Invalid video data</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AddVideoForm: React.FC<{ lessonId: string; onAdd: () => void; onCancel: () => void; }> = ({ lessonId, onAdd, onCancel }) => {
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
                console.log('=== FAST VIDEO PATH GENERATION START ===');

                // Strategy 1: Try breadcrumbs first (fastest for lessons)
                const breadcrumbs = await api.getBreadcrumbs(lessonId);
                if (breadcrumbs && breadcrumbs.trim()) {
                    const parts = breadcrumbs.split(' > ').filter(part => part.trim());
                    if (parts.length >= 2) {
                        const fileName = parts[parts.length - 1];
                        const hierarchyPath = parts.join('/');
                        const fullVirtualPath = `${hierarchyPath}/Video/${fileName}.mp4`;

                        console.log('Fast video path from breadcrumbs:', fullVirtualPath);
                        setTitle(fileName);
                        setFolderPath(fullVirtualPath);
                        return;
                    }
                }

                console.log('Breadcrumbs failed, trying fast search...');

                // Strategy 2: Fast identification with minimal calls
                let foundLevel = false;
                let breadcrumbParts: string[] = [];
                let fileName = 'New Video';

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
                    const fullVirtualPath = `${hierarchyPath}/Video/${fileName}.mp4`;

                    console.log('Fast video path from search:', fullVirtualPath);
                    setTitle(fileName);
                    setFolderPath(fullVirtualPath);
                } else {
                    // Quick fallback
                    console.log('Quick video fallback for:', lessonId);
                    const fallbackTitle = `Video_${lessonId.slice(-4)}`;
                    const fallbackPath = `Class/Video/${fallbackTitle}.mp4`;

                    setTitle(fallbackTitle);
                    setFolderPath(fallbackPath);
                }

            } catch (e) {
                console.error('Fast video path generation error:', e);
                setTitle('New Video');
                setFolderPath('Default/Video/New Video.mp4');
            }
        };

        if (lessonId) {
            // No timeout delay for faster response
            fetchTitleAndPath();
        } else {
            setTitle('Select a lesson/unit first');
            setFolderPath('Videos/Pending Selection');
        }
    }, [lessonId]);

    // Cleanup object URL on unmount or change
    useEffect(() => {
        return () => {
            if (previewDataUrl && previewDataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewDataUrl);
            }
        };
    }, [previewDataUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith('video/')) {
            setFile(selectedFile);
            setError(null);
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreviewDataUrl(objectUrl);
        } else {
            showToast('Please select a valid video file.', 'error');
            setFile(null);
            setPreviewDataUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving || !title.trim()) { setError("Please provide a title."); return; }

        let body = '';
        let fullPath = folderPath;

        if (activeTab === 'upload') {
            if (!file) { setError("Please select a file to upload."); return; }

            setIsSaving(true);
            setError(null);

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('lessonId', lessonId);
                formData.append('type', 'video');
                formData.append('title', title.trim());
                formData.append('metadata', JSON.stringify({ category: 'Custom', subCategory: fullPath }));

                await api.uploadFile(formData);
                showToast('Video uploaded successfully!', 'success');
                onAdd();
            } catch (err: any) {
                console.error('Upload error:', err);
                setError(err.message || "Failed to upload video.");
                showToast('Failed to upload video.', 'error');
            } finally {
                setIsSaving(false);
            }
            return;
        } else {
            const embed = getYouTubeEmbedUrl(url);
            if (!embed) {
                setError("Please enter a valid YouTube URL.");
                showToast('Invalid YouTube URL', 'error');
                return;
            }
            body = url;
            fullPath = 'External Link';
        }

        setIsSaving(true);
        setError(null);
        try {
            await api.addContent({
                title: title.trim(),
                body,
                lessonId,
                type: 'video',
                metadata: { category: 'Custom', subCategory: fullPath } as any
            });
            showToast('Video added successfully!', 'success');
            onAdd();
        } catch (err) {
            setError("Failed to save video. Please try again.");
            showToast('Failed to save video.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800/50 p-8 rounded-lg shadow-md mt-6">
            <h3 className="text-lg font-semibold text-center mb-6 text-gray-800 dark:text-white">Add New Video</h3>
            <div className="mb-6 flex border-b border-gray-200 dark:border-gray-700">
                <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'upload' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Upload File</button>
                <button onClick={() => setActiveTab('url')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'url' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Add from URL</button>
            </div>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                    <div>
                        <label htmlFor="videoTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video Title</label>
                        <input
                            id="videoTitle"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono truncate" title={folderPath}>
                            Path: {folderPath}
                        </p>
                    </div>
                    {activeTab === 'upload' && (
                        <div>
                            <label htmlFor="videoFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video File</label>
                            <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                        <label htmlFor="videoFile" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500">
                                            <span>{file ? 'Change file' : 'Upload a file'}</span>
                                            <input
                                                id="videoFile"
                                                name="videoFile"
                                                type="file"
                                                className="sr-only"
                                                onChange={handleFileChange}
                                                accept="video/*"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        {file ? file.name : 'MP4, WebM, etc.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'url' && (
                        <div>
                            <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">YouTube URL</label>
                            <input
                                id="videoUrl"
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                                className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    )}
                    {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors sm:w-full sm:px-4 sm:h-auto sm:justify-start"
                        >
                            <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="hidden sm:inline">Cancel</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors sm:w-full sm:px-4 sm:h-auto sm:justify-start"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin sm:mr-2" />
                            ) : (
                                <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Video'}</span>
                        </button>
                    </div>
                </div>
                <div className="h-full flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview</label>
                    <div className="aspect-video w-full bg-black rounded-lg border dark:border-gray-600 overflow-hidden shadow-inner">
                        {activeTab === 'upload' && previewDataUrl && (
                            <video src={previewDataUrl} controls className="w-full h-full" />
                        )}
                        {activeTab === 'url' && url && getYouTubeEmbedUrl(url) && (
                            <iframe
                                src={getYouTubeEmbedUrl(url) || ''}
                                className="w-full h-full"
                                title="YouTube Preview"
                                allowFullScreen
                            />
                        )}
                        {((activeTab === 'upload' && !previewDataUrl) || (activeTab === 'url' && !url || !getYouTubeEmbedUrl(url))) && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <VideoIcon className="w-12 h-12 mb-2" />
                                <p>Video preview will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export const VideoView: React.FC<VideoViewProps> = ({ lessonId, user }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['video']), [lessonId, version]);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; onConfirm: (() => void) | null; }>({ isOpen: false, onConfirm: null, });
    const [showAddForm, setShowAddForm] = useState(false);
    const { showToast } = useToast();

    const videoContents: Content[] = groupedContent?.[0]?.docs || [];
    const canEdit = user.role === 'admin' || !!user.canEdit;

    const handleDelete = (contentId: string) => {
        const action = async () => {
            try {
                await api.deleteContent(contentId);
                setVersion((v) => v + 1);
                showToast('Video deleted successfully', 'success');
            } catch (e) {
                showToast('Failed to delete video', 'error');
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
                    <VideoIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">Video</h1>
                </div>
                {canEdit && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors sm:px-4 sm:w-auto sm:h-auto"
                        title="Add New Video"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span className="hidden sm:inline sm:ml-2">Add New</span>
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading && <div className="text-center py-10">Loading videos...</div>}

                {!isLoading && showAddForm && (
                    <AddVideoForm
                        lessonId={lessonId}
                        onAdd={handleAddSuccess}
                        onCancel={() => setShowAddForm(false)}
                    />
                )}

                {!isLoading && !showAddForm && videoContents.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                        {videoContents.map(video => (
                            <SavedVideoViewer
                                key={video._id}
                                content={video}
                                onRemove={() => handleDelete(video._id)}
                                isAdmin={canEdit}
                            />
                        ))}
                    </div>
                )}

                {!isLoading && !showAddForm && videoContents.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                        <VideoIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="mt-4 text-gray-500">
                            No videos available for this chapter.
                            {canEdit && " Click 'Add New Video' to get started."}
                        </p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })}
                onConfirm={confirmModal.onConfirm}
                title="Remove Video"
                message="Are you sure you want to remove this video?"
            />
        </div>
    );
};