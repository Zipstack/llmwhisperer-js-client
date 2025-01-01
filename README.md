# LLMWhisperer

[![NPM Version](https://img.shields.io/npm/v/llmwhisperer-client)](https://www.npmjs.com/package/llmwhisperer-client)
[![NPM License](https://img.shields.io/npm/l/llmwhisperer-client)](https://www.npmjs.com/package/llmwhisperer-client)
[![NPM Downloads](https://img.shields.io/npm/dm/llmwhisperer-client)](https://www.npmjs.com/package/llmwhisperer-client)

LLMs are powerful, but their output is as good as the input you provide. LLMWhisperer is a technology that presents data from complex documents (different designs and formats) to LLMs in a way that they can best understand. LLMWhisperer features include Layout Preserving Mode, Auto-switching between native text and OCR modes, proper representation of radio buttons and checkboxes in PDF forms as raw text, among other features. You can now extract raw text from complex PDF documents or images without having to worry about whether the document is a native text document, a scanned image or just a picture clicked on a smartphone. Extraction of raw text from invoices, purchase orders, bank statements, etc works easily for structured data extraction with LLMs powered by LLMWhisperer's Layout Preserving mode.

This is a JavaScript client for the LLMWhisper API.

Refer to the client documentation for more information: [LLMWhisperer Client Documentation](https://docs.unstract.com/llm_whisperer/python_client/llm_whisperer_js_client_intro)

## Installation

```bash
npm install llmwhisperer-client
```

## Environment Variables

These environment variables can be used to configure the client but are **optional**. You may use them to override the default values. If `LLMWHISPERER_API_KEY` is not set, you must provide the API key in the options object when creating a new client.

- `LLMWHISPERER_API_KEY`: The API key to use for authenticating requests to the API.
- `LLMWHISPERER_BASE_URL` : The base URL of the API.
- `LLMWHISPERER_LOG_LEVEL` : The logging level to use. Possible values are `error`, `warn`, `info`, `debug`

## Usage

```javascript
const { LLMWhispererClientV2 } = require("llmwhisperer-client");

// Create a new client

const options = {
  baseUrl: "<base URL>",
  apiKey: "<API key>",
  apiTimeout: 200,
  loggingLevel: "info",
};

// All the option keys are optional
// apiKey is required if LLMWHISPERER_API_KEY environment variable is not set
const client = new LLMWhispererClientV2(options);
//or
const client = new LLMWhispererClientV2();

// Use the client to interact with the API
```

## API

The LLMWhisperer provides the following methods:

- `whisper(options)`: Performs a whisper operation.
- `whisperStatus(whisperHash)`: Retrieves the status of a whisper operation.
- `whisperRetrieve(whisperHash)`: Retrieves the result of a whisper operation.
- `highlightData(whisperHash, searchText)`: Highlights the specified text in the result of a whisper operation.

## Error Handling

Errors are handled by the LLMWhispererClientException class. This class extends the built-in Error class and adds a `statusCode` property.

## Dependencies

- axios: Used for making HTTP requests.
- winston: Used for logging.

## License

This project is licensed under the MIT License.
