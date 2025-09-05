const multer = require('multer');
const path = require('path');

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    // Gerar nome de arquivo único com timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filtro de arquivos para aceitar apenas imagens e vídeos
const fileFilter = (req, file, cb) => {
  // Tipos de arquivo permitidos
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime'];
  const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas imagens (JPEG, PNG, GIF) e vídeos (MP4, MPEG, MOV) são permitidos.'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB por padrão
  }
});

module.exports = upload;