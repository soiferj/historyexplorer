const { default: ModelClient } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");
const { OpenAI } = require('openai');

class ModelProvider {
  constructor(modelName) {
    this.modelName = modelName;
  }
  async chatCompletion(messages, options = {}) {
    throw new Error('Not implemented');
  }
}

class OpenAIProvider extends ModelProvider {
  constructor(modelName) {
    super(modelName);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  async chatCompletion(messages, options = {}) {
    const { max_tokens = 2048, temperature = 0.1 } = options;
    const resp = await this.openai.chat.completions.create({
      model: this.modelName,
      messages,
      max_tokens,
      temperature
    });
    return resp.choices[0].message.content.trim();
  }
}

class AzureProvider extends ModelProvider {
  constructor(modelName, deploymentName) {
    super(modelName);
    this.deploymentName = deploymentName;
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.key = process.env.AZURE_OPENAI_KEY;
    this.client = new ModelClient(this.endpoint, new AzureKeyCredential(this.key));
  }
  async chatCompletion(messages, options = {}) {
    const { max_tokens = 2048, temperature = 0.1 } = options;
    try {
      // Convert OpenAI message format to Azure's
      const result = await this.client.path('/chat/completions')
          .post({
              body: {
                  messages: messages,
                  max_tokens: max_tokens,
                  temperature: temperature,
                  model: this.deploymentName,
              },
          });

      const body = result && result.body ? result.body : null;
      console.log('Azure response:', JSON.stringify(body));

      // If Azure returned an error object in body, surface that message
      if (body && body.error) {
        // body.error can be a string or an object with message
        let errMsg = '';
        if (typeof body.error === 'string') errMsg = body.error;
        else if (body.error.message) errMsg = body.error.message;
        else errMsg = JSON.stringify(body.error);
        throw new Error(`Azure error: ${errMsg}`);
      }

      // Validate choices structure before accessing it
      if (!body || !Array.isArray(body.choices) || !body.choices[0] || !body.choices[0].message || !body.choices[0].message.content) {
        // Try to include helpful diagnostic information from the body
        const snippet = body ? JSON.stringify(body).slice(0, 2000) : `status: ${result && result.status}`;
        throw new Error(`Unexpected Azure response shape. ${snippet}`);
      }

      return body.choices[0].message.content.trim();
    } catch (err) {
      // Re-throw with a clearer prefix so callers can detect Azure provider errors
      if (err && err.message && !err.message.startsWith('Azure error:') && !err.message.startsWith('Unexpected Azure response')) {
        throw new Error(`AzureProvider error: ${err.message}`);
      }
      throw err;
    }
  }
}

// Model registry: map model name to provider and deployment
const modelRegistry = {
  'gpt-4.1-nano': () => new OpenAIProvider('gpt-4.1-nano'),
  'gpt-4.1-mini': () => new OpenAIProvider('gpt-4.1-mini'),
  'mistral-small': () => new AzureProvider('mistral-small', process.env.AZURE_MISTRAL_SMALL_DEPLOYMENT || 'mistral-small'),
  'llama-3-8b-instruct': () => new AzureProvider('llama-3-8b-instruct', process.env.AZURE_LLAMA3_8B_DEPLOYMENT || 'Meta-Llama-3.1-8B-Instruct'),
  'mistral-nemo': () => new AzureProvider('mistral-nemo', process.env.AZURE_MISTRAL_NEMO_DEPLOYMENT || 'Mistral-Nemo'),
  'gpt-4.1': () => new AzureProvider('gpt-4.1', process.env.AZURE_GPT_41_DEPLOYMENT || 'gpt-4.1'),
  'gpt-5-mini': () => new AzureProvider('gpt-5-mini', process.env.AZURE_GPT_5_MINI_DEPLOYMENT || 'gpt-5-mini'),
  'gpt-5-nano': () => new AzureProvider('gpt-5-nano', process.env.AZURE_GPT_5_NANO_DEPLOYMENT || 'gpt-5-nano'),
};

function getModelProvider(modelName) {
  if (modelRegistry[modelName]) return modelRegistry[modelName]();
  // Default to OpenAI nano
  return modelRegistry['gpt-4.1-nano']();
}

module.exports = { ModelProvider, OpenAIProvider, AzureProvider, getModelProvider };
