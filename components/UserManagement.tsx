import React, { useState, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import * as api from '../services/api';
import { User, UserRole } from '../types';
import { PlusIcon, EditIcon, TrashIcon } from './icons/AdminIcons';
import { ConfirmModal } from './ConfirmModal';

const SearchIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const UserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Omit<User, '_id' | 'isFirstLogin'>, id?: string) => Promise<void>;
    userToEdit: User | null;
}> = ({ isOpen, onClose, onSave, userToEdit }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('teacher');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (userToEdit) {
            setName(userToEdit.name);
            setEmail(userToEdit.email);
            setRole(userToEdit.role);
            setStatus(userToEdit.status);
            setUsername(userToEdit.username);
            setPassword(''); // Don't pre-fill password
        } else {
            setName('');
            setEmail('');
            setUsername('');
            setPassword('');
            setRole('teacher');
            setStatus('active');
        }
        setSaveError(null); // Clear any previous errors when modal opens/closes
    }, [userToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && email.trim() && username.trim() && !isSaving) {
            if (!userToEdit && !password.trim()){
                // Password is required for new users
                return;
            }
            setIsSaving(true);
            setSaveError(null);
            const userData: Omit<User, '_id' | 'isFirstLogin'> = { name: name.trim(), email: email.trim(), username: username.trim(), role, status };
            if (password.trim()) {
                userData.password = password.trim();
            }
            try {
                await onSave(userData, userToEdit?._id);
                setIsSaving(false);
            } catch (error: any) {
                setIsSaving(false);
                setSaveError(error.message || 'Failed to save user. Please try again.');
            }
        }
    };

    const formInputClasses = "mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{userToEdit ? 'Edit User' : 'Add New User'}</h2>
                {saveError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {saveError}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className={formInputClasses} autoFocus />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className={formInputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={formInputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!userToEdit} placeholder={userToEdit ? "Leave blank to keep unchanged" : ""} className={formInputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className={formInputClasses}>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')} className={formInputClasses}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <div className="mt-8 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50" disabled={isSaving}>Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait" disabled={!name || !email || !username || isSaving}>
                            {isSaving ? 'Saving...' : (userToEdit ? 'Save Changes' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const UserManagement: React.FC = () => {
    const [version, setVersion] = useState(0);
    const { data: users, isLoading, error } = useApi<User[]>(api.getUsers, [version]);
    const [modalState, setModalState] = useState<{ isOpen: boolean; userToEdit: User | null }>({ isOpen: false, userToEdit: null });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean; onConfirm: (() => void) | null }>({ isOpen: false, onConfirm: null });
    const [searchQuery, setSearchQuery] = useState('');

    const openModal = (user: User | null = null) => setModalState({ isOpen: true, userToEdit: user });
    const closeModal = () => setModalState({ isOpen: false, userToEdit: null });

    const openConfirmModal = (onConfirm: () => void) => {
        setConfirmModalState({ isOpen: true, onConfirm });
    };

    const closeConfirmModal = () => {
        setConfirmModalState({ isOpen: false, onConfirm: null });
    };

    const handleSaveUser = async (user: Omit<User, '_id' | 'isFirstLogin'>, id?: string) => {
        try {
            if (id) {
                await api.updateUser(id, user);
            } else {
                await api.addUser(user);
            }
            setVersion(v => v + 1);
            closeModal();
        } catch (error) {
            console.error('Failed to save user:', error);
            throw error;
        }
    };

    const handleDeleteUser = async (user: User) => {
        const confirmAction = async () => {
            try {
                const result = await api.deleteUser(user._id);
                if (result.success) {
                    setVersion(v => v + 1);
                }
                closeConfirmModal();
            } catch (error) {
                console.error('Failed to delete user:', error);
                // Don't close modal on error to let user retry
            }
        };
        openConfirmModal(confirmAction);
    };
    
    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchQuery) return users;
        
        const lowercasedQuery = searchQuery.toLowerCase();
        
        return users.filter(user => 
            user.name.toLowerCase().includes(lowercasedQuery) ||
            user.username.toLowerCase().includes(lowercasedQuery) ||
            user.email.toLowerCase().includes(lowercasedQuery)
        );
    }, [users, searchQuery]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add User</span>
                </button>
            </div>

            <div className="mb-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search users by name, username, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="w-5 h-5 text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto bg-white dark:bg-gray-800/50 shadow-md rounded-lg">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Username</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={6} className="text-center p-4">Loading users...</td></tr>
                        )}
                        {error && (
                            <tr><td colSpan={6} className="text-center p-4 text-red-500">Error: {error.message}</td></tr>
                        )}
                        {!isLoading && !error && filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-6">
                                    {searchQuery ? 'No users match your search.' : 'No users found.'}
                                </td>
                            </tr>
                        )}
                        {filteredUsers.map(user => (
                            <tr key={user._id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.name}</td>
                                <td className="px-6 py-4">{user.username}</td>
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4 capitalize">{user.role}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>{user.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => openModal(user)} className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Edit User"><EditIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteUser(user)} className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Delete User"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <UserModal 
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onSave={handleSaveUser}
                userToEdit={modalState.userToEdit}
            />
            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModalState.onConfirm}
                title="Confirm User Deletion"
                message="Are you sure you want to delete this user? This action cannot be undone."
            />
        </div>
    );
};