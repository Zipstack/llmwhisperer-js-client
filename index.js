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

const BASE_URL = "https://llmwhisperer-api.unstract.com/v1";

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

module.exports = {
  LLMWhispererClient,
  LLMWhispererClientException,
};
