# LLMWhisperer JavaScript Client

:::note
This documentation is for the V2 version of the LLMWhisperer API. The corresponding Javascript/NodeJS client version is `2.x.y`. V1 and V2 are not backward compatible.
:::

This Javascript client provides a simple and efficient way to interact with the LLMWhisperer API. LLMWhisperer is a technology that presents data from complex documents (different designs and formats) to LLMs in a way that they can best understand.

## Features

- Easy to use Javascript interface.
- Handles all the HTTP requests and responses for you.
- Raises Javascript exceptions for API errors.

## Installation

```bash
npm install llmwhisperer-client
```

## Environment Variables
| Variable | Description |
| --- | --- |
| LLMWHISPERER_BASE_URL_V2 | The base URL of the API. When left undefined, default `https://llmwhisperer-api.unstract.com/api/v2` is used |
| LLMWHISPERER_API_KEY | The API key to use for authenticating requests to the API. |
| LLMWHISPERER_LOGGING_LEVEL | The logging level to use. Possible values are `error`, `warn`, `info`, `debug` |

All environment variables are optional. If `LLMWHISPERER_API_KEY` is not set, you must provide the API key when creating a new client. The environment variables can be overridden by providing the values in the client constructor.

## Usage

```javascript
const { LLMWhispererClientV2 } = require("llmwhisperer-client");

// Create a new client

const options = {
  baseUrl: "<base URL>",
  apiKey: "<API key>",
  loggingLevel: "info",
};

// All the option keys are optional
// apiKey is required if LLMWHISPERER_API_KEY environment variable is not set
const client = new LLMWhispererClientV2(options);
//or
const client = new LLMWhispererClientV2();

```

### Manual polling for the result

```javascript
// Simplest use with a file path as input
whisper = await client.whisper({
  filePath: 'sample_files/restaurant_invoice_photo.pdf'
});
// or with more options set
whisper = await client.whisper({
    filePath: 'sample_files/credit_card.pdf',
    mode: 'high_quality',
    pagesToExtract: '1-2',
});

// Poll for the status
// whisper_hash is available in the 'whisper_hash' field of the result of the whisper operation
whisper_status = await client.whisperStatus(whisper.whisper_hash);

// Retrieve the result
whisper_result = await client.whisperRetrieve(whisper.whisper_hash);
```

### Wait for completion in sync mode
Note that this is a blocking call and will wait for the extraction to complete.

```javascript
whisper = await client.whisper({
    filePath: 'sample_files/restaurant_invoice_photo.pdf',
    waitForCompletion: true,
    waitTimeout: 120,
});
```
## API

The LLMWhisperer provides the following methods which are analogous to the API endpoints:

- `whisper`: Performs a whisper operation.
- `whisperStatus`: Retrieves the status of a whisper operation.
- `whisperRetrieve`: Retrieves the result of a whisper operation.
- `getUsageInfo`: Retrieves the usage information of the LLMWhisperer API.
- `registerWebhook`: Registers a webhook URL for receiving whisper results.
- `getWebhookDetails`: Retrieves the details of a registered webhook.

## Error Handling

Errors are handled by the LLMWhispererClientException class. This class extends the built-in Error class and adds a `statusCode` property.

## Result format

### `whisper`

The `whisper` method returns a dictionary 

#### For Asyn operation (default)

```json
{
    "message": "Whisper Job Accepted",
    "status": "processing",
    "whisper_hash": "XXX37efd|XXXXXXXe92b30823c4ed3da759ef670f",
    "status_code": 202,
    "extraction": {}
}
```
The `whisper_hash` can be used to check the status of the extraction and retrieve the result. `extraction` will be empty for async operations.

#### For Sync operation

```json
{
    "message": "Whisper Job Accepted",
    "status": "processed",
    "whisper_hash": "XXX37efd|XXXXXXXe92b30823c4ed3da759ef670f",
    "status_code": 200,
    "extraction": {
        "confidence_metadata" : [],
        "line_metadata" : [],
        "metadata" : {},
        "result_text" : "<Extracted Text>",
        "webhook_metadata" : ""
    }
}
```

## Dependencies

- axios: Used for making HTTP requests.
- winston: Used for logging.

## License

This project is licensed under the MIT License.
