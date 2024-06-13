# LLMWhispererClient Module

## Overview
This module provides the `LLMWhispererClient` class to interact with the LLMWhisperer API and the `LLMWhispererClientException` class to handle exceptions that may occur during API interactions.


## Environment Variables
These environment variables can be used to configure the client but are **optional**. You may use them to override the default values. If `LLMWHISPERER_API_KEY` is not set, you must provide the API key in the options object when creating a new client.

* `LLMWHISPERER_API_KEY`: The API key to use for authenticating requests to the API.
* `LLMWHISPERER_BASE_URL` : The base URL of the API.
* `LLMWHISPERER_LOG_LEVEL` : The logging level to use. Possible values are `error`, `warn`, `info`, `debug`

## Classes

### LLMWhispererClientException
This class extends the built-in `Error` class to handle exceptions specific to the LLMWhisperer API.

#### Constructor
- `constructor(message, statusCode)`
  - `message` (string): The error message.
  - `statusCode` (number): The HTTP status code.

#### Methods
- `errorMessage()`
  - Returns the error message.

### LLMWhispererClient
Represents a client for the LLMWhisperer API.

#### Constructor
- `constructor({ baseUrl = '', apiKey = '', apiTimeout = 120, loggingLevel = '' } = {})`
  - `baseUrl` (string): The base URL for the API.
  - `apiKey` (string): The API key for authentication.
  - `apiTimeout` (number): The timeout duration for API requests, in seconds.
  - `loggingLevel` (string): The logging level (e.g., 'debug', 'info', 'warn', 'error').

#### Properties
- `baseUrl` (string): The base URL for the API.
- `apiKey` (string): The API key used for authentication.
- `apiTimeout` (number): The timeout for API requests.
- `loggingLevel` (string): The logging level for the client.
- `logger` (Object): The logger used by the client, initialized in the constructor.

## Methods

### getUsageInfo
Retrieves usage information from the API.

- `async getUsageInfo()`
  - **Returns**: A promise that resolves to an object containing usage information.

### whisper
Processes a file using the whisper API.

- `async whisper({ filePath = '', url = '', processingMode = 'ocr', outputMode = 'line-printer', pageSeparator = '<<<', forceTextProcessing = false, pagesToExtract = '', timeout = 200, storeMetadataForHighlighting = false, medianFilterSize = 0, gaussianBlurRadius = 0, ocrProvider = 'advanced', lineSplitterTolerance = 0.4, horizontalStretchFactor = 1.0 } = {})`
  - `filePath` (string): The path to the file to be processed.
  - `url` (string): The URL of the file to be processed.
  - `processingMode` (string): The mode of processing, e.g., 'ocr'.
  - `outputMode` (string): The mode of output, e.g., 'line-printer'.
  - `pageSeparator` (string): The separator for pages in the output.
  - `forceTextProcessing` (boolean): Whether to force text processing.
  - `pagesToExtract` (string): The specific pages to extract.
  - `timeout` (number): The timeout for the request, in seconds.
  - `storeMetadataForHighlighting` (boolean): Whether to store metadata for highlighting.
  - `medianFilterSize` (number): The size of the median filter.
  - `gaussianBlurRadius` (number): The radius of the Gaussian blur.
  - `ocrProvider` (string): The OCR provider to use.
  - `lineSplitterTolerance` (number): The tolerance for splitting lines.
  - `horizontalStretchFactor` (number): The horizontal stretch factor.
  - **Returns**: A promise that resolves to the response from the whisper API.
  - **Throws**: `LLMWhispererClientException` if there is an error in the request.

### whisperStatus
Retrieves the status of a whisper operation using the provided whisper hash.

- `async whisperStatus(whisperHash)`
  - `whisperHash` (string): The hash of the whisper operation whose status is to be retrieved.
  - **Returns**: A promise that resolves with an object containing the status of the whisper operation.
  - **Throws**: `LLMWhispererClientException` if an error occurs during the operation.

### whisperRetrieve
Retrieves the result of a whisper operation using the provided whisper hash.

- `async whisperRetrieve(whisperHash)`
  - `whisperHash` (string): The hash of the whisper operation whose result is to be retrieved.
  - **Returns**: A promise that resolves with an object containing the result of the whisper operation.
  - **Throws**: `LLMWhispererClientException` if an error occurs during the operation.

### highlightData
Highlights the specified text in the result of a whisper operation using the provided whisper hash.

- `async highlightData(whisperHash, searchText)`
  - `whisperHash` (string): The hash of the whisper operation whose result is to be highlighted.
  - `searchText` (string): The text to be highlighted.
  - **Returns**: A promise that resolves with an object containing the response from the highlight operation.
  - **Throws**: `LLMWhispererClientException` if an error occurs during the operation.

## Usage Example
Setup the client and use it to interact with the API.
```javascript
const { LLMWhispererClient, LLMWhispererClientException } = require('llmwhisperer');

const client = new LLMWhispererClient({ apiKey: 'your-api-key' });
```

Let's get the usage information

```javascript
(async () => {
    try {
        const usageInfo = await client.getUsageInfo();
        console.log('Usage Info:', usageInfo);
    } catch (error) {
        if (error instanceof LLMWhispererClientException) {
            console.error('LLMWhispererClientException:', error.errorMessage());
        } else {
            console.error('Unexpected Error:', error);
        }
    }
})();
```

Let's process a file using the whisper API

```javascript
(async () => {
    try {
        const whisperResponse = await client.whisper({ filePath: 'path/to/file.pdf' });
        console.log('Whisper Response:', whisperResponse);
    } catch (error) {
        if (error instanceof LLMWhispererClientException) {
            console.error('LLMWhispererClientException:', error.errorMessage());
        } else {
            console.error('Unexpected Error:', error);
        }
    }
})();
```

LLMWhisperer supports async extractions. So when a timeout occurs, LLMWhisperer will return `202` status code along with a whisper-hash. You can use this hash to check the status of the extraction. Once the extraction is complete, you can retrieve the result.

> Note that there is a system-wide timeout of 200 seconds and if the extraction is not complete within this time, the extraction will switch to async mode and you will have to use the retrieve method to fetch the extracted text

```javascript
whisper = await client.whisper({
        filePath: 'sample_files/credit_card.pdf',
        timeout: 1, //Forcing a 1 second timeout for testing
    });
//Keep checking the status until it is completed
statusX = whisper.status;
while (statusX === 'processing') {
    console.log('Processing... '+whisper['whisper-hash']);
    //Let's check every second
    await new Promise(r => setTimeout(r, 1000));
    whisperStatus = await client.whisperStatus(whisper['whisper-hash']);
    statusX = whisperStatus.status;
}
if (statusX === 'processed') {
    //Retrieve the result
    whisper = await client.whisperRetrieve(whisper['whisper-hash']);
    console.log(whisper);
} else {
    console.log('Error');
}
```


