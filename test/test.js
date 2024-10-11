const fs = require("fs");
const path = require("path");
const LLMWhispererClient = require("../index").LLMWhispererClient;
const client = new LLMWhispererClient({
  apiKey: process.env.LLMWHISPERER_API_KEY,
});
describe("LLMWhispererClient", () => {
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
    ["ocr", "line-printer", "restaurant_invoice_photo.pdf"],
    ["ocr", "line-printer", "credit_card.pdf"],
    ["ocr", "line-printer", "handwritten-form.pdf"],
    ["ocr", "text", "restaurant_invoice_photo.pdf"],
    ["text", "line-printer", "restaurant_invoice_photo.pdf"],
    ["text", "text", "handwritten-form.pdf"],
  ];

  test.each(test_cases)(
    "whisper(%s, %s, %s)",
    async (processing_mode, output_mode, input_file) => {
      const data_dir = path.join(__dirname, "data");
      const file_path = path.join(data_dir, input_file);
      const response = await client.whisper({
        processingMode: processing_mode,
        outputMode: output_mode,
        filePath: file_path,
        timeout: 200,
      });
      console.debug(response);

      const exp_basename = `${path.parse(input_file).name}.${processing_mode}.${output_mode}.txt`;
      const exp_file = path.join(data_dir, "expected", exp_basename);
      const exp = await fs.promises.readFile(exp_file, "utf-8");

      expect(typeof response).toBe("object");
      expect(response.statusCode).toBe(200);
      // expect(response.extracted_text).toBe(exp);
    },
    200000,
  );

  // TODO: Review and port to Jest based tests
  test.skip("whisper", () => {
    // response = client.whisper(
    //   'https://storage.googleapis.com/pandora-static/samples/bill.jpg.pdf'
    // );
    const response = client.whisper("test_files/restaurant_invoice_photo.pdf", {
      timeout: 200,
      store_metadata_for_highlighting: true,
    });
    console.info(response);
    // expect(typeof response).toBe('object');
  });

  test.skip("whisper_status", () => {
    const response = client.whisper_status(
      "7cfa5cbb|5f1d285a7cf18d203de7af1a1abb0a3a",
    );
    console.info(response);
    expect(typeof response).toBe("object");
  });

  test.skip("whisper_retrieve", () => {
    const response = client.whisper_retrieve(
      "7cfa5cbb|5f1d285a7cf18d203de7af1a1abb0a3a",
    );
    console.info(response);
    expect(typeof response).toBe("object");
  });

  test.skip("whisper_highlight_data", () => {
    const response = client.highlight_data(
      "9924d865|5f1d285a7cf18d203de7af1a1abb0a3a",
      "Indiranagar",
    );
    console.info(response);
    expect(typeof response).toBe("object");
  });
});
