const mongoose = require('mongoose');
const Machine = require('./src/models/Machine');
const QualityTest = require('./src/models/QualityTest');
const Teflon = require('./src/models/Teflon');
const User = require('./src/models/User');
const OperationSession = require('./src/models/OperationSession');

// URI do MongoDB Atlas (produção)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://05:44092639@cluster0.hvggzox.mongodb.net/zaraqualitysystem?retryWrites=true&w=majority&appName=Cluster0';

async function populateProductionData() {
  try {
    console.log('🔗 Conectando ao MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB Atlas');

    // Criar máquinas de produção
    const machines = [
      {
        code: 'QSSP001',
        name: 'Máquina QSSP001',
        type: 'production',
        status: 'active',
        location: 'Linha de Produção 1'
      },
      {
        code: 'ZARA2024',
        name: 'Máquina ZARA2024',
        type: 'production',
        status: 'active',
        location: 'Linha de Produção 2'
      },
      {
        code: 'PROD001',
        name: 'Máquina PROD001',
        type: 'production',
        status: 'active',
        location: 'Linha de Produção 3'
      },
      {
        code: 'QUAL001',
        name: 'Máquina QUAL001',
        type: 'quality',
        status: 'active',
        location: 'Setor de Qualidade'
      },
      {
        code: 'MANU001',
        name: 'Máquina MANU001',
        type: 'maintenance',
        status: 'inactive',
        location: 'Setor de Manutenção'
      }
    ];

    console.log('🏭 Criando máquinas...');
    for (const machineData of machines) {
      const existingMachine = await Machine.findOne({ code: machineData.code });
      if (!existingMachine) {
        const machine = new Machine(machineData);
        await machine.save();
        console.log(`✅ Máquina ${machineData.code} criada`);
      } else {
        console.log(`ℹ️ Máquina ${machineData.code} já existe`);
      }
    }

    // Buscar usuários e máquinas para criar dados relacionados
    const users = await User.find();
    const createdMachines = await Machine.find();
    
    if (users.length > 0 && createdMachines.length > 0) {
      // Criar alguns testes de qualidade
      console.log('🧪 Criando testes de qualidade...');
      const testData = [
        {
          testId: 'TEST001-2024',
          machine: createdMachines[0]._id,
          operator: users.find(u => u.role === 'operator')?._id || users[0]._id,
          lotNumber: 'LOT001-2024',
          parameters: {
            temperature: 180,
            pressure: 2.5,
            speed: 150
          },
          bathtubTest: {
            performed: true,
            result: 'passed',
            notes: 'Teste realizado com sucesso'
          },
          result: 'approved',
          notes: 'Produto dentro dos padrões de qualidade',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          status: 'completed'
        },
        {
          testId: 'TEST002-2024',
          machine: createdMachines[1]._id,
          operator: users.find(u => u.role === 'operator')?._id || users[0]._id,
          lotNumber: 'LOT002-2024',
          parameters: {
            temperature: 175,
            pressure: 2.3,
            speed: 145
          },
          bathtubTest: {
            performed: true,
            result: 'passed',
            notes: 'Teste aprovado'
          },
          result: 'approved',
          notes: 'Qualidade excelente',
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          status: 'completed'
        }
      ];

      for (const test of testData) {
        const existingTest = await QualityTest.findOne({ lotNumber: test.lotNumber });
        if (!existingTest) {
          const qualityTest = new QualityTest(test);
          await qualityTest.save();
          console.log(`✅ Teste ${test.lotNumber} criado`);
        }
      }

      // Criar registros de teflon
      console.log('🔧 Criando registros de teflon...');
      const teflonData = [
        {
          machineId: createdMachines[0]._id,
          replacedBy: users.find(u => u.role === 'operator')?._id || users[0]._id,
          panel: 'frontal',
          weldingHeads: [1, 2, 3, 4],
          batchNumber: 'TEF001-2024',
          supplier: 'Fornecedor A',
          replacementDate: new Date(),
          expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 dias
          status: 'active'
        },
        {
          machineId: createdMachines[1]._id,
          replacedBy: users.find(u => u.role === 'operator')?._id || users[0]._id,
          panel: 'traseiro',
          weldingHeads: [29, 30, 31, 32],
          batchNumber: 'TEF002-2024',
          supplier: 'Fornecedor B',
          replacementDate: new Date(),
          expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
          status: 'active'
        }
      ];

      for (const teflon of teflonData) {
        const existingTeflon = await Teflon.findOne({ batchNumber: teflon.batchNumber });
        if (!existingTeflon) {
          const teflonRecord = new Teflon(teflon);
          await teflonRecord.save();
          console.log(`✅ Teflon ${teflon.batchNumber} criado`);
        }
      }

      // Criar sessões de operação
      console.log('⚙️ Criando sessões de operação...');
      const operatorUsers = users.filter(u => u.role === 'operator');
      const sessionData = [
        {
          user: operatorUsers[0]?._id || users[0]._id,
          machine: createdMachines[0]._id,
          operationActive: false,
          operationHistory: [
            {
              time: '14:30:00',
              action: 'Operação iniciada na máquina ' + createdMachines[0].name,
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
              time: '16:30:00',
              action: 'Operação finalizada',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
            }
          ]
        },
        {
          user: operatorUsers[1]?._id || users[1]._id,
          machine: createdMachines[1]._id,
          operationActive: true,
          operationHistory: [
            {
              time: '16:00:00',
              action: 'Operação iniciada na máquina ' + createdMachines[1].name,
              timestamp: new Date(Date.now() - 30 * 60 * 1000)
            }
          ]
        }
      ];

      for (let i = 0; i < sessionData.length; i++) {
        const session = sessionData[i];
        const existingSession = await OperationSession.findOne({
          user: session.user
        });
        
        if (!existingSession) {
          const operationSession = new OperationSession(session);
          await operationSession.save();
          console.log(`✅ Sessão de operação ${i + 1} criada`);
        } else {
          console.log(`ℹ️ Sessão para usuário ${i + 1} já existe`);
        }
      }
    }

    console.log('\n📊 Resumo dos dados criados:');
    const machineCount = await Machine.countDocuments();
    const testCount = await QualityTest.countDocuments();
    const teflonCount = await Teflon.countDocuments();
    const sessionCount = await OperationSession.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`👥 Usuários: ${userCount}`);
    console.log(`🏭 Máquinas: ${machineCount}`);
    console.log(`🧪 Testes de Qualidade: ${testCount}`);
    console.log(`🔧 Registros de Teflon: ${teflonCount}`);
    console.log(`⚙️ Sessões de Operação: ${sessionCount}`);

    console.log('\n✅ Dados de produção populados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao popular dados:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

// Executar o script
populateProductionData();