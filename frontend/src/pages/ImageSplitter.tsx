import { useState, useRef, useCallback } from 'react';
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
  Check,
  Wand2
} from 'lucide-react';

interface SelectedGrid {
  rows: number;
  cols: number;
}

export const ImageSplitter = () => {
  const { t } = useTranslation();
  const [selectedGrid, setSelectedGrid] = useState<SelectedGrid | null>(null);
  const [hoveredGrid, setHoveredGrid] = useState<SelectedGrid | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [splitResults, setSplitResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageName, setImageName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const maxSize = 6;

  const getExtension = (mimeType: string): string => {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[mimeType] || 'png';
  };

  const handleGridSelect = (rows: number, cols: number) => {
    setSelectedGrid({ rows, cols });
    if (imageFile) {
      processImage(imageFile, rows, cols);
    }
  };

  const processImage = useCallback(async (file: File, rows: number, cols: number) => {
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
    setImageName(file.name.replace(/\.[^/.]+$/, ''));
    setImagePreview(URL.createObjectURL(file));

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

  const handleDownload = async () => {
    if (splitResults.length === 0 || !imageFile) return;

    setIsProcessing(true);
    const zip = new JSZip();
    const ext = getExtension(imageFile.type);

    splitResults.forEach((dataUrl, index) => {
      const base64 = dataUrl.split(',')[1];
      zip.file(`${String(index + 1).padStart(3, '0')}.${ext}`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${imageName}-split-${selectedGrid?.rows}x${selectedGrid?.cols}.zip`);
    setIsProcessing(false);
  };

  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageName('');
    setSplitResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A]">
      <SEO
        title={t('imageSplitter.title')}
        description={t('imageSplitter.description')}
      />

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Header */}
        <div className="w-full max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2E2E2E] mb-6">
            <Wand2 className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="text-xs font-medium text-[#666666] dark:text-[#A1A1A1]">
              Image Splitter
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold text-[#111111] dark:text-[#EDEDED] mb-3">
            {t('imageSplitter.title').split(' - ')[0]}
          </h1>

          <p className="text-[#666666] dark:text-[#888888]">
            {t('imageSplitter.description')}
          </p>
        </div>

        {/* Grid Selector */}
        <div className="w-full max-w-md mx-auto mb-6">
          <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2E2E2E] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Grid3X3 className="w-5 h-5 text-[#666666] dark:text-[#A1A1A1]" />
              <span className="text-sm font-medium text-[#111111] dark:text-[#EDEDED]">
                Select Grid Size
              </span>
            </div>

            {/* Visual Grid */}
            <div className="flex justify-center mb-5">
              <div
                className="grid gap-1 p-4 bg-[#FAFAFA] dark:bg-[#0A0A0A] rounded-xl border border-[#E5E5E5] dark:border-[#2E2E2E]"
                style={{ gridTemplateColumns: `repeat(${maxSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: maxSize * maxSize }).map((_, idx) => {
                  const row = Math.floor(idx / maxSize) + 1;
                  const col = (idx % maxSize) + 1;
                  const isSelected = selectedGrid?.rows === row && selectedGrid?.cols === col;
                  const isHovered = hoveredGrid && row <= hoveredGrid.rows && col <= hoveredGrid.cols;

                  return (
                    <button
                      key={idx}
                      onMouseEnter={() => setHoveredGrid({ rows: row, cols: col })}
                      onMouseLeave={() => setHoveredGrid(null)}
                      onClick={() => handleGridSelect(row, col)}
                      className={`
                        w-10 h-10 rounded-md transition-all duration-150 text-xs font-medium
                        ${isSelected
                          ? 'bg-[#007AFF] text-white'
                          : isHovered
                          ? 'bg-[#E5F0FF] dark:bg-[#1E3A5F] text-[#007AFF] dark:text-[#60A5FA]'
                          : 'bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2E2E2E] text-[#666666] dark:text-[#A1A1A1] hover:border-[#007AFF] dark:hover:border-[#60A5FA]'
                        }
                      `}
                    >
                      {isSelected || isHovered ? `${row}×${col}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            {selectedGrid ? (
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#F0F9FF] dark:bg-[#1E3A5F] border border-[#007AFF]/20">
                <Check className="w-4 h-4 text-[#007AFF]" />
                <span className="text-sm font-medium text-[#007AFF]">
                  {selectedGrid.rows} row × {selectedGrid.cols} col ({selectedGrid.rows * selectedGrid.cols} pieces)
                </span>
              </div>
            ) : hoveredGrid ? (
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2E2E2E]">
                <Grid3X3 className="w-4 h-4 text-[#666666]" />
                <span className="text-sm text-[#666666]">
                  {hoveredGrid.rows} row × {hoveredGrid.cols} col
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2E2E2E]">
                <span className="text-sm text-[#999999]">Click a cell to select grid size</span>
              </div>
            )}
          </div>
        </div>

        {/* Dropzone / Image Preview */}
        <div className="w-full max-w-md mx-auto">
          <div
            ref={dropZoneRef}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`
              relative bg-white dark:bg-[#1A1A1A] border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-200
              ${imagePreview
                ? 'border-[#E5E5E5] dark:border-[#2E2E2E] hover:border-[#999999] dark:hover:border-[#666666]'
                : 'border-[#E5E5E5] dark:border-[#2E2E2E] hover:border-[#007AFF] dark:hover:border-[#60A5FA]'
              }
            `}
          >
            {imagePreview ? (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); resetImage(); }}
                  className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-[#111111] dark:bg-[#EDEDED] rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <X className="w-4 h-4 text-white dark:text-[#111111]" />
                </button>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full aspect-video object-contain rounded-lg bg-[#FAFAFA] dark:bg-[#0A0A0A]"
                />
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#666666]" />
                    <span className="text-sm text-[#666666] truncate max-w-[200px]">
                      {imageFile?.name}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#666666] border border-[#E5E5E5] dark:border-[#2E2E2E]">
                    {imageFile?.type === 'image/jpeg' ? 'JPEG' :
                     imageFile?.type === 'image/png' ? 'PNG' :
                     imageFile?.type === 'image/webp' ? 'WebP' : 'Image'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#FAFAFA] dark:bg-[#0A0A0A] flex items-center justify-center border border-[#E5E5E5] dark:border-[#2E2E2E]">
                  <Upload className="w-6 h-6 text-[#666666]" />
                </div>
                <p className="text-[#111111] dark:text-[#EDEDED] font-medium mb-1">
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

        {/* Processing State */}
        {isProcessing && (
          <div className="mt-6 flex items-center gap-2 text-[#666666]">
            <div className="w-5 h-5 border-2 border-[#E5E5E5] border-t-[#007AFF] rounded-full animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {/* Results */}
        {splitResults.length > 0 && !isProcessing && (
          <div className="w-full max-w-md mx-auto mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#111111] dark:text-[#EDEDED]">
                  {splitResults.length} pieces
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#666666] border border-[#E5E5E5] dark:border-[#2E2E2E]">
                  {getExtension(imageFile?.type || 'image/png').toUpperCase()}
                </span>
              </div>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-[#111111] dark:bg-[#EDEDED] text-white dark:text-[#111111] rounded-lg text-sm font-medium hover:scale-105 transition-transform"
              >
                <Download className="w-4 h-4" />
                Download ZIP
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {splitResults.map((result, index) => (
                <div key={index} className="relative group">
                  <img
                    src={result}
                    alt={`Piece ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-[#E5E5E5] dark:border-[#2E2E2E]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <span className="text-xs text-white font-medium">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-16 text-xs text-[#999999]">
          Runs locally in your browser
        </p>
      </div>
    </div>
  );
};
