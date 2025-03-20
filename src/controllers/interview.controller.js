// backend/src/controllers/interview.controller.js
const path = require('path');
const fs = require('fs');
const openaiService = require('../services/openai.service');
const { v4: uuidv4 } = require('uuid');

// Diretório temporário para armazenar arquivos de áudio
const AUDIO_DIR = path.join(__dirname, '../../temp');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

/**
 * Controlador para gerenciar entrevistas simuladas
 */
const interviewController = {
  /**
   * Inicia uma nova entrevista
   */
  async startInterview(req, res) {
    try {
      const { type, customRequirements, systemPrompt } = req.body;
      
      if (!type) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tipo de entrevista inválido' 
        });
      }
      
      // Usa o systemPrompt fornecido ou constrói um padrão
      let finalSystemPrompt = systemPrompt || "Você é Fernanda, uma recrutadora do DevClub especializada em entrevistas para desenvolvedores. Seja profissional mas amigável.";
      
      // Adiciona requisitos customizados se fornecidos
      if (customRequirements) {
        finalSystemPrompt += `\n\nRequisitos adicionais para esta entrevista: ${customRequirements}`;
      }
      
      // Gera a primeira pergunta
      const initialMessage = {
        role: "user",
        content: "Olá, estou pronto para começar a entrevista. Por favor, faça a primeira pergunta."
      };
      
      const response = await openaiService.generateResponse([initialMessage], finalSystemPrompt);
      
      // Gera áudio para a primeira pergunta
      const audioBuffer = await openaiService.textToSpeech(response.content);
      const audioId = uuidv4();
      const audioPath = path.join(AUDIO_DIR, `${audioId}.mp3`);
      
      fs.writeFileSync(audioPath, audioBuffer);
      
      res.json({
        success: true,
        message: response.content,
        audioId,
        type,
        systemPrompt: finalSystemPrompt
      });
    } catch (error) {
      console.error('Erro ao iniciar entrevista:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao iniciar a entrevista' 
      });
    }
  },
  
  /**
   * Processa uma resposta do candidato e gera feedback
   */
  async processResponse(req, res) {
    try {
      const { userResponse, conversation, systemPrompt } = req.body;
      
      if (!userResponse || !conversation || !systemPrompt) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dados incompletos' 
        });
      }
      
      // Adiciona a resposta do usuário ao histórico da conversa
      const updatedConversation = [...conversation, {
        role: "user",
        content: userResponse
      }];
      
      // Adiciona instrução para gerar feedback
      const feedbackInstruction = {
        role: "user",
        content: "Por favor, avalie minha resposta anterior. Destaque os pontos fortes e sugira melhorias específicas. Após o feedback, faça a próxima pergunta da entrevista."
      };
      
      const messagesWithFeedbackRequest = [...updatedConversation, feedbackInstruction];
      
      // Gera feedback e próxima pergunta
      const response = await openaiService.generateResponse(messagesWithFeedbackRequest, systemPrompt);
      
      // Gera áudio para o feedback e próxima pergunta
      const audioBuffer = await openaiService.textToSpeech(response.content);
      const audioId = uuidv4();
      const audioPath = path.join(AUDIO_DIR, `${audioId}.mp3`);
      
      fs.writeFileSync(audioPath, audioBuffer);
      
      // Atualiza a conversa com a resposta da IA
      updatedConversation.push(feedbackInstruction);
      updatedConversation.push(response);
      
      res.json({
        success: true,
        message: response.content,
        audioId,
        conversation: updatedConversation
      });
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar a resposta' 
      });
    }
  },
  
  /**
   * Retorna um arquivo de áudio e o exclui após envio
   */
  async getAudio(req, res) {
    try {
      const { id } = req.params;
      const audioPath = path.join(AUDIO_DIR, `${id}.mp3`);
      
      if (!fs.existsSync(audioPath)) {
        return res.status(404).json({ 
          success: false, 
          message: 'Áudio não encontrado' 
        });
      }
      
      res.setHeader('Content-Type', 'audio/mpeg');
      
      // Cria um stream de leitura
      const readStream = fs.createReadStream(audioPath);
      
      // Tratamento de erro no stream
      readStream.on('error', (error) => {
        console.error('Erro ao ler arquivo de áudio:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Erro ao ler o arquivo de áudio'
          });
        }
      });
      
      // Quando o stream terminar, excluir o arquivo
      readStream.on('end', () => {
        fs.unlink(audioPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Erro ao excluir arquivo de áudio:', unlinkErr);
          } else {
            console.log(`Arquivo de áudio excluído com sucesso: ${audioPath}`);
          }
        });
      });
      
      // Pipe do stream para a resposta
      readStream.pipe(res);
    } catch (error) {
      console.error('Erro ao obter áudio:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao obter o arquivo de áudio' 
      });
    }
  }
};

module.exports = interviewController;