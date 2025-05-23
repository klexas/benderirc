import './App.css'; // Keep global styles
import MainLayout from './components/MainLayout';
import LeftPanel from './components/LeftPanel';

function App() {
  return (
    <MainLayout
      leftPanel={<LeftPanel />}
      middlePanel={
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
          <h1>Welcome to the Chat!</h1>
          <p>Select a channel or DM to start talking.</p>
          <p style={{ marginTop: '20px', fontSize: '0.8em', color: '#72767d' }}>
            (Middle Panel Content)
          </p>
        </div>
      }
      rightPanel={
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9em', color: '#72767d' }}>
            (User List / Contextual Info - Right Panel)
          </p>
        </div>
      }
    />
  );
}

export default App;
