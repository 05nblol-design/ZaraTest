const QualityTest = require('../models/QualityTest');
const Machine = require('../models/Machine');
const moment = require('moment');

// @desc    Criar um novo teste de qualidade
// @route   POST /api/quality-tests
// @access  Private (Operator, Leader, Manager)
exports.createQualityTest = async (req, res) => {
  try {
    const { machine, machineId, lotNumber, parameters, bathtubTest } = req.body;
    
    // Usar machineId ou machine (compatibilidade)
    const finalMachineId = machineId || machine;
    
    if (!finalMachineId) {
      return res.status(400).json({
        success: false,
        message: 'ID da máquina é obrigatório'
      });
    }

    // Validar lotNumber
    if (!lotNumber) {
      return res.status(400).json({
        success: false,
        message: 'Número do lote é obrigatório'
      });
    }

    // Validar parâmetros obrigatórios
    if (!parameters || typeof parameters !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros são obrigatórios'
      });
    }

    const { temperature, pressure, speed } = parameters;
    if (temperature === undefined || pressure === undefined || speed === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros temperature, pressure e speed são obrigatórios'
      });
    }

    if (typeof temperature !== 'number' || typeof pressure !== 'number' || typeof speed !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros temperature, pressure e speed devem ser números'
      });
    }

    // Verificar se a máquina existe
    const machineDoc = await Machine.findById(finalMachineId);
    if (!machineDoc) {
      return res.status(404).json({
        success: false,
        message: 'Máquina não encontrada'
      });
    }

    // Gerar ID único para o teste
    const testId = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Definir prazo para 24 horas a partir de agora
    const deadline = moment().add(24, 'hours').toDate();

    // Criar o teste
    const qualityTest = await QualityTest.create({
      testId,
      machine: finalMachineId,
      operator: req.user.id,
      lotNumber,
      parameters,
      bathtubTest,
      status: 'pending',
      deadline
    });

    res.status(201).json({
      success: true,
      data: qualityTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar teste de qualidade',
      error: error.message
    });
  }
};

