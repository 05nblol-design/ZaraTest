const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Gerar token JWT
const generateToken = (id) => {
  return jwt.sign({ userId: id }, process.env.JWT_SECRET || 'zara-quality-system-secret-key', {
    expiresIn: 86400 // 24 horas em segundos
  });
};

// @desc    Registrar um novo usuário
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body;

    // Verificar se o usuário já existe
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já existe'
      });
    }

    // Criar o usuário
    const user = await User.create({
      username,
      password,
      name,
      email,
      role
    });

    // Gerar token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
};

// @desc    Login do usuário
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Usuário de teste temporário (para desenvolvimento sem MongoDB)
    if (username === 'admin' && password === '123456') {
      const token = generateToken('test-admin-id');
      return res.json({
        success: true,
        token,
        user: {
          id: 'test-admin-id',
          name: 'Administrador Teste',
          email: 'admin@test.com',
          username: 'admin',
          role: 'admin'
        }
      });
    }

    if (username === 'manager' && password === '123456') {
      const token = generateToken('test-manager-id');
      return res.json({
        success: true,
        token,
        user: {
          id: 'test-manager-id',
          name: 'Gestor Teste',
          email: 'manager@test.com',
          username: 'manager',
          role: 'manager'
        }
      });
    }

    // Verificar se o usuário existe no banco (quando MongoDB estiver disponível)
    try {
      const user = await User.findOne({ username }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Verificar senha
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Credenciais inválidas'
        });
      }

      // Gerar token
      const token = generateToken(user._id);

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (dbError) {
      // Se houver erro de conexão com o banco, retornar erro de credenciais
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// @desc    Obter usuário atual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do usuário',
      error: error.message
    });
  }
};

// @desc    Logout de usuário
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
};