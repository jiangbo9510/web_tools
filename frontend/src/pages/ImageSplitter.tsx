import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/SEO';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Upload, Grid3x3, Sparkles } from 'lucide-react';

export const ImageSplitter = () => {
  const { t } = useTranslation();
  const [selectedGrid, setSelectedGrid] = useState<{ rows: number; cols: number } | null>(null);
  const [hoveredGrid, setHoveredGrid] = useState<{ rows: number; cols: number } | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageFormat, setImageFormat] = useState<string>('image/png'); // 保存上传图片的格式
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检查格子是否在悬停范围内 (从1,1到悬停位置)
  const isInHoverRange = (row: number, col: number) => {
    if (!hoveredGrid) return false;
    return row <= hoveredGrid.rows && col <= hoveredGrid.cols;
  };

  // 生成 8x8 交互式网格选择器
  const renderGridSelector = () => {
    const grids = [];
    const maxSize = 8; // 8x8 网格

    for (let row = 1; row <= maxSize; row++) {
      for (let col = 1; col <= maxSize; col++) {
        const isSelected = selectedGrid?.rows === row && selectedGrid?.cols === col;
        const isHovered = isInHoverRange(row, col);

        grids.push(
          <button
            key={`${row}-${col}`}
            onClick={() => handleGridSelect(row, col)}
            onMouseEnter={() => setHoveredGrid({ rows: row, cols: col })}
            onMouseLeave={() => setHoveredGrid(null)}
            className={`relative w-14 h-14 rounded-md transition-all duration-150 ${
              isSelected
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105 border-2 border-blue-600'
                : isHovered
                ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 dark:border-blue-500'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
            aria-label={`Select ${row}x${col} grid`}
          >
            {(isSelected || isHovered) && (
              <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                {row}×{col}
              </div>
            )}
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

    // 保存图片格式
    setImageFormat(file.type || 'image/png');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (selectedGrid) {
          splitImage(img, selectedGrid.rows, selectedGrid.cols, file.type);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const splitImage = (img: HTMLImageElement, rows: number, cols: number, format: string) => {
    setIsProcessing(true);
    const pieceWidth = img.width / cols;
    const pieceHeight = img.height / rows;
    const pieces: string[] = [];

    // 确定输出格式和扩展名
    const mimeType = format || 'image/png';
    const quality = mimeType === 'image/jpeg' ? 0.95 : undefined; // JPEG 质量

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
          // 使用原始图片格式导出
          pieces.push(canvas.toDataURL(mimeType, quality));
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

    // 根据格式确定文件扩展名
    const extension = imageFormat === 'image/jpeg' ? 'jpg' :
                      imageFormat === 'image/webp' ? 'webp' :
                      imageFormat === 'image/gif' ? 'gif' : 'png';

    for (let i = 0; i < previews.length; i++) {
      const base64Data = previews[i].split(',')[1];
      zip.file(`${String(i + 1).padStart(3, '0')}.${extension}`, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `split-images-${selectedGrid?.rows}x${selectedGrid?.cols}.zip`);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      <SEO
        title={t('imageSplitter.title')}
        description={t('imageSplitter.description')}
      />

      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800 mb-6 shadow-sm">
            <Grid3x3 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              图片切分工具
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              {t('imageSplitter.title').split(' - ')[0]}
            </span>
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('imageSplitter.description')}
          </p>
        </div>

        {/* Grid Selection */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <Grid3x3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('imageSplitter.selectGrid')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                鼠标悬停查看，点击锁定网格尺寸
              </p>
            </div>
          </div>

          {/* 8x8 Interactive Grid Selector */}
          <div className="flex justify-center mb-6">
            <div className="inline-grid grid-cols-8 gap-1 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
              {renderGridSelector()}
            </div>
          </div>

          {/* Selection Info */}
          {hoveredGrid && !selectedGrid && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900 w-fit mx-auto">
              <Grid3x3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                悬停: {hoveredGrid.rows}行 × {hoveredGrid.cols}列
              </p>
            </div>
          )}

          {selectedGrid && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900 w-fit mx-auto">
              <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-900 dark:text-green-300">
                已选择: {selectedGrid.rows}行 × {selectedGrid.cols}列 ({selectedGrid.rows * selectedGrid.cols} 张切片)
              </p>
            </div>
          )}
        </div>

        {/* Image Upload */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('imageSplitter.selectImage')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                上传图片进行切分，保持原始格式
              </p>
            </div>
            {imageFormat && previews.length > 0 && (
              <div className="px-3 py-1 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-900">
                <span className="text-xs font-medium text-purple-900 dark:text-purple-300">
                  {imageFormat === 'image/jpeg' ? 'JPEG' :
                   imageFormat === 'image/png' ? 'PNG' :
                   imageFormat === 'image/webp' ? 'WebP' :
                   imageFormat === 'image/gif' ? 'GIF' : '未知格式'}
                </span>
              </div>
            )}
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-16 text-center cursor-pointer transition-all hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-5 rounded-xl transition-opacity" />

            <div className="relative">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <p className="text-gray-900 dark:text-white font-semibold mb-2">
                点击上传图片
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                支持 JPG、PNG、GIF 等格式
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Preview and Download */}
        {previews.length > 0 && (
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('imageSplitter.preview')}
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      共 {previews.length} 张切片
                    </p>
                    <span className="text-sm text-gray-400">•</span>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      格式: {imageFormat === 'image/jpeg' ? 'JPEG' :
                             imageFormat === 'image/png' ? 'PNG' :
                             imageFormat === 'image/webp' ? 'WebP' :
                             imageFormat === 'image/gif' ? 'GIF' : '未知'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:shadow-none font-semibold"
              >
                <Download className="w-5 h-5" />
                {isProcessing ? t('imageSplitter.processing') : '一键打包下载 ZIP'}
              </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-800 group-hover:border-blue-400 dark:group-hover:border-blue-600 transition-colors">
                    <img
                      src={preview}
                      alt={`Piece ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      #{String(index + 1).padStart(3, '0')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Download Info */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                📦 下载文件名格式: 001.{imageFormat === 'image/jpeg' ? 'jpg' :
                                      imageFormat === 'image/webp' ? 'webp' :
                                      imageFormat === 'image/gif' ? 'gif' : 'png'}, 002.{imageFormat === 'image/jpeg' ? 'jpg' :
                                      imageFormat === 'image/webp' ? 'webp' :
                                      imageFormat === 'image/gif' ? 'gif' : 'png'}, ...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
