const Teflon = require('../models/Teflon');
const Machine = require('../models/Machine');
const moment = require('moment');

// @desc    Registrar uma nova troca de Teflon
// @route   POST /api/teflon
// @access  Private (Operator, Leader, Manager)
exports.registerTeflonChange = async (req, res) => {
  try {
    const { machineId, panel, weldingHeads, batchNumber, supplier, notes } = req.body;

    // Validar campos obrigatórios
    if (!panel || !weldingHeads || !Array.isArray(weldingHeads) || weldingHeads.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Painel e cabeçotes de solda são obrigatórios'
      });
    }

    // Verificar se a máquina existe
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Máquina não encontrada'
      });
    }

    // Validar range dos cabeçotes baseado no painel
    const isValidRange = panel === 'frontal' 
      ? weldingHeads.every(head => head >= 1 && head <= 28)
      : weldingHeads.every(head => head >= 29 && head <= 56);
    
    if (!isValidRange) {
      return res.status(400).json({
        success: false,
        message: `Cabeçotes inválidos para painel ${panel}. Frontal: 1-28, Traseiro: 29-56`
      });
    }

    // Calcular data de expiração (3 meses após a troca ou usar data personalizada para testes)
    const replacementDate = new Date();
    let expirationDate;
    
    if (req.body.expirationDate) {
      // Usar data personalizada EXATAMENTE como recebida
      expirationDate = new Date(req.body.expirationDate);
    } else {
      // Calcular automaticamente
      expirationDate = moment(replacementDate).add(3, 'months').toDate();
    }
    

    
    // Criar o registro de troca de Teflon
    const teflon = await Teflon.create({
      machineId: machineId,
      panel,
      weldingHeads,
      replacedBy: req.user.id,
      replacementDate,
      expirationDate,
      batchNumber,
      supplier,
      notes
    });

    // Populate para retornar dados completos
    const populatedTeflon = await Teflon.findById(teflon._id)
      .populate('machineId', 'code name location')
      .populate('replacedBy', 'name');

    res.status(201).json({
      success: true,
      data: populatedTeflon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar troca de Teflon',
      error: error.message
    });
  }
};

// @desc    Obter todas as trocas de Teflon
// @route   GET /api/teflon
// @access  Private (Leader, Manager)
exports.getTeflonChanges = async (req, res) => {
  try {
    // Filtros
    const filter = {};
    
    // Se for operador, mostrar apenas suas próprias trocas
    if (req.user.role === 'operator') {
      filter.replacedBy = req.user._id;
    }
    
    // Filtrar por máquina
    if (req.query.machine) {
      filter.machine = req.query.machine;
    }
    
    // Filtrar por operador que realizou a troca
    if (req.query.replacedBy) {
      filter.replacedBy = req.query.replacedBy;
    }
    
    // Filtrar por data de substituição
    if (req.query.startDate && req.query.endDate) {
      filter.replacementDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Filtrar por Teflons próximos da expiração
    if (req.query.nearExpiration === 'true') {
      const today = new Date();
      const fifteenDaysFromNow = moment(today).add(15, 'days').toDate();
      
      filter.expirationDate = {
        $gt: today,
        $lte: fifteenDaysFromNow
      };
    }
    
    // Filtrar por Teflons expirados
    if (req.query.expired === 'true') {
      filter.expirationDate = { $lt: new Date() };
    }

    // Paginação
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Buscar trocas de Teflon
    const teflonChanges = await Teflon.find(filter)
      .populate('machineId', 'code name location')
      .populate('replacedBy', 'name username')
      .sort({ replacementDate: -1 })
      .skip(skip)
      .limit(limit);

    // Contar total de trocas
    const total = await Teflon.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: teflonChanges.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: teflonChanges
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar trocas de Teflon',
      error: error.message
    });
  }
};

