/**
 * @fileoverview This file contains the LLMWhispererClientV2 and LLMWhispererClientException classes.
 * LLMWhispererClientV2 is used to interact with the LLMWhisperer API v2.
 * LLMWhispererClientException is used to handle exceptions that occur while interacting with the API.
 *
 * @requires axios
 * @requires winston
 * @requires fs
 *
 * @const {string} BASE_URL_V2 - The base URL for the LLMWhisperer API v2.
 *

 */
require("dotenv").config();
const axios = require("axios");
const axiosRetryModule = require("axios-retry");
const axiosRetry = axiosRetryModule.default;
const winston = require("winston");
const fs = require("fs");
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
 * @class LLMWhispererClientV2
 * @classdesc Represents a client for the LLMWhisperer API.
 * @constructor
 * @param {Object} [config={}] - The configuration object.
 * @param {string} [config.baseUrl=''] - The base URL for the API.
 * @param {string} [config.apiKey=''] - The API key for authentication.
 * @param {string} [config.loggingLevel=''] - The logging level (e.g., 'debug','info', 'warn', 'error').
 * @param {number} [config.maxRetries=4] - Maximum number of retry attempts (0 to disable retries).
 * @param {number} [config.initialDelay=2.0] - Initial delay in seconds before the first retry.
 * @param {number} [config.maxDelay=60.0] - Maximum delay cap in seconds between retries.
 * @param {number} [config.backoffFactor=2.0] - Exponential multiplier for retry delay.
 * @param {number} [config.jitter=1.0] - Maximum random additive jitter in seconds.

 * @property {string} baseUrl - The base URL for the API.
 * @property {string} apiKey - The API key used for authentication.
 * @property {string} loggingLevel - The logging level for the client.
 * @property {Object} logger - The logger used by the client. Initialized in the constructor.
 */