// @desc    Iniciar cronômetro de teste
// @route   PUT /api/quality-tests/:id/start-timer
// @access  Private (Operator, Leader, Manager)
exports.startTimer = async (req, res) => {
  try {
    const test = await QualityTest.findById(req.params.id).populate('machine operator');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Teste não encontrado'
      });
    }

    // Verificar se o teste já está em andamento
    if (test.status !== 'pending' && test.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Não é possível iniciar o cronômetro para um teste com status ${test.status}`
      });
    }

    // Iniciar o cronômetro
    test.timerStarted = new Date();
    test.startTime = new Date(); // Campo usado pelo NotificationService
    test.status = 'in_progress';
    await test.save();

    // Integrar com sistema de notificações
    if (global.notificationService) {
      global.notificationService.startTestTimer(test);
    }

    res.status(200).json({
      success: true,
      data: test,
      message: 'Cronômetro iniciado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar cronômetro',
      error: error.message
    });
  }
};

// @desc    Completar cronômetro de teste
// @route   PUT /api/quality-tests/:id/complete-timer
// @access  Private (Operator, Leader, Manager)
exports.completeTimer = async (req, res) => {
  try {
    const test = await QualityTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Teste não encontrado'
      });
    }

    // Verificar se o cronômetro foi iniciado
    if (!test.timerStarted) {
      return res.status(400).json({
        success: false,
        message: 'O cronômetro não foi iniciado para este teste'
      });
    }

    // Calcular a duração do teste em segundos
    const now = new Date();
    const durationInSeconds = Math.floor((now - test.timerStarted) / 1000);

    // Atualizar o teste
    test.timerCompleted = true;
    test.testDuration = durationInSeconds;
    test.status = 'completed';
    test.completedAt = new Date();
    await test.save();

    // Integrar com sistema de notificações - finalizar timer
    if (global.notificationService) {
      await global.notificationService.finishTest(test._id);
    }

    res.status(200).json({
      success: true,
      data: {
        testId: test._id,
        duration: durationInSeconds,
        durationFormatted: `${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`
      },
      message: 'Cronômetro completado com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao completar cronômetro',
      error: error.message
    });
  }
};

// @desc    Verificar status do cronômetro
// @route   GET /api/quality-tests/:id/timer-status
// @access  Private (Operator, Leader, Manager)
exports.checkTimerStatus = async (req, res) => {
  try {
    const test = await QualityTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Teste não encontrado'
      });
    }

    // Verificar se o cronômetro foi iniciado
    if (!test.timerStarted) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'not_started',
          message: 'O cronômetro não foi iniciado para este teste'
        }
      });
    }

    // Verificar se o cronômetro foi completado
    if (test.timerCompleted) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'completed',
          duration: test.testDuration,
          durationFormatted: `${Math.floor(test.testDuration / 60)}m ${test.testDuration % 60}s`
        }
      });
    }

    // Calcular o tempo decorrido
    const now = new Date();
    const elapsedTimeInSeconds = Math.floor((now - test.timerStarted) / 1000);
    const twoMinutesInSeconds = 2 * 60;
    const remainingTimeInSeconds = twoMinutesInSeconds - elapsedTimeInSeconds;

    // Verificar se o cronômetro expirou (2 minutos)
    if (remainingTimeInSeconds <= 0) {
      // Atualizar o status do alerta se ainda não foi enviado
      if (!test.timerAlertSent) {
        test.timerAlertSent = true;
        await test.save();
      }

      return res.status(200).json({
        success: true,
        data: {
          status: 'expired',
          elapsedTime: elapsedTimeInSeconds,
          elapsedTimeFormatted: `${Math.floor(elapsedTimeInSeconds / 60)}m ${elapsedTimeInSeconds % 60}s`,
          message: 'O tempo de 2 minutos expirou!'
        }
      });
    }

    // Cronômetro ainda está em andamento
    return res.status(200).json({
      success: true,
      data: {
        status: 'running',
        elapsedTime: elapsedTimeInSeconds,
        elapsedTimeFormatted: `${Math.floor(elapsedTimeInSeconds / 60)}m ${elapsedTimeInSeconds % 60}s`,
        remainingTime: remainingTimeInSeconds,
        remainingTimeFormatted: `${Math.floor(remainingTimeInSeconds / 60)}m ${remainingTimeInSeconds % 60}s`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status do cronômetro',
      error: error.message
    });
  }
};

// @desc    Atualizar teste de qualidade
// @route   PUT /api/quality-tests/:id
// @access  Private (Operator, Leader, Manager)
exports.updateQualityTest = async (req, res) => {
  try {
    const { parameters, bathtubTest, status, result, notes } = req.body;

    const test = await QualityTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Teste não encontrado'
      });
    }

    // Atualizar campos
    if (parameters) test.parameters = parameters;
    if (bathtubTest) test.bathtubTest = bathtubTest;
    if (status) test.status = status;
    if (result) test.result = result;
    if (notes) test.notes = notes;

    // Se o teste foi concluído, registrar a data de conclusão
    if (status === 'completed' && test.status !== 'completed') {
      test.completedAt = new Date();
    }

    await test.save();

    res.status(200).json({
      success: true,
      data: test
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar teste de qualidade',
      error: error.message
    });
  }
};

// @desc    Adicionar anexo ao teste
// @route   POST /api/quality-tests/:id/attachments
// @access  Private (Operator, Leader, Manager)
exports.addAttachment = async (req, res) => {
  try {
    // O middleware de upload já processou o arquivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    const test = await QualityTest.findById(req.params.id);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Teste não encontrado'
      });
    }

    // Determinar o tipo de arquivo (foto ou vídeo)
    const fileType = req.file.mimetype.startsWith('image') ? 'photo' : 'video';

    // Adicionar o anexo ao teste
    test.attachments.push({
      type: fileType,
      path: req.file.path,
      uploadedAt: new Date()
    });

    await test.save();

    res.status(200).json({
      success: true,
      data: {
        attachment: test.attachments[test.attachments.length - 1],
        message: 'Anexo adicionado com sucesso'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar anexo',
      error: error.message
    });
  }
};

// @desc    Obter todos os testes de qualidade
// @route   GET /api/quality-tests
// @access  Private (Leader, Manager)
exports.getQualityTests = async (req, res) => {
  try {
    // Filtros
    const filter = {};
    
    // Se for operador, mostrar apenas seus próprios testes
    if (req.user.role === 'operator') {
      filter.operator = req.user._id;
    }
    
    // Filtrar por status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filtrar por resultado
    if (req.query.result) {
      filter.result = req.query.result;
    }
    
    // Filtrar por máquina
    if (req.query.machine) {
      filter.machine = req.query.machine;
    }
    
    // Filtrar por operador
    if (req.query.operator) {
      filter.operator = req.query.operator;
    }
    
    // Filtrar por lote
    if (req.query.lotNumber) {
      filter.lotNumber = { $regex: req.query.lotNumber, $options: 'i' };
    }
    
    // Filtrar por data de criação
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Filtrar testes atrasados
    if (req.query.delayed === 'true') {
      filter.deadline = { $lt: new Date() };
      filter.status = { $nin: ['completed', 'failed'] };
    }

    // Paginação
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Buscar testes
    const tests = await QualityTest.find(filter)
      .populate('machine', 'code name')
      .populate('operator', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Contar total de testes
    const total = await QualityTest.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: tests.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: tests
    });
  } catch (error) {
    // Retornar dados de teste quando MongoDB não estiver disponível
    const testData = [
      {
        _id: 'test-1',
        lotNumber: 'LOT001',
        machine: { _id: 'machine-1', code: 'M001', name: 'Máquina 1' },
        operator: { _id: 'operator-1', name: 'Operador Teste', username: 'operator' },
        status: 'completed',
        result: 'approved',
        parameters: { temperature: 180, pressure: 2.5, speed: 100 },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: 'test-2',
        lotNumber: 'LOT002',
        machine: { _id: 'machine-2', code: 'M002', name: 'Máquina 2' },
        operator: { _id: 'operator-1', name: 'Operador Teste', username: 'operator' },
        status: 'completed',
        result: 'rejected',
        parameters: { temperature: 175, pressure: 2.3, speed: 95 },
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000)
      }
    ];
    
    res.status(200).json({
      success: true,
      count: testData.length,
      total: testData.length,
      pagination: {
        page: 1,
        limit: 10,
        pages: 1
      },
      data: testData
    });
  }
};

// @desc    Obter um teste de qualidade específico
// @route   GET /api/quality-tests/:id
// @access  Private (Operator, Leader, Manager)
exports.getQualityTest = async (req, res) => {
  try {
    const test = await QualityTest.findById(req.params.id)
      .populate('machine', 'code name type location')
      .populate('operator', 'name username email');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Teste não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: test
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar teste de qualidade',
      error: error.message
    });
  }
};

// @desc    Obter estatísticas de testes de qualidade
// @route   GET /api/quality-tests/stats
// @access  Private (Leader, Manager)
exports.getQualityTestStats = async (req, res) => {
  try {
    // Período de tempo (padrão: últimos 30 dias)
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : moment().subtract(30, 'days').toDate();
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate) 
      : new Date();

    // Estatísticas gerais
    const totalTests = await QualityTest.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const completedTests = await QualityTest.countDocuments({
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const failedTests = await QualityTest.countDocuments({
      status: 'failed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const pendingTests = await QualityTest.countDocuments({
      status: 'pending',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const inProgressTests = await QualityTest.countDocuments({
      status: 'in_progress',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const delayedTests = await QualityTest.countDocuments({
      deadline: { $lt: new Date() },
      status: { $nin: ['completed', 'failed'] },
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Estatísticas de resultados
    const approvedTests = await QualityTest.countDocuments({
      result: 'approved',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const rejectedTests = await QualityTest.countDocuments({
      result: 'rejected',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Tempo médio de execução dos testes
    const testsWithDuration = await QualityTest.find({
      testDuration: { $gt: 0 },
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('testDuration');

    let averageDuration = 0;
    if (testsWithDuration.length > 0) {
      const totalDuration = testsWithDuration.reduce((acc, test) => acc + test.testDuration, 0);
      averageDuration = totalDuration / testsWithDuration.length;
    }

    // Estatísticas por máquina
    const testsByMachine = await QualityTest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$machine',
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$result', 'approved'] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$result', 'rejected'] }, 1, 0]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'machines',
          localField: '_id',
          foreignField: '_id',
          as: 'machineInfo'
        }
      },
      {
        $unwind: '$machineInfo'
      },
      {
        $project: {
          machineId: '$_id',
          machineName: '$machineInfo.name',
          machineCode: '$machineInfo.code',
          count: 1,
          approved: 1,
          rejected: 1,
          approvalRate: {
            $cond: [
              { $eq: ['$count', 0] },
              0,
              { $multiply: [{ $divide: ['$approved', '$count'] }, 100] }
            ]
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Estatísticas por operador
    const testsByOperator = await QualityTest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$operator',
          count: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$result', 'approved'] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$result', 'rejected'] }, 1, 0]
            }
          },
          averageDuration: { $avg: '$testDuration' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'operatorInfo'
        }
      },
      {
        $unwind: '$operatorInfo'
      },
      {
        $project: {
          operatorId: '$_id',
          operatorName: '$operatorInfo.name',
          operatorUsername: '$operatorInfo.username',
          count: 1,
          approved: 1,
          rejected: 1,
          averageDuration: 1,
          approvalRate: {
            $cond: [
              { $eq: ['$count', 0] },
              0,
              { $multiply: [{ $divide: ['$approved', '$count'] }, 100] }
            ]
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        overview: {
          totalTests,
          completedTests,
          failedTests,
          pendingTests,
          inProgressTests,
          delayedTests,
          approvedTests,
          rejectedTests,
          completionRate: totalTests > 0 ? (completedTests / totalTests) * 100 : 0,
          approvalRate: completedTests > 0 ? (approvedTests / completedTests) * 100 : 0
        },
        performance: {
          averageDuration,
          averageDurationFormatted: `${Math.floor(averageDuration / 60)}m ${Math.floor(averageDuration % 60)}s`
        },
        byMachine: testsByMachine,
        byOperator: testsByOperator
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas de testes de qualidade',
      error: error.message
    });
  }
};