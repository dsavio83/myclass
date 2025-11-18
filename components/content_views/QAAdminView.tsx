import React, { useState, useEffect, useMemo } from 'react';
import { Content, QAMetadata, CognitiveProcess, QuestionType, QuestionMarks } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QAIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, EditIcon, TrashIcon } from '../icons/AdminIcons';

interface QAAdminViewProps {
    lessonId: string;
}

interface QAEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    qaItem: (Content & { metadata?: QAMetadata }) | null;
    onSave: (data: { title: string; body: string; metadata: QAMetadata }) => void;
}

const COGNITIVE_PROCESSES: { value: CognitiveProcess; label: string }[] = [
    { value: 'CP1', label: 'CP1 - Conceptual Clarity' },
    { value: 'CP2', label: 'CP2 - Application Skill' },
    { value: 'CP3', label: 'CP3 - Computational Thinking' },
    { value: 'CP4', label: 'CP4 - Analytical Thinking' },
    { value: 'CP5', label: 'CP5 - Critical Thinking' },
    { value: 'CP6', label: 'CP6 - Creative Thinking' },
    { value: 'CP7', label: 'CP7 - Values/Attitudes' },
];

const QUESTION_TYPES: QuestionType[] = ['Basic', 'Average', 'Profound'];
const MARKS_OPTIONS: QuestionMarks[] = [2, 3, 5, 6];

