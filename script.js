let gridWidth = 0;
let gridHeight = 0;
let originalImage = null;
let splitImages = [];
let gridCells = [];
let isGridConfirmed = false;
let currentLanguage = 'zh';

const translations = {
    zh: {
        title: '图片切分工具',
        step1: '1. 确定图片切分格式',
        gridInstruction: '在5×5网格中点击选择切分格式（从左上角到选中位置）',
        selectedFormat: '已选择格式: ',
        confirmGrid: '确认切分格式',
        step2: '2. 上传图片',
        chooseImage: '选择图片',
        originalImage: '原始图片',
        splitImage: '切分图片',
        splitResult: '切分结果',
        downloadZip: '下载ZIP文件',
        download: '下载',
        notSelected: '未选择',
        pleaseSelect: '请先选择网格格式！',
        pleaseConfirm: '请先确认切分格式！',
        reselectGrid: '重新选择格式',
        result: '结果'
    },
    en: {
        title: 'Picture Splitter',
        step1: '1. Confirm Image Split Format',
        gridInstruction: 'Click on the 5×5 grid to select split format (from top-left to selected position)',
        selectedFormat: 'Selected Format: ',
        confirmGrid: 'Confirm Split Format',
        step2: '2. Upload Picture',
        chooseImage: 'Choose Image',
        originalImage: 'Original Image',
        splitImage: 'Split Image',
        splitResult: 'Split Result',
        downloadZip: 'Download ZIP',
        download: 'Download',
        notSelected: 'Not Selected',
        pleaseSelect: 'Please select grid format first!',
        pleaseConfirm: 'Please confirm split format first!',
        reselectGrid: 'Reselect Format',
        result: 'Result'
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const imageUpload = document.getElementById('imageUpload');
    const uploadLabel = document.getElementById('uploadLabel');
    const selectedGridSpan = document.getElementById('selectedGrid');
    const originalImageElement = document.getElementById('originalImage');
    const previewSection = document.getElementById('previewSection');
    const resultsSection = document.getElementById('resultsSection');
    const splitBtn = document.getElementById('splitBtn');
    const splitImagesContainer = document.getElementById('splitImages');
    const downloadZipBtn = document.getElementById('downloadZipBtn');
    const gridDisplay = document.getElementById('gridDisplay');
    const confirmSection = document.getElementById('confirmSection');
    const confirmGridBtn = document.getElementById('confirmGridBtn');
    const step2Title = document.getElementById('step2Title');
    const uploadSection = document.getElementById('uploadSection');
    const langToggle = document.getElementById('langToggle');
    const reselectGridBtn = document.getElementById('reselectGridBtn');

    function updateLanguage() {
        const t = translations[currentLanguage];
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            if (t[key]) {
                element.textContent = t[key];
            }
        });
        
        if (gridWidth === 0 || gridHeight === 0) {
            selectedGridSpan.textContent = t.notSelected;
        } else {
            selectedGridSpan.textContent = `${gridWidth}×${gridHeight}`;
        }
        langToggle.textContent = currentLanguage === 'zh' ? 'EN' : '中文';
        
        document.title = t.title;
        
        // Update existing result labels
        document.querySelectorAll('.download-btn').forEach((btn, index) => {
            const imageNumber = index + 1;
            btn.textContent = `${t.download} ${imageNumber}`;
        });
    }

    langToggle.addEventListener('click', function() {
        currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
        updateLanguage();
    });

    updateLanguage();

    function initializeGrid() {
        gridDisplay.innerHTML = '';
        gridCells = [];
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                cell.addEventListener('click', selectGrid);
                cell.addEventListener('mouseenter', previewSelection);
                
                gridDisplay.addEventListener('mouseleave', clearPreview);
                
                gridDisplay.appendChild(cell);
                gridCells.push(cell);
            }
        }
        
    }

    function selectGrid(e) {
        const targetRow = parseInt(e.target.dataset.row);
        const targetCol = parseInt(e.target.dataset.col);
        
        clearSelection();
        
        for (let row = 0; row <= targetRow; row++) {
            for (let col = 0; col <= targetCol; col++) {
                const cellIndex = row * 5 + col;
                gridCells[cellIndex].classList.add('selected');
            }
        }
        
        gridWidth = targetCol + 1;
        gridHeight = targetRow + 1;
        const t = translations[currentLanguage];
        selectedGridSpan.textContent = `${gridWidth}×${gridHeight}`;
        
        if (isGridConfirmed) {
            reselectGridBtn.style.display = 'inline-block';
        } else {
            confirmSection.style.display = 'block';
        }
    }

    function previewSelection(e) {
        const targetRow = parseInt(e.target.dataset.row);
        const targetCol = parseInt(e.target.dataset.col);
        
        gridCells.forEach(cell => {
            cell.classList.remove('preview');
        });
        
        for (let row = 0; row <= targetRow; row++) {
            for (let col = 0; col <= targetCol; col++) {
                const cellIndex = row * 5 + col;
                if (!gridCells[cellIndex].classList.contains('selected')) {
                    gridCells[cellIndex].classList.add('preview');
                }
            }
        }
        
        // 实时更新格式显示
        const previewWidth = targetCol + 1;
        const previewHeight = targetRow + 1;
        const t = translations[currentLanguage];
        selectedGridSpan.textContent = `${previewWidth}×${previewHeight}`;
    }

    function clearPreview() {
        gridCells.forEach(cell => {
            cell.classList.remove('preview');
        });
        
        // 恢复到已选择的格式显示
        const t = translations[currentLanguage];
        if (gridWidth === 0 || gridHeight === 0) {
            selectedGridSpan.textContent = t.notSelected;
        } else {
            selectedGridSpan.textContent = `${gridWidth}×${gridHeight}`;
        }
    }

    function clearSelection() {
        gridCells.forEach(cell => {
            cell.classList.remove('selected', 'preview');
        });
    }

    initializeGrid();

    confirmGridBtn.addEventListener('click', function() {
        if (gridWidth === 0 || gridHeight === 0) {
            const t = translations[currentLanguage];
            alert(t.pleaseSelect);
            return;
        }
        
        isGridConfirmed = true;
        confirmSection.style.display = 'none';
        reselectGridBtn.style.display = 'inline-block';
        
        imageUpload.disabled = false;
        uploadLabel.classList.remove('disabled');
    });

    reselectGridBtn.addEventListener('click', function() {
        isGridConfirmed = false;
        reselectGridBtn.style.display = 'none';
        confirmSection.style.display = 'block';
        
        imageUpload.disabled = true;
        uploadLabel.classList.add('disabled');
        
        previewSection.style.display = 'none';
        resultsSection.style.display = 'none';
    });

    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                originalImage = new Image();
                originalImage.onload = function() {
                    originalImageElement.src = e.target.result;
                    previewSection.style.display = 'block';
                    resultsSection.style.display = 'none';
                };
                originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    splitBtn.addEventListener('click', function() {
        if (!isGridConfirmed) {
            const t = translations[currentLanguage];
            alert(t.pleaseConfirm);
            return;
        }
        if (originalImage && gridWidth > 0 && gridHeight > 0) {
            splitImage();
        }
    });

    downloadZipBtn.addEventListener('click', function() {
        downloadAsZip();
    });

    function splitImage() {
        splitImages = [];
        splitImagesContainer.innerHTML = '';
        splitImagesContainer.style.gridTemplateColumns = `repeat(${gridWidth}, 1fr)`;
        splitImagesContainer.style.gridTemplateRows = `repeat(${gridHeight}, 1fr)`;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const pieceWidth = originalImage.width / gridWidth;
        const pieceHeight = originalImage.height / gridHeight;

        let imageIndex = 1;
        const t = translations[currentLanguage];

        for (let row = 0; row < gridHeight; row++) {
            for (let col = 0; col < gridWidth; col++) {
                canvas.width = pieceWidth;
                canvas.height = pieceHeight;

                ctx.drawImage(
                    originalImage,
                    col * pieceWidth,
                    row * pieceHeight,
                    pieceWidth,
                    pieceHeight,
                    0,
                    0,
                    pieceWidth,
                    pieceHeight
                );

                const imageData = canvas.toDataURL('image/png');
                splitImages.push({
                    data: imageData,
                    name: `${imageIndex}.png`
                });

                const container = document.createElement('div');
                container.className = 'split-image-container';

                const img = document.createElement('img');
                img.src = imageData;
                img.className = 'split-image';
                img.alt = `Split image ${imageIndex}`;

                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'download-btn';
                downloadBtn.textContent = `${t.download} ${imageIndex}`;
                downloadBtn.addEventListener('click', () => downloadImage(imageData, `${imageIndex}.png`));

                container.appendChild(img);
                container.appendChild(downloadBtn);
                splitImagesContainer.appendChild(container);

                imageIndex++;
            }
        }

        resultsSection.style.display = 'block';
    }

    function downloadImage(imageData, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = imageData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async function downloadAsZip() {
        if (splitImages.length === 0) return;
        
        const zip = new JSZip();
        
        for (let i = 0; i < splitImages.length; i++) {
            const image = splitImages[i];
            const base64Data = image.data.split(',')[1];
            zip.file(image.name, base64Data, {base64: true});
        }
        
        try {
            const content = await zip.generateAsync({type: 'blob'});
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `split_images_${gridWidth}x${gridHeight}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error creating ZIP file:', error);
            alert('Error creating ZIP file. Please try again.');
        }
    }
});