const Machine = require('./src/models/Machine');
const mongoose = require('mongoose');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/zara-quality', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Conectado ao MongoDB');
  
  try {
    // Verificar se a máquina já existe
    const existingMachine = await Machine.findOne({ code: 'QSSP001' });
    if (existingMachine) {
      console.log('Máquina QSSP001 já existe!');
      process.exit(0);
    }
    
    // Criar nova máquina
    const machine = new Machine({
      code: 'QSSP001',
      name: 'QSSP001',
      type: 'production',
      status: 'active',
      location: 'Linha de Produção 1'
    });
    
    await machine.save();
    console.log('Máquina QSSP001 criada com sucesso!');
    console.log('Dados da máquina:', machine);
    
  } catch (error) {
    console.error('Erro ao criar máquina:', error.message);
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Erro de conexão:', err.message);
  process.exit(1);
});