import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Upload } from 'lucide-react';

export const ImageSplitter = () => {
  const { t } = useTranslation();
  const [selectedGrid, setSelectedGrid] = useState<{ rows: number; cols: number } | null>(null);
  const [hoveredGrid, setHoveredGrid] = useState<{ rows: number; cols: number } | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检查格子是否在悬停范围内 (从1,1到悬停位置)
  const isInHoverRange = (row: number, col: number) => {
    if (!hoveredGrid) return false;
    return row <= hoveredGrid.rows && col <= hoveredGrid.cols;
  };

  // 生成 5x5 网格选择器
  const renderGridSelector = () => {
    const grids = [];
    for (let row = 1; row <= 5; row++) {
      for (let col = 1; col <= 5; col++) {
        const isSelected = selectedGrid?.rows === row && selectedGrid?.cols === col;
        const isHovered = isInHoverRange(row, col);

        grids.push(
          <button
            key={`${row}-${col}`}
            onClick={() => handleGridSelect(row, col)}
            onMouseEnter={() => setHoveredGrid({ rows: row, cols: col })}
            onMouseLeave={() => setHoveredGrid(null)}
            className={`w-16 h-16 border-2 rounded-lg transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-100 dark:bg-blue-900'
                : isHovered
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/50'
                : 'border-gray-300 hover:border-blue-300 dark:border-gray-600'
            }`}
          >
            <div className="text-sm font-medium">{row}×{col}</div>
          </button>
        );
      }
    }
    return grids;
  };

  const handleGridSelect = (rows: number, cols: number) => {
    setSelectedGrid({ rows, cols });
    setPreviews([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (selectedGrid) {
          splitImage(img, selectedGrid.rows, selectedGrid.cols);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const splitImage = (img: HTMLImageElement, rows: number, cols: number) => {
    setIsProcessing(true);
    const pieceWidth = img.width / cols;
    const pieceHeight = img.height / rows;
    const pieces: string[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const canvas = document.createElement('canvas');
        canvas.width = pieceWidth;
        canvas.height = pieceHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(
            img,
            col * pieceWidth,
            row * pieceHeight,
            pieceWidth,
            pieceHeight,
            0,
            0,
            pieceWidth,
            pieceHeight
          );
          pieces.push(canvas.toDataURL('image/png'));
        }
      }
    }

    setPreviews(pieces);
    setIsProcessing(false);
  };

  const handleDownload = async () => {
    if (previews.length === 0) return;

    setIsProcessing(true);
    const zip = new JSZip();

    for (let i = 0; i < previews.length; i++) {
      const base64Data = previews[i].split(',')[1];
      zip.file(`${i + 1}.png`, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `split-images-${selectedGrid?.rows}x${selectedGrid?.cols}.zip`);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <SEO
        title={t('imageSplitter.title')}
        description={t('imageSplitter.description')}
      />

      <div className="container mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-2">
          {t('imageSplitter.title').split(' - ')[0]}
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
          {t('imageSplitter.description')}
        </p>

        {/* 网格选择 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('imageSplitter.selectGrid')}
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {renderGridSelector()}
          </div>
          {selectedGrid && (
            <p className="mt-4 text-green-600 dark:text-green-400 font-medium">
              {t('imageSplitter.gridSize')}: {selectedGrid.rows}×{selectedGrid.cols}
            </p>
          )}
        </div>

        {/* 图片上传 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('imageSplitter.selectImage')}
          </h2>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-300">
              {t('imageSplitter.uploadImage')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* 预览和下载 */}
        {previews.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('imageSplitter.preview')} ({previews.length} {t('common.download')})
              </h2>
              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Download className="w-5 h-5" />
                {isProcessing ? t('imageSplitter.processing') : t('imageSplitter.downloadAll')}
              </button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Piece ${index + 1}`}
                    className="w-full h-auto rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {index + 1}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
