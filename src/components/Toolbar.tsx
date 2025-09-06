import React from 'react';

interface ToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isDarkMode: boolean;
  onDarkModeToggle: (isDark: boolean) => void;
  orientation: 'vertical' | 'horizontal';
  onOrientationChange: (orientation: 'vertical' | 'horizontal') => void;
  nodeSize: 'small' | 'medium' | 'large';
  onNodeSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onExportPNG?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  searchTerm,
  onSearchChange,
  isDarkMode,
  onDarkModeToggle,
  orientation,
  onOrientationChange,
  nodeSize,
  onNodeSizeChange,
  onExportPNG,
}) => {
  const handleExportPNG = () => {
    if (onExportPNG) {
      onExportPNG();
    } else {
      console.log('Export PNG functionality not connected');
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-full px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Family Heritage Tree
          </h1>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search family members..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 px-3 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Orientation Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">Layout:</label>
              <select
                value={orientation}
                onChange={(e) => onOrientationChange(e.target.value as 'vertical' | 'horizontal')}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>

            {/* Node Size */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">Size:</label>
              <select
                value={nodeSize}
                onChange={(e) => onNodeSizeChange(e.target.value as 'small' | 'medium' | 'large')}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="small">S</option>
                <option value="medium">M</option>
                <option value="large">L</option>
              </select>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => onDarkModeToggle(!isDarkMode)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" />
                </svg>
              )}
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportPNG}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Export PNG
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;