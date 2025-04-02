
const fs = require("fs");
const path = require("path");
const stringSimilarity = require("string-similarity");
const LLMWhispererClientV2 = require("../index").LLMWhispererClientV2;

const client = new LLMWhispererClientV2();

describe("LLMWhispererClientV2", () => {
  test("get_usage_info", async () => {
    const usage_info = await client.getUsageInfo();
    console.info(usage_info);
    expect(typeof usage_info).toBe("object");
    const expected_keys = [
      "current_page_count",
      "daily_quota",
      "monthly_quota",
      "overage_page_count",
      "subscription_plan",
      "today_page_count",
    ];
    expect(Object.keys(usage_info)).toEqual(
      expect.arrayContaining(expected_keys),
    );
  });


  const test_cases = [
    ["high_quality", "layout_preserving", "restaurant_invoice_photo.pdf", 99],
    ["native_text", "layout_preserving", "credit_card.pdf", 99],
    ["form", "layout_preserving", "handwritten-form.pdf", 99],
    ["high_quality", "layout_preserving", "handwritten-form.pdf", 80],
  ];

  test.each(test_cases)(
    "whisper(%s, %s, %s)",
    async (mode, output_mode, input_file, percent_simlarity) => {
      const data_dir = path.join(__dirname, "data");
      const file_path = path.join(data_dir, input_file);
      const response = await client.whisper({
        mode: mode,
        outputMode: output_mode,
        filePath: file_path,
        timeout: 200,
        waitForCompletion: true
      });


      const exp_basename = `${path.parse(input_file).name}.${mode}.${output_mode}.txt`;
      const exp_file = path.join(data_dir, "expected", exp_basename);
      const expected_text = await fs.promises.readFile(exp_file, "utf-8");

      expect(typeof response).toBe("object");

      const extracted_text = response.extraction.result_text

      console.log(`Extracted Text: ${extracted_text}`);
      expect(response.status_code).toBe(200);
      const similarity = stringSimilarity.compareTwoStrings(extracted_text, expected_text);
      console.log(`Similarity: ${(similarity * 100).toFixed(2)}%`);
      expect(similarity * 100).toBeGreaterThan(percent_simlarity); // Expect at least 80% match

    },
    200000,
  );

  test("highlight", async () => {
    const dataDir = path.join(__dirname, "data");
    const inputFile = "credit_card.pdf";
    const filePath = path.join(dataDir, inputFile);

    // Call whisper API with line numbers enabled
    const whisperResult = await client.whisper({
      addLineNos: true,
      filePath: filePath,
      waitForCompletion: true,
    });

    const whisperHash = whisperResult.whisper_hash;

    // Fetch highlight data for lines 1-2
    const highlightData = await client.getHighlightData(whisperHash, "1-2");

    // Validate the response structure
    expect(typeof highlightData).toBe("object");
    expect(Object.keys(highlightData).length).toBe(2);
    expect(highlightData).toHaveProperty("1");
    expect(highlightData).toHaveProperty("2");

    // Validate line 1 data
    const line1 = highlightData["1"];
    expect(line1.base_y).toBe(0);
    expect(line1.base_y_percent).toBe(0);
    expect(line1.height).toBe(0);
    expect(line1.height_percent).toBe(0);
    expect(line1.page).toBe(0);
    expect(line1.page_height).toBe(0);
    expect(line1.raw).toEqual([0, 0, 0, 0]);

    // Validate line 2 data
    const line2 = highlightData["2"];
    expect(line2.base_y).toBe(155);
    expect(line2.base_y_percent).toBeCloseTo(4.8927, 4); // Approximate float comparison
    expect(line2.height).toBe(51);
    expect(line2.height_percent).toBeCloseTo(1.6098, 4); // Approximate float comparison
    expect(line2.page).toBe(0);
    expect(line2.page_height).toBe(3168);
  }, 20000); // 20-second timeout


  test("webhook", async () => {
    const url = "https://webhook.site/b76ecc5f-8320-4410-b24f-66525d2c92cb";
    const token = "";
    const webhookName = "llmwhisperer-js-client-test";
    const response = await client.registerWebhook(url, token, webhookName);

    expect(response).toEqual({ status_code: 201, message: { message: 'Webhook created successfully' } });

    const getResponse = await client.getWebhookDetails(webhookName);

    expect(getResponse).toEqual({
      status_code: 200, message: {
        auth_token: token, url: url, webhook_name: webhookName
      }
    });

    const updateResponse = await client.updateWebhookDetails(webhookName, url, "new_token");
    expect(updateResponse).toEqual({ status_code: 200, message: { message: 'Webhook updated successfully' } });

    const getUpdatedResponse = await client.getWebhookDetails(webhookName);
    expect(getUpdatedResponse).toEqual({
      status_code: 200, message: {
        auth_token: "new_token", url: url, webhook_name: webhookName
      }
    });

    const deleteResponse = await client.deleteWebhookDetails(webhookName);
    expect(deleteResponse).toEqual({ status_code: 200, message: { message: 'Webhook deleted successfully' } });

    try {
      await client.getWebhookDetails(webhookName);

    } catch (e) {
      expect(e.response.status).toBe(404);
      expect(e.response.data.message).toBe('Webhook details not found');
    }

  }, 15000); // 15-second timeout

});

