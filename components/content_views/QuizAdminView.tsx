import React, { useState, useEffect } from 'react';
import { Content, QuizQuestion, AnswerOption } from '../../types';
import { useApi } from '../../hooks/useApi';
import * as api from '../../services/api';
import { QuizIcon } from '../icons/ResourceTypeIcons';
import { PlusIcon, ImportIcon, EditIcon, TrashIcon } from '../icons/AdminIcons';

// Utility function to decode HTML entities and process text
const decodeAndProcessText = (text: string): string => {
    return text
        // Replace HTML entities
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/&nbsp;/g, ' ')
        // Replace smart quotes and other special characters
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/'/g, "'")
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Decode any remaining numeric HTML entities
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
};

// Recursive function to process all string values in an object
const processQuizData = (obj: any): any => {
    if (typeof obj === 'string') {
        return decodeAndProcessText(obj);
    } else if (Array.isArray(obj)) {
        return obj.map(processQuizData);
    } else if (obj !== null && typeof obj === 'object') {
        const processed: any = {};
        for (const [key, value] of Object.entries(obj)) {
            processed[key] = processQuizData(value);
        }
        return processed;
    }
    return obj;
};

interface QuizAdminViewProps {
    lessonId: string;
}

const ImportQuizModal: React.FC<{ isOpen: boolean; onClose: () => void; onImport: (json: string) => void; }> = ({ isOpen, onClose, onImport }) => {
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    if (!isOpen) return null;

    const handleImport = () => {
        try {
            setIsProcessing(true);
            setError('');
            
            // First, process the text to decode HTML entities and replace quotes
            const processedText = decodeAndProcessText(jsonText);
            
            // Parse the JSON
            const parsed = JSON.parse(processedText);
            if (!Array.isArray(parsed)) throw new Error("Input must be a JSON array.");
            
            // Process all the data recursively to decode HTML entities and clean text
            const processedData = processQuizData(parsed);
            
            // Convert back to JSON string and pass to parent
            onImport(JSON.stringify(processedData));
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid JSON format.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4">Import Quiz</h2>
                <div className="mb-4 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Paste your quiz questions as a JSON array. The system will automatically:
                    </p>
                    <ul className="text-xs text-gray-500 dark:text-gray-400 ml-4 space-y-1">
                        <li>• Replace " and ' with proper quotes</li>
                        <li>• Decode HTML entities (&lt;, &gt;, etc.)</li>
                        <li>• Remove HTML tags</li>
                        <li>• Process smart quotes and special characters</li>
                    </ul>
                </div>
                <textarea
                    value={jsonText}
                    onChange={(e) => { setJsonText(e.target.value); setError(''); }}
                    rows={15}
                    className="w-full p-2 border rounded-md font-mono text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                    placeholder={`[{"question": "What is 2+2?", "answerOptions": [...], "hint": "..."}]`}
                />
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="flex justify-end gap-4 mt-4">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={isProcessing || !jsonText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
                    >
                        {isProcessing && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {isProcessing ? 'Processing...' : 'Import'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface QuestionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    question: QuizQuestion | null;
    onSave: (question: QuizQuestion) => void;
}

const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({ isOpen, onClose, question, onSave }) => {
    const [editedQuestion, setEditedQuestion] = useState<QuizQuestion>(
        question || {
            question: '',
            answerOptions: [
                { text: '', isCorrect: false, rationale: '' },
                { text: '', isCorrect: false, rationale: '' },
                { text: '', isCorrect: false, rationale: '' },
                { text: '', isCorrect: false, rationale: '' }
            ],
            hint: ''
        }
    );

    useEffect(() => {
        if (question) {
            setEditedQuestion(question);
        }
    }, [question]);

    if (!isOpen) return null;

    const handleOptionChange = (index: number, field: keyof AnswerOption, value: string | boolean) => {
        const newOptions = [...editedQuestion.answerOptions];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setEditedQuestion({ ...editedQuestion, answerOptions: newOptions });
    };

    const handleAddOption = () => {
        setEditedQuestion({
            ...editedQuestion,
            answerOptions: [...editedQuestion.answerOptions, { text: '', isCorrect: false, rationale: '' }]
        });
    };

    const handleRemoveOption = (index: number) => {
        if (editedQuestion.answerOptions.length > 2) {
            const newOptions = editedQuestion.answerOptions.filter((_, i) => i !== index);
            setEditedQuestion({ ...editedQuestion, answerOptions: newOptions });
        }
    };

    const handleSave = () => {
        // Validation
        if (!editedQuestion.question.trim()) {
            alert('Question text is required');
            return;
        }
        if (editedQuestion.answerOptions.some(opt => !opt.text.trim())) {
            alert('All answer options must have text');
            return;
        }
        if (!editedQuestion.answerOptions.some(opt => opt.isCorrect)) {
            alert('At least one answer must be marked as correct');
            return;
        }
        onSave(editedQuestion);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{question ? 'Edit Question' : 'Add New Question'}</h2>
                
                {/* Question Text */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">Question</label>
                    <textarea
                        value={editedQuestion.question}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
                        rows={3}
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Enter your question here..."
                    />
                </div>

                {/* Answer Options */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-semibold">Answer Options</label>
                        <button
                            onClick={handleAddOption}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Add Option
                        </button>
                    </div>
                    
                    {editedQuestion.answerOptions.map((option, index) => (
                        <div key={index} className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="flex items-center pt-2">
                                    <input
                                        type="checkbox"
                                        checked={option.isCorrect}
                                        onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                                        className="w-5 h-5 text-green-600 rounded"
                                    />
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={option.text}
                                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                                        className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 mb-2"
                                        placeholder={`Option ${index + 1}`}
                                    />
                                    <textarea
                                        value={option.rationale}
                                        onChange={(e) => handleOptionChange(index, 'rationale', e.target.value)}
                                        rows={2}
                                        className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-sm"
                                        placeholder="Rationale (explanation for this answer)"
                                    />
                                </div>
                                {editedQuestion.answerOptions.length > 2 && (
                                    <button
                                        onClick={() => handleRemoveOption(index)}
                                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hint */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">Hint (Optional)</label>
                    <textarea
                        value={editedQuestion.hint}
                        onChange={(e) => setEditedQuestion({ ...editedQuestion, hint: e.target.value })}
                        rows={2}
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Provide a helpful hint for students..."
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Question</button>
                </div>
            </div>
        </div>
    );
};

export const QuizAdminView: React.FC<QuizAdminViewProps> = ({ lessonId }) => {
    const [version, setVersion] = useState(0);
    const { data: groupedContent, isLoading } = useApi(() => api.getContentsByLessonId(lessonId, ['quiz']), [lessonId, version]);
    
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
    const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

    useEffect(() => {
        const quizContent = groupedContent?.[0]?.docs?.[0];
        if (quizContent?.body) {
            try {
                // Process the text to decode HTML entities and replace quotes
                const processedText = decodeAndProcessText(quizContent.body.replace(/"/g, '"'));
                const parsedQuestions = JSON.parse(processedText);
                setQuestions(processQuizData(parsedQuestions));
            } catch (e) {
                console.error("Failed to parse quiz JSON:", e);
                setQuestions([]);
            }
        } else {
            setQuestions([]);
        }
    }, [groupedContent]);

    const saveQuestions = async (newQuestions: QuizQuestion[]) => {
        const quizContent = groupedContent?.[0]?.docs?.[0];
        const jsonString = JSON.stringify(newQuestions);
        
        if (quizContent) {
            await api.updateContent(quizContent._id, { body: jsonString });
        } else {
            await api.addContent({ lessonId, type: 'quiz', title: 'Chapter Quiz', body: jsonString });
        }
        setVersion(v => v + 1);
    };

    const handleImport = async (jsonString: string) => {
        const parsed = JSON.parse(jsonString);
        await saveQuestions(parsed);
    };

    const handleAddQuestion = () => {
        setEditingQuestionIndex(null);
        setIsEditorModalOpen(true);
    };

    const handleEditQuestion = (index: number) => {
        setEditingQuestionIndex(index);
        setIsEditorModalOpen(true);
    };

    const handleDeleteQuestion = async (index: number) => {
        if (confirm('Are you sure you want to delete this question?')) {
            const newQuestions = questions.filter((_, i) => i !== index);
            await saveQuestions(newQuestions);
        }
    };

    const handleSaveQuestion = async (question: QuizQuestion) => {
        let newQuestions: QuizQuestion[];
        if (editingQuestionIndex !== null) {
            newQuestions = [...questions];
            newQuestions[editingQuestionIndex] = question;
        } else {
            newQuestions = [...questions, question];
        }
        await saveQuestions(newQuestions);
    };

    const toggleQuestionExpanded = (index: number) => {
        const newExpanded = new Set(expandedQuestions);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedQuestions(newExpanded);
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading Quiz...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    <QuizIcon className="w-8 h-8 mr-3 text-blue-500" />
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Quiz Management</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        <ImportIcon className="w-5 h-5" />
                        <span>Import Quiz</span>
                    </button>
                    <button
                        onClick={handleAddQuestion}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Add Question</span>
                    </button>
                </div>
            </div>

            {questions.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-lg">
                    <QuizIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500">No quiz questions yet. Add your first question!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {questions.map((question, qIndex) => {
                        const isExpanded = expandedQuestions.has(qIndex);
                        return (
                            <div key={qIndex} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                                <div className="p-4 border-b dark:border-gray-700">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Q{qIndex + 1}</span>
                                                <button
                                                    onClick={() => toggleQuestionExpanded(qIndex)}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                                                >
                                                    {isExpanded ? 'Collapse' : 'Expand'}
                                                </button>
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">{question.question}</h3>
                                            {question.hint && (
                                                <p className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded">
                                                    💡 Hint: {question.hint}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditQuestion(qIndex)}
                                                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md"
                                                title="Edit Question"
                                            >
                                                <EditIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteQuestion(qIndex)}
                                                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md"
                                                title="Delete Question"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                                        <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Answer Options:</h4>
                                        <div className="space-y-2">
                                            {question.answerOptions.map((option, oIndex) => (
                                                <div
                                                    key={oIndex}
                                                    className={`p-3 rounded-lg border-2 ${
                                                        option.isCorrect
                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-semibold text-sm">{String.fromCharCode(65 + oIndex)}.</span>
                                                        <div className="flex-1">
                                                            <p className="font-medium">{option.text}</p>
                                                            {option.rationale && (
                                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                                                                    → {option.rationale}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {option.isCorrect && (
                                                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">✓ Correct</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ImportQuizModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />

            <QuestionEditorModal
                isOpen={isEditorModalOpen}
                onClose={() => setIsEditorModalOpen(false)}
                question={editingQuestionIndex !== null ? questions[editingQuestionIndex] : null}
                onSave={handleSaveQuestion}
            />
        </div>
    );
};
