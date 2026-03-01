import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import { Navbar } from '../components/Navbar';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Upload,
  Archive,
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
  const { t, i18n } = useTranslation();
  const [pendingGrid, setPendingGrid] = useState<SelectedGrid | null>(null);
  const [confirmedGrid, setConfirmedGrid] = useState<SelectedGrid | null>(null);
  const [hoveredGrid, setHoveredGrid] = useState<SelectedGrid | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [splitResults, setSplitResults] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageName, setImageName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gridSize = 5;

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

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);

    if (confirmedGrid) {
      processImage(file, confirmedGrid.rows, confirmedGrid.cols);
    }
  }, [confirmedGrid, processImage]);

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
    setPendingGrid({ rows, cols });
  };

  const handleConfirmGrid = () => {
    if (!pendingGrid) return;
    setConfirmedGrid(pendingGrid);
    if (imageFile) {
      processImage(imageFile, pendingGrid.rows, pendingGrid.cols);
    }
  };

  // Download as ZIP with named files
  const handleDownloadZip = async () => {
    if (splitResults.length === 0 || !imageFile) return;

    setIsProcessing(true);
    const zip = new JSZip();
    const ext = getExtension(imageFile.type);

    splitResults.forEach((dataUrl, index) => {
      const base64 = dataUrl.split(',')[1];
      zip.file(`${imageName}-${index + 1}.${ext}`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${imageName}.zip`);
    setIsProcessing(false);
  };

  // Download single image
  const handleDownloadSingle = (dataUrl: string, index: number) => {
    if (!imageFile) return;
    const ext = getExtension(imageFile.type);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${imageName}-${index + 1}.${ext}`;
    link.click();
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

  const getSelectedCount = () => {
    if (confirmedGrid) return confirmedGrid.rows * confirmedGrid.cols;
    if (pendingGrid) return pendingGrid.rows * pendingGrid.cols;
    return 0;
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={t('imageSplitter.title')}
        description={t('imageSplitter.description')}
        keywords={t('imageSplitter.seoKeywords')}
        canonicalUrl="https://pic.web-tools.work"
        language={i18n.language}
      />
      <Navbar />

      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t('imageSplitter.title')}
          </h1>
          <p className="text-sm sm:text-base text-gray-500">
            {t('imageSplitter.description')}
          </p>
        </div>

        {/* Two-Column Layout (stacked on mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column: Grid Selector + Upload */}
          <div className="space-y-5 sm:space-y-6">
            {/* Grid Selector Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {t('imageSplitter.selectPattern')}
              </h3>
              <p className="text-sm text-gray-400 mb-4 sm:mb-5">
                {t('imageSplitter.selectedCount', { count: getSelectedCount() })}
              </p>

              {/* 5x5 Grid - responsive cell sizes */}
              <div className="flex justify-center mb-4">
                <div
                  className="grid gap-1 sm:gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, minmax(36px, 44px))`,
                    gridTemplateRows: `repeat(${gridSize}, minmax(36px, 44px))`
                  }}
                >
                  {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
                    const row = Math.floor(idx / gridSize) + 1;
                    const col = (idx % gridSize) + 1;

                    const isConfirmedCell = confirmedGrid && row <= confirmedGrid.rows && col <= confirmedGrid.cols;
                    const isConfirmedCorner = confirmedGrid?.rows === row && confirmedGrid?.cols === col;
                    const isPendingCell = pendingGrid && row <= pendingGrid.rows && col <= pendingGrid.cols;
                    const isPendingCorner = pendingGrid?.rows === row && pendingGrid?.cols === col;
                    const isHovered = isHighlighted(row, col);

                    return (
                      <button
                        key={idx}
                        onMouseEnter={() => setHoveredGrid({ rows: row, cols: col })}
                        onMouseLeave={() => setHoveredGrid(null)}
                        onClick={() => handleGridSelect(row, col)}
                        className={`
                          aspect-square rounded-lg transition-all duration-150 text-xs font-medium border
                          ${isConfirmedCorner
                            ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-300 ring-offset-1'
                            : isConfirmedCell
                              ? 'bg-purple-500 text-white border-purple-500'
                              : isPendingCorner
                                ? 'bg-purple-100 text-purple-600 border-purple-300 ring-2 ring-purple-200 ring-offset-1'
                                : isPendingCell
                                  ? 'bg-purple-50 text-purple-500 border-purple-200'
                                  : isHovered
                                    ? 'bg-gray-100 text-gray-500 border-gray-300'
                                    : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300'
                          }
                        `}
                      >
                        {(isConfirmedCorner || isPendingCorner) ? `${col}×${row}` : isHovered && !pendingGrid && !confirmedGrid ? `${col}×${row}` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status & Confirm */}
              {pendingGrid && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-50 border border-purple-200">
                    <span className="text-sm font-medium text-purple-600">
                      {pendingGrid.cols} × {pendingGrid.rows} = {pendingGrid.rows * pendingGrid.cols}
                    </span>
                  </div>
                  <button
                    onClick={handleConfirmGrid}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-sm transition-all duration-200 hover:shadow-md"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
                  >
                    <Check className="w-4 h-4" />
                    <span>{t('common.confirm')} ({pendingGrid.rows * pendingGrid.cols})</span>
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4 text-center">
                {t('imageSplitter.gridHint')}
              </p>
            </div>

            {/* Upload Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {t('imageSplitter.uploadImage')}
              </h3>

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-4 sm:p-6 cursor-pointer transition-all duration-200
                  ${imageFile
                    ? 'border-gray-200 hover:border-gray-400'
                    : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50/30'
                  }
                `}
              >
                {imageFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {imageFile.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {getExtension(imageFile.type).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetImage(); }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-medium mb-1">
                      {t('imageSplitter.uploadImage')}
                    </p>
                    <p className="text-sm text-gray-400">
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
          </div>

          {/* Right Column: Preview & Results */}
          <div className="space-y-5 sm:space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {t('imageSplitter.previewTitle')}
              </h3>

              {/* Original Image Preview */}
              {imagePreviewUrl && confirmedGrid ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-3">{t('imageSplitter.originalImage')}</p>
                    <div className="relative inline-block overflow-hidden rounded-xl w-full">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="w-full h-auto object-contain block rounded-xl"
                      />
                      {/* Grid Overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(${confirmedGrid.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${confirmedGrid.rows}, 1fr)`,
                        }}
                      >
                        {Array.from({ length: confirmedGrid.rows * confirmedGrid.cols }).map((_, idx) => (
                          <div
                            key={idx}
                            className="border-r border-b border-white/60"
                            style={{
                              borderRightWidth: (idx + 1) % confirmedGrid.cols === 0 ? '0' : '1px',
                              borderBottomWidth: idx >= (confirmedGrid.rows - 1) * confirmedGrid.cols ? '0' : '1px'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Processing State */}
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-gray-500 py-4">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                      <span className="text-sm">{t('imageSplitter.processing')}</span>
                    </div>
                  )}

                  {/* Split Results */}
                  {splitResults.length > 0 && !isProcessing && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-3">
                        {t('imageSplitter.splitResult')} ({splitResults.length})
                      </p>

                      <div
                        className="grid gap-2 sm:gap-3"
                        style={{
                          gridTemplateColumns: `repeat(${confirmedGrid.cols}, minmax(0, 1fr))`
                        }}
                      >
                        {splitResults.map((result, index) => (
                          <div key={index} className="flex flex-col items-center gap-1">
                            <div className="relative group w-full">
                              <img
                                src={result}
                                alt={`${imageName}-${index + 1}`}
                                className="w-full h-auto rounded-lg border border-gray-200"
                              />
                              {/* Individual download overlay */}
                              <button
                                onClick={() => handleDownloadSingle(result, index)}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                                title={`${t('common.download')} ${imageName}-${index + 1}`}
                              >
                                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </button>
                            </div>
                            <span className="text-xs text-gray-400 font-medium truncate max-w-full">
                              {imageName}-{index + 1}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Success Message */}
                      <div className="mt-4 flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-green-50 border border-green-200">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-green-700">{t('imageSplitter.splitSuccess')}</span>
                      </div>

                      {/* Download Buttons */}
                      <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={handleDownloadZip}
                          className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
                        >
                          <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>{t('imageSplitter.downloadZip')}</span>
                        </button>
                        <button
                          onClick={() => splitResults.forEach((r, i) => handleDownloadSingle(r, i))}
                          className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-purple-600 bg-purple-50 border border-purple-200 rounded-xl font-medium text-sm hover:bg-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        >
                          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>{t('imageSplitter.downloadEach')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-200">
                    <ImageIcon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">
                    {!confirmedGrid ? t('imageSplitter.selectGridFirst') : t('imageSplitter.selectImageFirst')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
