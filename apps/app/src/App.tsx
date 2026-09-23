import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import Today from './screens/Today';
import Deals from './screens/Deals';
import Deal from './screens/Deal';
import Diagnose from './screens/Diagnose';
import Plays from './screens/Plays';
import Manager from './screens/Manager';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/deals/:id" element={<Deal />} />
        <Route path="/diagnose" element={<Diagnose />} />
        <Route path="/plays" element={<Plays />} />
        <Route path="/manager" element={<Manager />} />
        <Route path="*" element={<Today />} />
      </Routes>
    </AppShell>
  );
}