const QAEditorModal: React.FC<QAEditorModalProps> = ({ isOpen, onClose, qaItem, onSave }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [marks, setMarks] = useState<QuestionMarks>(2);
    const [cognitiveProcess, setCognitiveProcess] = useState<CognitiveProcess>('CP1');
    const [questionType, setQuestionType] = useState<QuestionType>('Basic');

    useEffect(() => {
        if (qaItem) {
            setQuestion(qaItem.title || '');
            setAnswer(qaItem.body || '');
            setMarks(qaItem.metadata?.marks || 2);
            setCognitiveProcess(qaItem.metadata?.cognitiveProcess || 'CP1');
            setQuestionType(qaItem.metadata?.questionType || 'Basic');
        } else {
            setQuestion('');
            setAnswer('');
            setMarks(2);
            setCognitiveProcess('CP1');
            setQuestionType('Basic');
        }
    }, [qaItem]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!question.trim() || !answer.trim()) {
            alert('Both question and answer are required');
            return;
        }
        onSave({
            title: question,
            body: answer,
            metadata: { marks, cognitiveProcess, questionType }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{qaItem ? 'Edit' : 'Add New'}</h2>
                
                {/* Metadata Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Marks</label>
                        <select
                            value={marks}
                            onChange={(e) => setMarks(Number(e.target.value) as QuestionMarks)}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {MARKS_OPTIONS.map(m => (
                                <option key={m} value={m}>{m} marks</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold mb-2">Cognitive Process</label>
                        <select
                            value={cognitiveProcess}
                            onChange={(e) => setCognitiveProcess(e.target.value as CognitiveProcess)}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {COGNITIVE_PROCESSES.map(cp => (
                                <option key={cp.value} value={cp.value}>{cp.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold mb-2">Question Type</label>
                        <select
                            value={questionType}
                            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        >
                            {QUESTION_TYPES.map(qt => (
                                <option key={qt} value={qt}>{qt}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Question */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">Question</label>
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        rows={6}
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
                        placeholder="Enter the question here... (You can use basic HTML or LaTeX)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Tip: Use LaTeX for formulas: \( x^2 + y^2 = z^2 \) or \[ E = mc^2 \]
                    </p>
                </div>

                {/* Answer */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">Answer</label>
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        rows={6}
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
                        placeholder="Enter the answer here... (You can use basic HTML or LaTeX)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Tip: Use LaTeX for formulas: \( x^2 + y^2 = z^2 \) or \[ E = mc^2 \]
                    </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                </div>
            </div>
        </div>
    );
};

const getTypeColor = (type: QuestionType): string => {
    switch (type) {
        case 'Basic': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'Average': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'Profound': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
};

const getCPColor = (cp: CognitiveProcess): string => {
    const colors: Record<CognitiveProcess, string> = {
        'CP1': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'CP2': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        'CP3': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
        'CP4': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        'CP5': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        'CP6': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
        'CP7': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    };
    return colors[cp];
};

const getMarksColor = (marks: QuestionMarks): string => {
    switch (marks) {
        case 2: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 3: return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300';
        case 5: return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300';
        case 6: return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
    }
};

export const QAAdminView: React.FC<QAAdminViewProps> = ({ lessonId }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['qa']), [lessonId, version]);
    
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [editingQA, setEditingQA] = useState<(Content & { metadata?: QAMetadata }) | null>(null);
    
    // Filters
    const [filterMarks, setFilterMarks] = useState<QuestionMarks | 'All'>('All');
    const [filterCP, setFilterCP] = useState<CognitiveProcess | 'All'>('All');
    const [filterType, setFilterType] = useState<QuestionType | 'All'>('All');

    const qaItems = useMemo(() => groupedContent?.[0]?.docs || [], [groupedContent]);

    const filteredQAItems = useMemo(() => {
        return qaItems.filter(item => {
            const metadata = item.metadata as QAMetadata | undefined;
            if (!metadata) return false;
            
            if (filterMarks !== 'All' && metadata.marks !== filterMarks) return false;
            if (filterCP !== 'All' && metadata.cognitiveProcess !== filterCP) return false;
            if (filterType !== 'All' && metadata.questionType !== filterType) return false;
            
            return true;
        });
    }, [qaItems, filterMarks, filterCP, filterType]);

    const handleAddQA = () => {
        setEditingQA(null);
        setIsEditorModalOpen(true);
    };

    const handleEditQA = (qa: Content) => {
        setEditingQA(qa as Content & { metadata?: QAMetadata });
        setIsEditorModalOpen(true);
    };

    const handleDeleteQA = async (qaId: string) => {
        if (confirm('Are you sure you want to delete this Q&A?')) {
            await api.deleteContent(qaId);
            setVersion(v => v + 1);
        }
    };

    const handleSaveQA = async (data: { title: string; body: string; metadata: QAMetadata }) => {
        if (editingQA) {
            await api.updateContent(editingQA._id, data);
        } else {
            await api.addContent({ ...data, lessonId, type: 'qa' });
        }
        setVersion(v => v + 1);
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading Q&A...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <QAIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Q&A Management</h1>
                </div>
                <button
                    onClick={handleAddQA}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add New</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
                <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Marks</label>
                        <select
                            value={filterMarks}
                            onChange={(e) => setFilterMarks(e.target.value === 'All' ? 'All' : Number(e.target.value) as QuestionMarks)}
                            className="w-full p-2 text-sm border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="All">All Marks</option>
                            {MARKS_OPTIONS.map(m => (
                                <option key={m} value={m}>{m} marks</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Cognitive Process</label>
                        <select
                            value={filterCP}
                            onChange={(e) => setFilterCP(e.target.value as CognitiveProcess | 'All')}
                            className="w-full p-2 text-sm border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="All">All Processes</option>
                            {COGNITIVE_PROCESSES.map(cp => (
                                <option key={cp.value} value={cp.value}>{cp.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Question Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as QuestionType | 'All')}
                            className="w-full p-2 text-sm border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        >
                            <option value="All">All Types</option>
                            {QUESTION_TYPES.map(qt => (
                                <option key={qt} value={qt}>{qt}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Q&A List */}
            {filteredQAItems.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <QAIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">
                        {qaItems.length === 0 ? 'No Q&A yet. Add your first question!' : 'No Q&A match the selected filters.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredQAItems.map((item, index) => {
                        const metadata = item.metadata as QAMetadata;
                        return (
                            <div key={item._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                                <div className="p-4 border-b dark:border-gray-700">
                                    <div className="flex justify-between items-start gap-4 mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Q{index + 1}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getMarksColor(metadata.marks)}`}>
                                                    {metadata.marks} marks
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCPColor(metadata.cognitiveProcess)}`}>
                                                    {metadata.cognitiveProcess}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(metadata.questionType)}`}>
                                                    {metadata.questionType}
                                                </span>
                                            </div>
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <strong>Q:</strong> <span dangerouslySetInnerHTML={{ __html: item.title || '' }} />
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditQA(item)}
                                                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md"
                                                title="Edit"
                                            >
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQA(item._id)}
                                                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <strong>A:</strong> <span dangerouslySetInnerHTML={{ __html: item.body }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <QAEditorModal
                isOpen={isEditorModalOpen}
                onClose={() => setIsEditorModalOpen(false)}
                qaItem={editingQA}
                onSave={handleSaveQA}
            />
        </div>
    );
};
