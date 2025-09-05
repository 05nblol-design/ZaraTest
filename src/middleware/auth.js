const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar o token JWT
exports.protect = async (req, res, next) => {
  let token;

  // Verificar se o token está no header Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Verificar se o token está nos cookies
    token = req.cookies.token;
  }

  // Verificar se o token existe
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Não autorizado para acessar esta rota'
    });
  }

  try {
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se o usuário ainda existe
    const user = await User.findById(decoded.userId || decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'O usuário não existe mais'
      });
    }

    // Adicionar o usuário ao objeto de requisição
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Não autorizado para acessar esta rota'
    });
  }
};

// Middleware para restringir acesso com base no papel do usuário
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Usuário com papel ${req.user.role} não está autorizado a acessar esta rota`
      });
    }
    next();
  };
};