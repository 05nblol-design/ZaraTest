const Machine = require('./src/models/Machine');
const mongoose = require('mongoose');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/zara-quality', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Conectado ao MongoDB');
  
  try {
    // Criar nova máquina com código único
    const machineCode = `ZARA${Date.now().toString().slice(-4)}`;
    
    // Verificar se a máquina já existe
    const existingMachine = await Machine.findOne({ code: machineCode });
    if (existingMachine) {
      console.log(`Máquina ${machineCode} já existe!`);
      process.exit(0);
    }
    
    // Criar nova máquina
    const machine = new Machine({
      code: machineCode,
      name: `Máquina ${machineCode}`,
      type: 'production',
      status: 'active',
      location: 'Linha de Produção Principal'
    });
    
    await machine.save();
    console.log(`Máquina ${machineCode} criada com sucesso!`);
    console.log('Dados da máquina:', machine);
    
  } catch (error) {
    console.error('Erro ao criar máquina:', error.message);
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Erro de conexão:', err.message);
  process.exit(1);
});