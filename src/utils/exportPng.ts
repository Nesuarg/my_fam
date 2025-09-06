/**
 * Export SVG content as PNG file
 * Utility function to convert the family tree SVG to a downloadable PNG image
 */
export async function exportToPNG(svgElement: SVGSVGElement, filename: string = 'family-tree'): Promise<void> {
  try {
    // Create a canvas element for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }

    // Get SVG dimensions and viewBox
    const svgRect = svgElement.getBoundingClientRect();
    const svgData = new XMLSerializer().serializeToString(svgElement);
    
    // Set canvas size with some extra padding for margin
    const padding = 40;
    canvas.width = svgRect.width + (padding * 2);
    canvas.height = svgRect.height + (padding * 2);

    // Create a blob URL for the SVG
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create an image element to load the SVG
    const image = new Image();
    
    return new Promise((resolve, reject) => {
      image.onload = () => {
        try {
          // Clear canvas with white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the SVG onto the canvas with padding
          ctx.drawImage(image, padding, padding, svgRect.width, svgRect.height);
          
          // Convert canvas to blob and trigger download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${filename}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // Clean up URLs
              URL.revokeObjectURL(url);
              URL.revokeObjectURL(svgUrl);
              
              resolve();
            } else {
              reject(new Error('Failed to create PNG blob'));
            }
          }, 'image/png', 1.0);
        } catch (error) {
          reject(error);
        }
      };
      
      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load SVG image'));
      };
      
      // Load the SVG
      image.src = svgUrl;
    });
    
  } catch (error) {
    console.error('Failed to export PNG:', error);
    throw error;
  }
}

/**
 * Alternative export method that captures the tree with current zoom/pan state
 */
export async function exportTreeViewToPNG(
  svgElement: SVGSVGElement, 
  filename: string = 'family-tree-view'
): Promise<void> {
  try {
    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Get the tree container transform to capture current zoom/pan
    const treeContainer = clonedSvg.querySelector('.tree-container') as SVGGElement;
    
    // Remove zoom transform and apply it to the entire SVG viewBox if needed
    if (treeContainer) {
      treeContainer.removeAttribute('transform');
    }
    
    // Set fixed dimensions for consistent export
    clonedSvg.setAttribute('width', '1200');
    clonedSvg.setAttribute('height', '800');
    
    // Export the modified SVG
    await exportToPNG(clonedSvg, filename);
    
  } catch (error) {
    console.error('Failed to export tree view:', error);
    throw error;
  }
}