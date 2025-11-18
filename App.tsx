import React from 'react';
import { Login } from './components/Login';
import { AdminView } from './components/AdminView';
import { TeacherView } from './components/StudentView';
import { FirstTimeLogin } from './components/FirstTimeLogin';
import { SessionProvider, useSession } from './context/SessionContext';

const AppContent: React.FC = () => {
  const { session } = useSession();
  const currentUser = session.user;

  if (!currentUser) {
    return <Login />;
  }
  
  if (currentUser.isFirstLogin) {
    return <FirstTimeLogin />;
  }

  return (
    <div className="flex flex-col h-screen font-sans">
      {currentUser.role === 'admin' ? (
        <AdminView />
      ) : (
        <TeacherView />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
};

export default App;