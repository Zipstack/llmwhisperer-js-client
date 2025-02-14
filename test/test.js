
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
});

