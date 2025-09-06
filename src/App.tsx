import { useState, useEffect, useRef } from 'react';
import { FamilyDocument } from './types/family';
import TreeCanvas from './components/TreeCanvas';
import Toolbar from './components/Toolbar';
import { exportToPNG } from './utils/exportPng';

function App() {
  const [familyData, setFamilyData] = useState<FamilyDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [nodeSize, setNodeSize] = useState<'small' | 'medium' | 'large'>('medium');
  const treeCanvasRef = useRef<{ getSVGElement: () => SVGSVGElement | null }>(null);

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const response = await fetch('/family.json');
        if (!response.ok) {
          throw new Error(`Failed to load family data: ${response.status}`);
        }
        const data: FamilyDocument = await response.json();
        
        // Basic validation
        if (!data.schemaVersion || !data.roots || !Array.isArray(data.roots)) {
          throw new Error('Invalid family data format');
        }
        
        setFamilyData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load family data');
      } finally {
        setLoading(false);
      }
    };

    loadFamilyData();
  }, []);

  useEffect(() => {
    // Apply dark mode class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleExportPNG = async () => {
    const svgElement = treeCanvasRef.current?.getSVGElement();
    if (svgElement) {
      try {
        await exportToPNG(svgElement, 'family-heritage-tree');
      } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export PNG. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading family tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unable to Load Family Tree
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Expected file: public/family.json</p>
            <p>Required format:</p>
            <pre className="mt-2 text-left bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs">
{`{
  "schemaVersion": "1.0",
  "roots": [
    {
      "id": "person1",
      "name": "John Doe",
      "children": [...]
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
      <Toolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isDarkMode={isDarkMode}
        onDarkModeToggle={setIsDarkMode}
        orientation={orientation}
        onOrientationChange={setOrientation}
        nodeSize={nodeSize}
        onNodeSizeChange={setNodeSize}
        onExportPNG={handleExportPNG}
      />
      
      <main className="h-[calc(100vh-4rem)]">
        {familyData && (
          <TreeCanvas
            ref={treeCanvasRef}
            familyData={familyData}
            searchTerm={searchTerm}
            orientation={orientation}
            nodeSize={nodeSize}
          />
        )}
      </main>
    </div>
  );
}

export default App;