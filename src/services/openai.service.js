// backend/src/services/openai.service.js
const OpenAI = require('openai');
const fs = require('fs');
const { Readable } = require('stream');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Serviço para interação com a API da OpenAI
 */
class OpenAIService {
  /**
   * Gera resposta do modelo GPT
   * @param {Array} messages - Histórico de mensagens da conversa
   * @param {String} systemPrompt - Prompt do sistema para configurar a personalidade
   * @returns {Promise<Object>} - Resposta do modelo GPT
   */
  async generateResponse(messages, systemPrompt) {
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.GPT_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt || "Você é Fernanda, uma recrutadora especialista do DevClub. Você é especialista em transição de carreira e ajuda programadores a conseguirem empregos. Seja profissional mas amigável."
          },
          ...messages
        ],
      });

      return completion.choices[0].message;
    } catch (error) {
      console.error('Erro ao gerar resposta GPT:', error);
      throw new Error(`Falha ao comunicar com a API da OpenAI: ${error.message}`);
    }
  }

  /**
   * Converte texto para áudio usando TTS
   * @param {String} text - Texto a ser convertido em áudio
   * @returns {Promise<Buffer>} - Buffer do áudio gerado
   */
  async textToSpeech(text) {
    try {
      const mp3 = await openai.audio.speech.create({
        model: process.env.TTS_MODEL,
        voice: process.env.TTS_VOICE,
        input: text,
      });

      // Método para versão mais recente da biblioteca OpenAI
      if (typeof mp3.arrayBuffer === 'function') {
        const arrayBuffer = await mp3.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } 
      // Fallback para versões mais antigas ou diferentes formatos
      else if (Buffer.isBuffer(mp3.body)) {
        return mp3.body;
      } 
      else {
        // Último recurso: trate como buffer binário direto
        return Buffer.from(mp3);
      }
    } catch (error) {
      console.error('Erro ao converter texto para fala:', error);
      throw new Error(`Falha na conversão de texto para fala: ${error.message}`);
    }
  }

  /**
   * Converte áudio para texto usando Whisper
   * @param {Buffer} audioBuffer - Buffer do áudio a ser transcrito
   * @returns {Promise<String>} - Texto transcrito
   */
  async speechToText(audioBuffer) {
    try {
      // Cria arquivo temporário
      const tempFilePath = `./temp-audio-${Date.now()}.webm`;
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      // Transcreve com Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: process.env.STT_MODEL,
        language: "pt", // Português por padrão
      });
      
      // Remove arquivo temporário
      fs.unlinkSync(tempFilePath);
      
      return transcription.text;
    } catch (error) {
      console.error('Erro ao transcrever áudio:', error);
      throw new Error(`Falha na transcrição do áudio: ${error.message}`);
    }
  }
}

module.exports = new OpenAIService();