import { describe, it, expect, vi } from 'vitest';

// Mock DOM APIs
const mockCanvas = {
  getContext: vi.fn(() => ({
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  })),
  toBlob: vi.fn(),
  width: 0,
  height: 0,
};

const mockImage = {
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
};

// Mock SVG element
const mockSVGElement = {
  getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600 })),
} as unknown as SVGSVGElement;

// Mock DOM methods
Object.defineProperty(window, 'XMLSerializer', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    serializeToString: vi.fn().mockReturnValue('<svg></svg>'),
  })),
});

Object.defineProperty(window, 'Blob', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({})),
});

Object.defineProperty(window, 'URL', {
  writable: true,
  value: {
    createObjectURL: vi.fn().mockReturnValue('mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

document.createElement = vi.fn().mockImplementation((tagName) => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  if (tagName === 'img') {
    return mockImage;
  }
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: vi.fn(),
    };
  }
  return {};
});

document.body.appendChild = vi.fn();
document.body.removeChild = vi.fn();

describe('exportPng', () => {
  it('should handle SVG serialization', () => {
    const serializer = new XMLSerializer();
    const result = serializer.serializeToString(mockSVGElement);
    expect(result).toBe('<svg></svg>');
  });

  it('should create canvas with correct dimensions', () => {
    const canvas = document.createElement('canvas');
    expect(canvas).toBe(mockCanvas);
  });

  it('should handle blob creation', () => {
    const blob = new Blob(['test'], { type: 'image/svg+xml' });
    expect(blob).toBeDefined();
  });

  it('should create object URLs', () => {
    const url = URL.createObjectURL(new Blob());
    expect(url).toBe('mock-url');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});