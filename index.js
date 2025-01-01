/**
 * @fileoverview This file contains the LLMWhispererClient and LLMWhispererClientException classes.
 * LLMWhispererClient is used to interact with the LLMWhisperer API.
 * LLMWhispererClientException is used to handle exceptions that occur while interacting with the API.
 * 
 * @requires axios
 * @requires winston
 * @requires fs
 * 
 * @const {string} BASE_URL - The base URL for the LLMWhisperer API.
 * 

 */

const axios = require("axios");
const winston = require("winston");
const fs = require("fs");
const { register } = require("module");

const BASE_URL = "https://llmwhisperer-api.unstract.com/v1";
const BASE_URL_V2 = "https://llmwhisperer-api.us-central.unstract.com/api/v2";

class LLMWhispererClientException extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }

  errorMessage() {
    return this.message;
  }
}

/**
 * @class LLMWhispererClient
 * @classdesc Represents a client for the LLMWhisperer API.
 * @constructor
 * @param {Object} [config={}] - The configuration object.
 * @param {string} [config.baseUrl=''] - The base URL for the API.
 * @param {string} [config.apiKey=''] - The API key for authentication.
 * @param {number} [config.apiTimeout=120] - The timeout duration for API requests, in seconds.
 * @param {string} [config.loggingLevel=''] - The logging level (e.g., 'debug','info', 'warn', 'error').
 
 * @property {string} baseUrl - The base URL for the API.
 * @property {string} apiKey - The API key used for authentication.
 * @property {number} apiTimeout - The timeout for API requests.
 * @property {string} loggingLevel - The logging level for the client.
 * @property {Object} logger - The logger used by the client. Initialized in the constructor.
 */