// @desc    Obter uma troca de Teflon específica
// @route   GET /api/teflon/:id
// @access  Private (Operator, Leader, Manager)
exports.getTeflonChange = async (req, res) => {
  try {
    const teflon = await Teflon.findById(req.params.id)
      .populate('machineId', 'code name type location')
      .populate('replacedBy', 'name username email');

    if (!teflon) {
      return res.status(404).json({
        success: false,
        message: 'Registro de troca de Teflon não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: teflon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar registro de troca de Teflon',
      error: error.message
    });
  }
};

// @desc    Atualizar uma troca de Teflon
// @route   PUT /api/teflon/:id
// @access  Private (Leader, Manager)
exports.updateTeflonChange = async (req, res) => {
  try {
    const { replacementDate, batchNumber, supplier, notes } = req.body;

    const teflon = await Teflon.findById(req.params.id);

    if (!teflon) {
      return res.status(404).json({
        success: false,
        message: 'Registro de troca de Teflon não encontrado'
      });
    }

    // Atualizar campos
    if (replacementDate) teflon.replacementDate = replacementDate;
    if (batchNumber) teflon.batchNumber = batchNumber;
    if (supplier) teflon.supplier = supplier;
    if (notes !== undefined) teflon.notes = notes;

    await teflon.save();

    res.status(200).json({
      success: true,
      data: teflon
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar registro de troca de Teflon',
      error: error.message
    });
  }
};

// @desc    Obter estatísticas de trocas de Teflon
// @route   GET /api/teflon/stats
// @access  Private (Leader, Manager)
exports.getTeflonStats = async (req, res) => {
  try {
    // Período de tempo (padrão: últimos 12 meses)
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate) 
      : moment().subtract(12, 'months').toDate();
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate) 
      : new Date();

    // Estatísticas gerais
    const totalChanges = await Teflon.countDocuments({
      replacementDate: { $gte: startDate, $lte: endDate }
    });

    // Teflons próximos da expiração
    const today = new Date();
    const fifteenDaysFromNow = moment(today).add(15, 'days').toDate();
    
    const nearExpirationCount = await Teflon.countDocuments({
      expirationDate: {
        $gt: today,
        $lte: fifteenDaysFromNow
      }
    });

    // Teflons expirados
    const expiredCount = await Teflon.countDocuments({
      expirationDate: { $lt: today }
    });

    // Estatísticas por máquina
    const changesByMachine = await Teflon.aggregate([
      {
        $match: {
          replacementDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$machine',
          count: { $sum: 1 },
          lastReplacement: { $max: '$replacementDate' }
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
          lastReplacement: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Estatísticas por operador
    const changesByOperator = await Teflon.aggregate([
      {
        $match: {
          replacementDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$replacedBy',
          count: { $sum: 1 },
          lastReplacement: { $max: '$replacementDate' }
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
          lastReplacement: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Estatísticas por mês
    const changesByMonth = await Teflon.aggregate([
      {
        $match: {
          replacementDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$replacementDate' },
            month: { $month: '$replacementDate' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          monthYear: {
            $concat: [
              { $toString: '$_id.month' },
              '/',
              { $toString: '$_id.year' }
            ]
          }
        }
      },
      {
        $sort: {
          year: 1,
          month: 1
        }
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
          totalChanges,
          nearExpirationCount,
          expiredCount,
          monthlyAverage: totalChanges > 0 ? totalChanges / changesByMonth.length : 0
        },
        byMachine: changesByMachine,
        byOperator: changesByOperator,
        byMonth: changesByMonth
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas de trocas de Teflon',
      error: error.message
    });
  }
};

// @desc    Obter alertas de Teflon
// @route   GET /api/teflon/alerts
// @access  Private (Operator, Leader, Manager)
exports.getTeflonAlerts = async (req, res) => {
  try {
    const today = new Date();
    const fifteenDaysFromNow = moment(today).add(15, 'days').toDate();
    
    // Teflons próximos da expiração
    const nearExpiration = await Teflon.find({
      expirationDate: {
        $gt: today,
        $lte: fifteenDaysFromNow
      },
      alertSent: false
    })
      .populate('machineId', 'code name location')
      .populate('replacedBy', 'name username')
      .sort({ expirationDate: 1 });
    
    // Teflons expirados
    const expired = await Teflon.find({
      expirationDate: { $lt: today }
    })
      .populate('machineId', 'code name location')
      .populate('replacedBy', 'name username')
      .sort({ expirationDate: 1 });
    
    // Marcar alertas como enviados
    if (nearExpiration.length > 0) {
      await Teflon.updateMany(
        { _id: { $in: nearExpiration.map(t => t._id) } },
        { alertSent: true }
      );
    }

    res.status(200).json({
      success: true,
      data: {
        nearExpiration: nearExpiration.map(teflon => ({
          _id: teflon._id,
          machine: teflon.machineId,
          replacementDate: teflon.replacementDate,
          expirationDate: teflon.expirationDate,
          daysUntilExpiration: Math.ceil((teflon.expirationDate - today) / (1000 * 60 * 60 * 24)),
          batchNumber: teflon.batchNumber,
          supplier: teflon.supplier
        })),
        expired: expired.map(teflon => ({
          _id: teflon._id,
          machine: teflon.machineId,
          replacementDate: teflon.replacementDate,
          expirationDate: teflon.expirationDate,
          daysExpired: Math.ceil((today - teflon.expirationDate) / (1000 * 60 * 60 * 24)),
          batchNumber: teflon.batchNumber,
          supplier: teflon.supplier
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar alertas de Teflon',
      error: error.message
    });
  }
};