class LLMWhispererClientV2 {
  constructor({
    baseUrl = "",
    apiKey = "",
    loggingLevel = "",
    maxRetries = 4,
    initialDelay = 2.0,
    maxDelay = 60.0,
    backoffFactor = 2.0,
    jitter = 1.0,
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

    this.baseUrl =
      baseUrl || process.env.LLMWHISPERER_BASE_URL_V2 || BASE_URL_V2;
    this.logger.debug(`base_url set to ${this.baseUrl}`);

    this.apiKey = apiKey || process.env.LLMWHISPERER_API_KEY || "";

    this.headers = {
      "unstract-key": this.apiKey,
    };

    this.retryMaxRetries = maxRetries;
    this.retryInitialDelay = initialDelay;
    this.retryMaxDelay = maxDelay;
    this.retryBackoffFactor = backoffFactor;
    this.retryJitter = jitter;

    this.client = axios.create();
    axiosRetry(this.client, {
      retries: this.retryMaxRetries,
      retryCondition: (error) => {
        return (
          axiosRetryModule.isNetworkError(error) ||
          (error.response &&
            (error.response.status >= 500 || error.response.status === 429))
        );
      },
      retryDelay: (retryCount, error) => {
        const calculated = Math.min(
          this.retryInitialDelay *
            Math.pow(this.retryBackoffFactor, retryCount - 1),
          this.retryMaxDelay,
        );
        const retryAfterSec = axiosRetryModule.retryAfter(error) || 0;
        const base = Math.max(calculated, retryAfterSec / 1000);
        const jitterVal = Math.random() * this.retryJitter;
        return (base + jitterVal) * 1000;
      },
      onRetry: (retryCount, error, requestConfig) => {
        const status = error.response
          ? error.response.status
          : error.code || error.message;
        this.logger.warn(
          `Retry ${retryCount}/${this.retryMaxRetries} for ${requestConfig.url} (${status}). ` +
            `Waiting before next attempt.`,
        );
        if (requestConfig._filePath) {
          requestConfig.data = fs.createReadStream(requestConfig._filePath);
        }
      },
    });
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
      const response = await this.client.get(url, {
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
   * @param {boolean} [options.addLineNos=false] - If true, adds line numbers to the extracted text
   *                                       and saves line metadata, which can be queried later
   *                                       using the highlights API.

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
    addLineNos = false,
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
      add_line_nos: addLineNos,
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
        options._filePath = filePath;
        options.headers["Content-Type"] = "application/octet-stream";
        options.headers["Content-Length"] = fileStats.size;
      }

      const response = await this.client(options);

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
            return message;
          }
          const whisperStatus = await this.whisperStatus(whisperHash);
          this.logger.debug(`whisperStatus: ${JSON.stringify(whisperStatus)}`);

          if (whisperStatus.statusCode !== 200) {
            message["extraction"] = {};
            message["status_code"] = whisperStatus.statusCode;
            message["message"] = "Whisper client operation failed";
            return message;
          }
          if (whisperStatus.status === "accepted") {
            this.logger.debug("Status: accepted...");
          } else if (whisperStatus.status === "processing") {
            this.logger.debug("Status: processing...");
          } else if (whisperStatus.status === "error") {
            this.logger.debug("Status: error");
            this.logger.error(
              "Whisper-hash: ${whisperHash} | STATUS: failed with ${whisperStatus.message}",
            );
            message["extraction"] = {};
            message["status_code"] = -1;
            message["status"] = "error";
            message["message"] = whisperStatus.message;
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
    this.logger.debug(`whisper_status called for ${whisperHash}`);
    const url = `${this.baseUrl}/whisper-status`;
    const params = { whisper_hash: whisperHash };
    this.logger.debug(`url: ${url}`);
    this.logger.debug(`params: ${JSON.stringify(params)}`);
    delete this.headers["Content-Length"];
    this.logger.debug(`headers: ${JSON.stringify(this.headers)}`);

    try {
      const response = await this.client.get(url, {
        headers: this.headers,
        params,
        timeout: this.apiTimeout * 1000,
      });
      const message = response.data;
      message.statusCode = response.status;
      return message;
    } catch (error) {
      this.logger.debug("Hel00000000002");
      this.logger.debug(`error: ${JSON.stringify(error)}`);
      const err = error.response
        ? error.response.data
        : { message: error.message };
      this.logger.debug(`error: ${JSON.stringify(err)}`);
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
      const response = await this.client.get(url, {
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
      "axios-retry": { retries: 0 },
    };

    try {
      const response = await this.client(options);

      if (response.status !== 201) {
        const message = response.data;
        message.statusCode = response.status;
        throw new LLMWhispererClientException(message.message, response.status);
      } else {
        return {
          status_code: response.status,
          message: response.data,
        };
      }
    } catch (error) {
      if (error instanceof LLMWhispererClientException) throw error;
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name updateWebhookDetails
   * @description This function updates the details of a webhook.
   * @async
   * @param {string} webhookName - The name of the webhook.
   * @param {string} webhookUrl - The URL of the webhook.
   * @param {string} authToken - The authentication token for the webhook.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the response from the webhook details update. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   *
   */
  async updateWebhookDetails(webhookName, webhookUrl, authToken) {
    const apiUrl = `${this.baseUrl}/whisper-manage-callback`;
    const data = {
      webhook_name: webhookName,
      url: webhookUrl,
      auth_token: authToken,
    };
    const myHeaders = { ...this.headers, "Content-Type": "application/json" };
    const options = {
      method: "put",
      url: apiUrl,
      headers: myHeaders,
      timeout: this.apiTimeout * 1000,
      data: data,
    };

    try {
      const response = await this.client(options);

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
    } catch (error) {
      if (error instanceof LLMWhispererClientException) throw error;
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
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

    try {
      const response = await this.client(options);

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
    } catch (error) {
      if (error instanceof LLMWhispererClientException) throw error;
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * @function
   * @name deleteWebhookDetails
   * @description This function deletes the details of a webhook.
   * @async
   * @param {string} webhookName - The name of the webhook.
   * @returns {Promise<Object>} Returns a promise that resolves with an object containing the response from the delete operation. The object includes the status code and the response data.
   * @throws {LLMWhispererClientException} Throws an LLMWhispererClientException if an error occurs during the operation.
   *
   */
  async deleteWebhookDetails(webhookName) {
    const apiUrl = `${this.baseUrl}/whisper-manage-callback`;
    const params = { webhook_name: webhookName };
    const options = {
      method: "delete",
      url: apiUrl,
      headers: this.headers,
      params: params,
      timeout: 200 * 1000,
    };

    try {
      const response = await this.client(options);

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
    } catch (error) {
      if (error instanceof LLMWhispererClientException) throw error;
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }

  /**
   * Retrieves the details of a text extraction process.
   *
   * This method sends a GET request to the '/whisper-detail' endpoint of the LLMWhisperer API.
   * The response is a JSON object containing metadata about the extraction job.
   * Refer to https://docs.unstract.com/llmwhisperer/llm_whisperer/apis/llm_whisperer_text_extraction_detail_api
   *
   * @param {string} whisperHash - The hash returned when starting the extraction process.
   * @returns {Promise<Object>} A promise that resolves with the extraction details including
   *   completed_at, mode, processed_pages, processing_started_at,
   *   processing_time_in_seconds, requested_pages, tag, total_pages,
   *   upload_file_size_in_kb, and whisper_hash.
   * @throws {LLMWhispererClientException} If the API request fails.
   */
  async whisperDetail(whisperHash) {
    this.logger.debug("whisper_detail called");
    const url = `${this.baseUrl}/whisper-detail`;
    const params = { whisper_hash: whisperHash };
    this.logger.debug(`url: ${url}`);

    try {
      const response = await this.client.get(url, {
        headers: this.headers,
        params,
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
   * Retrieves the highlight information of the LLMWhisperer API.
   *
   * This method sends a GET request to the '/highlights' endpoint of the LLMWhisperer API.
   * The response is a JSON object containing the usage information.
   * Refer to https://docs.unstract.com/llm_whisperer/apis/llm_whisperer_usage_api
   *
   * @param {string} whisperHash - The hash of the whisper operation.
   * @param {string} lines - Define which lines metadata to retrieve.
   *                           Example "1-5,7,21-" retrieves lines 1,2,3,4,5,7,21,22,23,...
   * @param {boolean} [extractAllLines=false] - If true, extract all lines.
   * @returns {Promise<Object>} A promise that resolves with the highlight information.
   * @throws {LLMWhispererClientException} If the API request fails.
   */
  async getHighlightData(whisperHash, lines, extractAllLines = false) {
    this.logger.debug("highlight called");
    const url = `${this.baseUrl}/highlights`;

    // Build query parameters
    const params = {
      whisper_hash: whisperHash,
      lines: lines,
      extract_all_lines: extractAllLines,
    };

    try {
      const response = await this.client(url, {
        method: "GET",
        headers: this.headers,
        params: params,
      });

      if (response.status != 200) {
        // Parse error response and throw a custom exception
        const errorData = await response.data;
        errorData.status_code = response.status;
        throw new LLMWhispererClientException(errorData);
      }

      return response.data;
    } catch (error) {
      const err = error.response
        ? error.response.data
        : { message: error.message };
      err.statusCode = error.response ? error.response.status : -1;
      throw new LLMWhispererClientException(err.message, err.statusCode);
    }
  }
}

module.exports = {
  LLMWhispererClientV2,
  LLMWhispererClientException,
};