class LLMWhispererClient {
  constructor({
    baseUrl = "",
    apiKey = "",
    apiTimeout = 120,
    loggingLevel = "",
  } = {}) {
    const level =
      loggingLevel || process.env.LLMWHISPERER_LOGGING_LEVEL || "debug";

    this.logger = winston.createLogger({
      level: level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} - ${level}: ${message}`;
        }),
      ),
      transports: [new winston.transports.Console()],
    });

    this.logger.debug(`logging_level set to ${level}`);

    this.baseUrl = baseUrl || process.env.LLMWHISPERER_BASE_URL || BASE_URL;
    this.logger.debug(`base_url set to ${this.baseUrl}`);

    this.apiKey = apiKey || process.env.LLMWHISPERER_API_KEY || "";
    this.apiTimeout = apiTimeout;
  }

  /**
   * @function
   * @name getUsageInfo
   * @description This function retrieves usage information. Refer to the API documentation for more information.
   * @async
   * @returns {Object} Returns an object containing usage information.
   */
  async getUsageInfo() {
    this.logger.debug("get_usage_info called");
    const url = `${this.baseUrl}/get-usage-info`;
    this.logger.debug(`url: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: { "unstract-key": this.apiKey },
        timeout: this.apiTimeout * 1000,
      });
      return response.data;
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name whisper
   * @description This function processes a file using the whisper API. Refer to the API documentation for more information.
   * @async
   * @param {Object} options - The options for processing.
   * @param {string} [options.filePath=''] - The path to the file to be processed.
   * @param {string} [options.url=''] - The URL of the file to be processed.
   * @param {string} [options.processingMode='ocr'] - The mode of processing, e.g., 'ocr'.
   * @param {string} [options.outputMode='line-printer'] - The mode of output, e.g., 'line-printer'.
   * @param {string} [options.pageSeparator='<<<'] - The separator for pages in the output.
   * @param {boolean} [options.forceTextProcessing=false] - Whether to force text processing.
   * @param {string} [options.pagesToExtract=''] - The specific pages to extract.
   * @param {number} [options.timeout=200] - The timeout for the request, in seconds.
   * @param {boolean} [options.storeMetadataForHighlighting=false] - Whether to store metadata for highlighting.
   * @param {number} [options.medianFilterSize=0] - The size of the median filter.
   * @param {number} [options.gaussianBlurRadius=0] - The radius of the Gaussian blur.
   * @param {string} [options.ocrProvider='advanced'] - The OCR provider to use.
   * @param {number} [options.lineSplitterTolerance=0.4] - The tolerance for splitting lines.
   * @param {number} [options.horizontalStretchFactor=1.0] - The horizontal stretch factor.
   * @returns {Promise<Object>} The response from the whisper API.
   * @throws {LLMWhispererClientException} If there is an error in the request.
   */
  async whisper({
    filePath = "",
    url = "",
    processingMode = "ocr",
    outputMode = "line-printer",
    pageSeparator = "<<<",
    forceTextProcessing = false,
    pagesToExtract = "",
    timeout = 200,
    storeMetadataForHighlighting = false,
    medianFilterSize = 0,
    gaussianBlurRadius = 0,
    ocrProvider = "advanced",
    lineSplitterTolerance = 0.4,
    horizontalStretchFactor = 1.0,
  } = {}) {
    this.logger.debug("whisper called");
    const apiUrl = `${this.baseUrl}/whisper`;
    const params = {
      url,
      processing_mode: processingMode,
      output_mode: outputMode,
      page_seperator: pageSeparator,
      force_text_processing: forceTextProcessing,
      pages_to_extract: pagesToExtract,
      timeout,
      store_metadata_for_highlighting: storeMetadataForHighlighting,
      median_filter_size: medianFilterSize,
      gaussian_blur_radius: gaussianBlurRadius,
      ocr_provider: ocrProvider,
      line_splitter_tolerance: lineSplitterTolerance,
      horizontal_stretch_factor: horizontalStretchFactor,
    };

    this.logger.debug(`api_url: ${apiUrl}`);
    this.logger.debug(`params: ${JSON.stringify(params)}`);

    if (!url && !filePath) {
      throw new LLMWhispererClientException(
        "Either url or filePath must be provided",
        -1,
      );
    }

    if (timeout < 0 || timeout > 200) {
      throw new LLMWhispererClientException(
        "timeout must be between 0 and 200",
        -1,
      );
    }

    try {
      const options = {
        method: "post",
        url: apiUrl,
        headers: {
          "unstract-key": this.apiKey,
        },
        params,
        timeout: this.apiTimeout * 1000,
      };

      if (!url) {
        const file = fs.createReadStream(filePath);
        const fileStats = fs.statSync(filePath);
        options.data = file;
        options.headers["Content-Type"] = "application/octet-stream";
        options.headers["Content-Length"] = fileStats.size;
      }

      const response = await axios(options);

      if (response.status !== 200 && response.status !== 202) {
        const message = response.data;
        message.statusCode = response.status;
        throw new LLMWhispererClientException(message.message, response.status);
      }

      if (response.status === 202) {
        const message = response.data;
        message.statusCode = response.status;
        return message;
      }

      return {
        statusCode: response.status,
        extracted_text: response.data,
        whisper_hash: response.headers["whisper-hash"],
      };
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name whisperStatus
   * @description This function retrieves the status of a whisper operation using the provided whisper hash.
   * @async
   * @param {string} whisperHash - The hash of the whisper operation whose status is to be retrieved.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the status of the whisper operation. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   */
  async whisperStatus(whisperHash) {
    this.logger.debug("whisper_status called");
    const url = `${this.baseUrl}/whisper-status`;
    const params = { "whisper-hash": whisperHash };
    this.logger.debug(`url: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: { "unstract-key": this.apiKey },
        params,
        timeout: this.apiTimeout * 1000,
      });

      const message = response.data;
      message.statusCode = response.status;
      return message;
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name whisperRetrieve
   * @description This function retrieves the result of a whisper operation using the provided whisper hash.
   * @async
   * @param {string} whisperHash - The hash of the whisper operation whose result is to be retrieved.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the result of the whisper operation. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   */
  async whisperRetrieve(whisperHash) {
    this.logger.debug("whisper_retrieve called");
    const url = `${this.baseUrl}/whisper-retrieve`;
    const params = { "whisper-hash": whisperHash };
    this.logger.debug(`url: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: { "unstract-key": this.apiKey },
        params,
        timeout: this.apiTimeout * 1000,
      });

      return {
        statusCode: response.status,
        extracted_text: response.data,
      };
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name highlightData
   * @description This function highlights the specified text in the result of a whisper operation using the provided whisper hash.
   * @async
   * @param {string} whisperHash - The hash of the whisper operation whose result is to be highlighted.
   * @param {string} searchText - The text to be highlighted.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the response from the highlight operation. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   */
  async highlightData(whisperHash, searchText) {
    this.logger.debug("highlight_data called");
    const url = `${this.baseUrl}/highlight-data`;
    const params = { "whisper-hash": whisperHash };
    this.logger.debug(`url: ${url}`);

    try {
      const response = await axios.post(url, searchText, {
        headers: {
          "unstract-key": this.apiKey,
          "Content-Type": "text/plain",
        },
        params,
        timeout: this.apiTimeout * 1000,
      });

      const result = response.data;
      result.statusCode = response.status;
      return result;
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }
}

/**
 * @class LLMWhispererClientV2
 * @classdesc Represents a client for the LLMWhisperer API.
 * @constructor
 * @param {Object} [config={}] - The configuration object.
 * @param {string} [config.baseUrl=''] - The base URL for the API.
 * @param {string} [config.apiKey=''] - The API key for authentication.
 * @param {string} [config.loggingLevel=''] - The logging level (e.g., 'debug','info', 'warn', 'error').
 
 * @property {string} baseUrl - The base URL for the API.
 * @property {string} apiKey - The API key used for authentication.
 * @property {string} loggingLevel - The logging level for the client.
 * @property {Object} logger - The logger used by the client. Initialized in the constructor.
 */
class LLMWhispererClientV2 {
  constructor({ baseUrl = "", apiKey = "", loggingLevel = "" } = {}) {
    const level =
      loggingLevel || process.env.LLMWHISPERER_LOGGING_LEVEL || "debug";

    this.logger = winston.createLogger({
      level: level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} - ${level}: ${message}`;
        }),
      ),
      transports: [new winston.transports.Console()],
    });

    this.logger.debug(`logging_level set to ${level}`);

    this.baseUrl =
      baseUrl || process.env.LLMWHISPERER_BASE_URL_V2 || BASE_URL_V2;
    this.logger.debug(`base_url set to ${this.baseUrl}`);

    this.apiKey = apiKey || process.env.LLMWHISPERER_API_KEY || "";

    this.headers = {
      "unstract-key": this.apiKey,
      "Subscription-Id": "test", //TODO: Remove this line. For testing only
      "Start-Date": "9-07-2024", //TODO: Remove this line. For testing only
    };
  }

  /**
   * @function
   * @name getUsageInfo
   * @description This function retrieves usage information. Refer to the API documentation for more information.
   * @async
   * @returns {Object} Returns an object containing usage information.
   */
  async getUsageInfo() {
    this.logger.debug("get_usage_info called");
    const url = `${this.baseUrl}/get-usage-info`;
    this.logger.debug(`url: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        timeout: this.apiTimeout * 1000,
      });
      return response.data;
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name whisper
   * @description This function processes a file using the whisper API. Refer to the API documentation for more information.
   * @async
   * @param {Object} options - The options for processing.
   * @param {string} [options.filePath=''] - The path to the file to be processed.
   * @param {string} [options.url=''] - The URL of the file to be processed.
   * @param {string} [options.mode='high_quality'] - The mode of processing, e.g., 'high_quality'.
   * @param {string} [options.outputMode='line-printer'] - The mode of output, e.g., 'line-printer'.
   * @param {string} [options.pageSeparator='<<<'] - The separator for pages in the output.
   * @param {string} [options.pagesToExtract=''] - The specific pages to extract.
   * @param {number} [options.medianFilterSize=0] - The size of the median filter.
   * @param {number} [options.gaussianBlurRadius=0] - The radius of the Gaussian blur.
   * @param {number} [options.lineSplitterTolerance=0.4] - The tolerance for splitting lines.
   * @param {number} [options.horizontalStretchFactor=1.0] - The horizontal stretch factor.
   * @param {boolean} [options.markVerticalLines=false] - Whether to mark vertical lines.
   * @param {boolean} [options.markHorizontalLines=false] - Whether to mark horizontal lines.
   * @param {string} [options.lineSplitterStrategy='left-priority'] - The line splitter strategy.
   * @param {string} [options.lang='eng'] - The language to use.
   * @param {string} [options.tag='default'] - The tag to use.
   * @param {string} [options.filename=''] - The filename to use.
   * @param {string} [options.webhookMetadata=''] - The webhook metadata to use.
   * @param {string} [options.useWebhook=''] - Whether to use a webhook.
   * @param {boolean} [options.waitForCompletion=false] - Whether to wait for completion.
   * @param {number} [options.waitTimeout=180] - The timeout for waiting.
   * @returns {Promise<Object>} The response from the whisper API.
   * @throws {LLMWhispererClientException} If there is an error in the request.
   */
  async whisper({
    filePath = "",
    url = "",
    mode = "high_quality",
    outputMode = "line-printer",
    pageSeparator = "<<<",
    pagesToExtract = "",
    medianFilterSize = 0,
    gaussianBlurRadius = 0,
    lineSplitterTolerance = 0.4,
    horizontalStretchFactor = 1.0,
    markVerticalLines = false,
    markHorizontalLines = false,
    lineSplitterStrategy = "left-priority",
    lang = "eng",
    tag = "default",
    filename = "",
    webhookMetadata = "",
    useWebhook = "",
    waitForCompletion = false,
    waitTimeout = 180,
  } = {}) {
    this.logger.debug("whisper called");
    const apiUrl = `${this.baseUrl}/whisper`;
    const params = {
      url,
      mode: mode,
      output_mode: outputMode,
      page_seperator: pageSeparator,
      pages_to_extract: pagesToExtract,
      median_filter_size: medianFilterSize,
      gaussian_blur_radius: gaussianBlurRadius,
      line_splitter_tolerance: lineSplitterTolerance,
      horizontal_stretch_factor: horizontalStretchFactor,
      mark_vertical_lines: markVerticalLines,
      mark_horizontal_lines: markHorizontalLines,
      line_spitter_strategy: lineSplitterStrategy,
      lang: lang,
      tag: tag,
      filename: filename,
      webhook_metadata: webhookMetadata,
      use_webhook: useWebhook,
      wait_for_completion: waitForCompletion,
      wait_timeout: waitTimeout,
    };

    this.logger.debug(`api_url: ${apiUrl}`);
    this.logger.debug(`params: ${JSON.stringify(params)}`);

    if (!url && !filePath) {
      throw new LLMWhispererClientException(
        "Either url or filePath must be provided",
        -1,
      );
    }

    try {
      const options = {
        method: "post",
        url: apiUrl,
        headers: this.headers,
        params,
        timeout: 200 * 1000,
      };

      if (!url) {
        const file = fs.createReadStream(filePath);
        const fileStats = fs.statSync(filePath);
        options.data = file;
        options.headers["Content-Type"] = "application/octet-stream";
        options.headers["Content-Length"] = fileStats.size;
      }

      const response = await axios(options);

      if (response.status !== 200 && response.status !== 202) {
        const message = response.data;
        message.statusCode = response.status;
        throw new LLMWhispererClientException(message.message, response.status);
      }

      if (response.status === 202) {
        const message = response.data;
        message.statusCode = response.status;
        message.extraction = {};
        if (!waitForCompletion) {
          return message;
        }
        const whisperHash = message["whisper_hash"];
        const start_time = new Date();
        while (true) {
          const current_time = new Date();
          const elapsed_time = (current_time - start_time) / 1000;
          if (elapsed_time > waitTimeout) {
            message["extraction"] = {};
            message["status_code"] = -1;
            message["message"] = "Whisper client operation timed out";
            break;
          }
          const whisperStatus = await this.whisperStatus(whisperHash);
          if (whisperStatus.statusCode !== 200) {
            message["extraction"] = {};
            message["status_code"] = whisperStatus.statusCode;
            message["message"] = "Whisper client operation failed";
            break;
          }
          if (whisperStatus.status === "processing") {
            this.logger.debug("Status: processing");
          } else if (whisperStatus.status === "delivered") {
            this.logger.debug("Status: delivered");
            throw new LLMWhispererClientException(
              "Whisper operation already delivered",
              -1,
            );
          } else if (whisperStatus.status === "unknown") {
            this.logger.debug("Status: unknown");
            throw new LLMWhispererClientException(
              "Whisper operation status unknown",
              -1,
            );
          } else if (whisperStatus.status === "failed") {
            this.logger.debug("Status: failed");
            message["extraction"] = {};
            message["status_code"] = -1;
            message["message"] = "Whisper client operation failed";
            break;
          } else if (whisperStatus.status === "processed") {
            this.logger.debug("Status: processed");
            const whisperResult = await this.whisperRetrieve(whisperHash);
            message.status_code = 200;
            message.message = "Whisper operation completed";
            message.status = "processed";
            message.extraction = whisperResult.extraction;
            break;
          }
          this.logger.debug("Sleeping for 5 seconds");
          await new Promise((r) => setTimeout(r, 5000));
        }
        if ("status_code" in message) {
          if ("statusCode" in message) {
            delete message["statusCode"];
          }
        } else if ("statusCode" in message) {
          message.status_code = message.statusCode;
          delete message["statusCode"];
        }
        return message;
      }
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name whisperStatus
   * @description This function retrieves the status of a whisper operation using the provided whisper hash.
   * @async
   * @param {string} whisperHash - The hash of the whisper operation whose status is to be retrieved.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the status of the whisper operation. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   */
  async whisperStatus(whisperHash) {
    this.logger.debug("whisper_status called");
    const url = `${this.baseUrl}/whisper-status`;
    const params = { whisper_hash: whisperHash };
    this.logger.debug(`url: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        params,
        timeout: this.apiTimeout * 1000,
      });

      const message = response.data;
      message.statusCode = response.status;
      return message;
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name whisperRetrieve
   * @description This function retrieves the result of a whisper operation using the provided whisper hash.
   * @async
   * @param {string} whisperHash - The hash of the whisper operation whose result is to be retrieved.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the result of the whisper operation. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   */
  async whisperRetrieve(whisperHash) {
    this.logger.debug("whisper_retrieve called");
    const url = `${this.baseUrl}/whisper-retrieve`;
    const params = { whisper_hash: whisperHash };
    this.logger.debug(`url: ${url}`);

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        params,
        timeout: this.apiTimeout * 1000,
      });

      return {
        statusCode: response.status,
        extraction: response.data,
      };
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name registerWebhook
   * @description This function registers a webhook.
   * @async
   * @param {string} webhookUrl - The URL of the webhook.
   * @param {string} authToken - The authentication token for the webhook.
   * @param {string} webhookName - The name of the webhook.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the response from the webhook registration. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   *
   */
  async registerWebhook(webhookUrl, authToken, webhookName) {
    const apiUrl = `${this.baseUrl}/whisper-manage-callback`;
    const data = {
      url: webhookUrl,
      auth_token: authToken,
      webhook_name: webhookName,
    };
    const myHeaders = { ...this.headers, "Content-Type": "application/json" };
    const options = {
      method: "post",
      url: apiUrl,
      headers: myHeaders,
      timeout: 200 * 1000,
      data: data,
    };

    const response = await axios(options);

    if (response.status !== 200) {
      const message = response.data;
      message.statusCode = response.status;
      throw new LLMWhispererClientException(message.message, response.status);
    } else {
      return {
        status_code: response.status,
        message: response.data,
      };
    }
  }

  /**
   * @function
   * @name getWebhookDetails
   * @description This function retrieves the details of a webhook.
   * @async
   * @param {string} webhookName - The name of the webhook.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the details of the webhook. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   *
   */
  async getWebhookDetails(webhookName) {
    const apiUrl = `${this.baseUrl}/whisper-manage-callback`;
    const params = { webhook_name: webhookName };
    const options = {
      method: "get",
      url: apiUrl,
      headers: this.headers,
      params: params,
      timeout: 200 * 1000,
    };

    const response = await axios(options);

    if (response.status !== 200) {
      const message = response.data;
      message.statusCode = response.status;
      throw new LLMWhispererClientException(message.message, response.status);
    } else {
      return {
        status_code: response.status,
        message: response.data,
      };
    }
  }
}

module.exports = {
  LLMWhispererClient,
  LLMWhispererClientV2,
  LLMWhispererClientException,
};
