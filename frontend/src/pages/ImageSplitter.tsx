import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Upload,
  Grid3X3,
  Download,
  X,
  Image as ImageIcon,
  Check
} from 'lucide-react';

interface SelectedGrid {
  rows: number;
  cols: number;
}

export const ImageSplitter = () => {
  const { t } = useTranslation();
  const [selectedGrid, setSelectedGrid] = useState<SelectedGrid | null>(null);
  const [hoveredGrid, setHoveredGrid] = useState<SelectedGrid | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [splitResults, setSplitResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageName, setImageName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gridSize = 5;

  // Cleanup object URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const getExtension = (mimeType: string): string => {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[mimeType] || 'png';
  };

  const processImage = useCallback((file: File, rows: number, cols: number) => {
    setIsProcessing(true);
    const mimeType = file.type || 'image/png';

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const pieceWidth = Math.ceil(img.width / cols);
      const pieceHeight = Math.ceil(img.height / rows);
      const pieces: string[] = [];

      const quality = mimeType === 'image/jpeg' ? 0.95 : undefined;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const canvas = document.createElement('canvas');
          canvas.width = pieceWidth;
          canvas.height = pieceHeight;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(
              img,
              col * (img.width / cols),
              row * (img.height / rows),
              img.width / cols,
              img.height / rows,
              0,
              0,
              pieceWidth,
              pieceHeight
            );
            pieces.push(canvas.toDataURL(mimeType, quality));
          }
        }
      }

      setSplitResults(pieces);
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    setImageFile(file);
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setImageName(nameWithoutExt);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);

    if (selectedGrid) {
      processImage(file, selectedGrid.rows, selectedGrid.cols);
    }
  }, [selectedGrid, processImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleGridSelect = (rows: number, cols: number) => {
    setSelectedGrid({ rows, cols });
    if (imageFile) {
      processImage(imageFile, rows, cols);
    }
  };

  const handleDownload = async () => {
    if (splitResults.length === 0 || !imageFile) return;

    setIsProcessing(true);
    const zip = new JSZip();
    const ext = getExtension(imageFile.type);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    splitResults.forEach((dataUrl, index) => {
      const base64 = dataUrl.split(',')[1];
      zip.file(`${index + 1}.${ext}`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${imageName}-${timestamp}.zip`);
    setIsProcessing(false);
  };

  const resetImage = () => {
    setImageFile(null);
    setImageName('');
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setSplitResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isHighlighted = (row: number, col: number) => {
    if (!hoveredGrid) return false;
    return row <= hoveredGrid.rows && col <= hoveredGrid.cols;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SEO
        title={t('imageSplitter.title')}
        description={t('imageSplitter.description')}
      />

      <div className="px-6 py-16 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#111111] mb-3">
            {t('imageSplitter.title').split(' - ')[0]}
          </h1>
          <p className="text-[#666666]">
            {t('imageSplitter.description')}
          </p>
        </div>

        {/* 5x5 Grid Selector - Fixed at Top */}
        <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <Grid3X3 className="w-5 h-5 text-[#666666]" />
            <span className="text-sm font-medium text-[#111111]">
              Select Grid Size
            </span>
          </div>

          <div className="flex flex-wrap gap-8 items-start justify-center">
            {/* 5x5 Visual Grid - Always visible */}
            <div className="flex flex-col items-center">
              <div
                className="grid gap-1 p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]"
                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                  const row = Math.floor(idx / gridSize) + 1;
                  const col = (idx % gridSize) + 1;
                  const isSelectedCell = selectedGrid && row <= selectedGrid.rows && col <= selectedGrid.cols;
                  const isCornerCell = selectedGrid?.rows === row && selectedGrid?.cols === col;
                  const isHovered = isHighlighted(row, col);

                  return (
                    <button
                      key={idx}
                      onMouseEnter={() => setHoveredGrid({ rows: row, cols: col })}
                      onMouseLeave={() => setHoveredGrid(null)}
                      onClick={() => handleGridSelect(row, col)}
                      className={`
                        w-10 h-10 rounded-lg transition-all duration-150 text-xs font-medium
                        ${isCornerCell
                          ? 'bg-[#007AFF] text-white ring-2 ring-[#007AFF] ring-offset-1'
                          : isSelectedCell
                            ? 'bg-[#007AFF]/80 text-white'
                            : isHovered
                              ? 'bg-[#E5F0FF] text-[#007AFF]'
                              : 'bg-white border border-[#E5E5E5] text-[#666666] hover:border-[#007AFF]'
                        }
                      `}
                    >
                      {isCornerCell ? `${col}×${row}` : isHovered && !selectedGrid ? `${col}×${row}` : ''}
                    </button>
                  );
                })}
              </div>

              {/* Status below grid */}
              <div className="mt-4">
                {selectedGrid ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#F0F9FF] border border-[#007AFF]/20">
                    <Check className="w-4 h-4 text-[#007AFF]" />
                    <span className="text-sm font-medium text-[#007AFF]">
                      {selectedGrid.cols} columns × {selectedGrid.rows} rows = {selectedGrid.rows * selectedGrid.cols} pieces
                    </span>
                  </div>
                ) : hoveredGrid ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                    <Grid3X3 className="w-4 h-4 text-[#666666]" />
                    <span className="text-sm text-[#666666]">
                      {hoveredGrid.cols} columns × {hoveredGrid.rows} rows
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                    <span className="text-sm text-[#999999]">Click a cell to select grid size</span>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Grid Preview - Shows the split effect */}
            {selectedGrid && (
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-[#666666] mb-2">Split Preview</span>
                <div
                  className="grid gap-0.5 p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]"
                  style={{
                    gridTemplateColumns: `repeat(${selectedGrid.cols}, minmax(0, 1fr))`,
                    width: '160px',
                    height: '160px'
                  }}
                >
                  {Array.from({ length: selectedGrid.rows * selectedGrid.cols }).map((_, idx) => (
                    <div
                      key={idx}
                      className="bg-gradient-to-br from-[#007AFF] to-[#5856D6] rounded flex items-center justify-center"
                    >
                      <span className="text-[10px] font-bold text-white/90">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <span className="text-xs text-[#999999] mt-2">
                  {selectedGrid.cols}×{selectedGrid.rows}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`
              relative bg-white border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-200
              ${imageFile
                ? 'border-[#E5E5E5] hover:border-[#999999]'
                : 'border-[#E5E5E5] hover:border-[#007AFF]'
              }
            `}
          >
            {imageFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#F0F9FF] flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#111111] truncate max-w-[300px]">
                      {imageFile.name}
                    </p>
                    <p className="text-xs text-[#999999]">
                      {getExtension(imageFile.type).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); resetImage(); }}
                  className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[#666666]" />
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#FAFAFA] flex items-center justify-center border border-[#E5E5E5]">
                  <Upload className="w-5 h-5 text-[#666666]" />
                </div>
                <p className="text-[#111111] font-medium mb-1">
                  Click or drag to upload
                </p>
                <p className="text-sm text-[#999999]">
                  JPG, PNG, WebP, GIF
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Preview with Grid Overlay */}
        {imagePreviewUrl && selectedGrid && (
          <div className="mb-8 p-4 bg-white border border-[#E5E5E5] rounded-2xl">
            <h3 className="text-sm font-medium text-[#111111] mb-4">Preview</h3>
            <div className="relative inline-block overflow-hidden rounded-lg mx-auto block w-fit">
              <img
                src={imagePreviewUrl}
                alt="Preview"
                className="max-w-[100%] max-h-[500px] object-contain block"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${selectedGrid.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${selectedGrid.rows}, 1fr)`,
                }}
              >
                {Array.from({ length: selectedGrid.rows * selectedGrid.cols }).map((_, idx) => (
                  <div
                    key={idx}
                    className="border-r border-b border-white/50 last:border-0"
                    style={{
                      // Handle right/bottom borders for the last items in row/col
                      borderRightWidth: (idx + 1) % selectedGrid.cols === 0 ? '0' : '1px',
                      borderBottomWidth: idx >= (selectedGrid.rows - 1) * selectedGrid.cols ? '0' : '1px'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="mb-8 flex items-center justify-center gap-2 text-[#666666]">
            <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#007AFF] rounded-full animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {/* Results - Displayed in user's selected format */}
        {splitResults.length > 0 && !isProcessing && selectedGrid && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm font-medium text-[#111111]">
                {splitResults.length} pieces
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#FAFAFA] text-[#666666] border border-[#E5E5E5]">
                {getExtension(imageFile?.type || 'image/png').toUpperCase()}
              </span>
            </div>

            {/* Grid displayed in user's selected format (cols x rows) */}
            <div
              className="grid gap-3 mb-8 bg-white p-4 rounded-xl border border-[#E5E5E5]"
              style={{
                gridTemplateColumns: `repeat(${selectedGrid.cols}, minmax(0, 1fr))`
              }}
            >
              {splitResults.map((result, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <img
                    src={result}
                    alt={`Piece ${index + 1}`}
                    className="w-full h-auto rounded-lg border border-[#E5E5E5] shadow-sm"
                  />
                  <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-[#F0F9FF] border border-[#007AFF]/20 text-xs font-medium text-[#007AFF]">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Download Button - Centered at Bottom */}
            <div className="flex justify-center">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-[#E5E5E5] rounded-xl text-sm font-medium text-[#111111] hover:border-[#111111] hover:scale-105 transition-all"
              >
                <Download className="w-4 h-4" />
                Download ZIP
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[#999999]">
          All tools run locally in your browser
        </p>
      </div>
    </div>
  );
};
