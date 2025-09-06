# My Family Heritage Tree

An interactive family heritage tree built with React, TypeScript, and Tailwind CSS. Features SVG-based tree visualization, zoom/pan navigation, search functionality, and PNG export capabilities.

## 🌟 Features

- **Interactive Tree Visualization**: SVG-based family tree with smooth animations
- **Zoom & Pan Navigation**: Mouse wheel zoom and drag-to-pan functionality  
- **Expand/Collapse Nodes**: Click nodes to show/hide descendants
- **Search Functionality**: Find family members by name with auto-focus
- **Dark/Light Theme**: Toggle between light and dark modes
- **Layout Options**: Switch between vertical and horizontal tree layouts
- **Node Size Control**: Adjustable node sizes (Small/Medium/Large)
- **PNG Export**: Download the family tree as a high-quality PNG image
- **Responsive Design**: Works on desktop and mobile devices
- **TypeScript**: Fully typed for better development experience
- **Netlify Ready**: Configured for seamless Netlify deployment

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests once
npm run test:run
```

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── TreeCanvas.tsx   # Main SVG canvas with zoom/pan
│   ├── TreeNodes.tsx    # Individual person nodes
│   ├── TreeLinks.tsx    # Connection lines between nodes
│   └── Toolbar.tsx      # Search, controls, and export
├── layout/              # Tree layout computation
│   └── computeLayout.ts # d3-hierarchy integration
├── types/               # TypeScript interfaces
│   └── family.ts        # Family data types
├── utils/               # Utilities
│   └── exportPng.ts     # PNG export functionality
├── tests/               # Unit tests
└── App.tsx              # Main application component

public/
├── family.json          # Family tree data
└── _redirects           # Netlify SPA redirects
```

## 📊 Family Data Format

The family tree uses a simple JSON format in `public/family.json`:

```json
{
  "schemaVersion": "1.0",
  "roots": [
    {
      "id": "p1",
      "name": "Ellen Sørensen",
      "birthDate": "1924",
      "deathDate": "1999",
      "tags": ["Born in Aarhus", "Immigrated to America 1952"],
      "partners": [{ "name": "John Smith" }],
      "children": [
        {
          "id": "p2", 
          "name": "Karl Sørensen",
          "birthDate": "1948-06-12",
          "children": [...]
        }
      ]
    }
  ]
}
```

## 🛠️ Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **d3-hierarchy** - Tree layout algorithms
- **d3-zoom** - Zoom and pan interactions
- **Vitest** - Unit testing
- **Netlify** - Hosting and deployment

## 🎮 Usage

1. **Navigation**: 
   - Scroll to zoom in/out
   - Drag to pan around the tree
   - Use the toolbar controls for layout and sizing

2. **Expand/Collapse**: 
   - Click the + button on nodes to expand
   - Click the - button to collapse

3. **Search**: 
   - Type in the search box to find family members
   - The tree will automatically center on matches

4. **Export**: 
   - Click "Export PNG" to download the current tree view

5. **Theming**: 
   - Use the sun/moon icon to toggle dark/light mode

## 🚀 Netlify Deployment

This app is configured for automatic Netlify deployment:

1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. The `netlify.toml` and `_redirects` files handle SPA routing

## 🧪 Testing

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run
```

Tests cover:
- Tree layout computation with d3-hierarchy
- PNG export utility functions
- Core family data processing

## 📄 License

ISC License - Feel free to use this for your own family tree projects!

## 💝 Made with Love

This family heritage tree application was built to help families preserve and visualize their history in an interactive, beautiful way.