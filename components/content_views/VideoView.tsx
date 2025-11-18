import React from 'react';
import { useState, useEffect } from 'react';
import { Content, User } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { VideoIcon } from '../icons/ResourceTypeIcons';
import { TrashIcon, UploadCloudIcon, PlusIcon } from '../icons/AdminIcons';
import { ConfirmModal } from '../ConfirmModal';

interface VideoViewProps {
    lessonId: string;
    user: User;
}

const getYouTubeEmbedUrl = (raw: string | undefined | null): string | null => {
    if (!raw) return null;
    const url = raw.trim();
    if (url.startsWith('https://www.youtube.com/embed/')) return url;
    try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, '');
        let videoId: string | null = null;
        if (host === 'youtu.be') videoId = u.pathname.slice(1) || null;
        else if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (u.pathname === '/watch') videoId = u.searchParams.get('v');
            else if (u.pathname.startsWith('/shorts/')) videoId = u.pathname.split('/')[2] || null;
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    } catch { return null; }
};

const SavedVideoViewer: React.FC<{ content: Content; onRemove: () => void; isAdmin: boolean; }> = ({ content, onRemove, isAdmin }) => {
    const [videoError, setVideoError] = useState(false);
    useEffect(() => { setVideoError(false); }, [content]);

    const body = (content.body || '').trim();
    const isHttpUrl = /^https?:\/\//i.test(body);
    const youTubeEmbedUrl = isHttpUrl ? getYouTubeEmbedUrl(body) : null;
    const isYouTube = !!youTubeEmbedUrl;
    const directVideoUrl = !isYouTube ? body : null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative">
            {isAdmin && (
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onRemove} className="p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white/80 dark:hover:bg-black/80 backdrop-blur-sm shadow-md" title="Remove Video">
                        <TrashIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            )}
            <h2 className="text-xl font-semibold mb-4 pr-12 truncate">{content.title}</h2>
            <div className="aspect-video w-full bg-black rounded overflow-hidden">
                {isYouTube && youTubeEmbedUrl ? (
                    <iframe src={youTubeEmbedUrl} className="w-full h-full" title={content.title} allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
                ) : directVideoUrl ? (
                    videoError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gray-200 dark:bg-gray-700">
                            <p className="text-red-600 dark:text-red-400 font-semibold">Could not load video.</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">The link may be broken.</p>
                        </div>
                    ) : (
                        <video src={directVideoUrl} controls className="w-full h-full" onError={() => setVideoError(true)}>Your browser does not support the video tag.</video>
                    )
                ) : (
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
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [url, setUrl] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith('video/')) {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Please select a valid video file.');
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
                await api.uploadFile(file, lessonId, title.trim(), 'video');
            } else {
                if (!getYouTubeEmbedUrl(url)) { setError("Please enter a valid YouTube URL."); return; }
                await api.addContent({ title: title.trim(), body: url, lessonId, type: 'video' });
            }
            onAdd();
        } catch (err) { setError("Failed to save video. Please try again."); } finally { setIsSaving(false); }
    };

    const previewEmbedUrl = getYouTubeEmbedUrl(url);

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
                        <input id="videoTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"/>
                    </div>
                    {activeTab === 'upload' && (
                        <div>
                            <label htmlFor="videoFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Video File</label>
                            <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md"><div className="space-y-1 text-center"><UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400"/><div className="flex text-sm text-gray-600 dark:text-gray-400"><label htmlFor="videoFile" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500"><span>{file ? 'Change file' : 'Upload a file'}</span><input id="videoFile" name="videoFile" type="file" className="sr-only" onChange={handleFileChange} accept="video/*" /></label></div><p className="text-xs text-gray-500 dark:text-gray-500">{file ? file.name : 'MP4, WebM, etc.'}</p></div></div>
                        </div>
                    )}
                    {activeTab === 'url' && (
                        <div>
                            <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">YouTube URL</label>
                            <input id="videoUrl" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://www.youtube.com/watch?v=..." className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"/>
                        </div>
                    )}
                    {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                    <div className="flex gap-4">
                         <button type="button" onClick={onCancel} className="w-full px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={isSaving} className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'Save Video'}</button>
                    </div>
                </div>
                <div className="h-full">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview</label>
                     <div className="aspect-video w-full bg-black rounded border dark:border-gray-600">
                        {activeTab === 'url' && previewEmbedUrl && <iframe src={previewEmbedUrl} className="w-full h-full" title="YouTube Preview" allowFullScreen />}
                        {activeTab === 'upload' && file && <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400"><VideoIcon className="w-12 h-12 mb-2" /><p>Video file ready: {file.name}</p></div>}
                        {!previewEmbedUrl && activeTab === 'url' && <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400"><VideoIcon className="w-12 h-12 mb-2" /><p>YouTube preview will appear here</p></div>}
                        {!file && activeTab === 'upload' && <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400"><VideoIcon className="w-12 h-12 mb-2" /><p>Video preview will appear here</p></div>}
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

    const videoContents: Content[] = groupedContent?.[0]?.docs || [];

    const handleDelete = (contentId: string) => {
        const action = async () => {
            await api.deleteContent(contentId);
            setVersion((v) => v + 1);
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
                    <VideoIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Video</h1>
                </div>
                 {user.role === 'admin' && !showAddForm && (
                    <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <PlusIcon className="w-5 h-5" />
                        <span>Add New Video</span>
                    </button>
                )}
            </div>
            
            {isLoading && <div className="text-center py-10">Loading videos...</div>}

            {!isLoading && showAddForm && (
                <AddVideoForm lessonId={lessonId} onAdd={handleAddSuccess} onCancel={() => setShowAddForm(false)} />
            )}

            {!isLoading && !showAddForm && videoContents.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {videoContents.map(video => (
                        <SavedVideoViewer key={video._id} content={video} onRemove={() => handleDelete(video._id)} isAdmin={user.role === 'admin'} />
                    ))}
                </div>
            )}

            {!isLoading && !showAddForm && videoContents.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <VideoIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">
                        No videos available for this chapter.
                        {user.role === 'admin' && " Click 'Add New Video' to get started."}
                    </p>
                </div>
            )}

            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, onConfirm: null })} onConfirm={confirmModal.onConfirm} title="Remove Video" message="Are you sure you want to remove this video?" />
        </div>
    );
};
