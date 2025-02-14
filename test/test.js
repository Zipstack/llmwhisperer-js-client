
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
    ["ocr", "line-printer", "restaurant_invoice_photo.pdf"],
    ["ocr", "line-printer", "credit_card.pdf"],
    // ["ocr", "line-printer", "handwritten-form.pdf"],
    // ["ocr", "text", "restaurant_invoice_photo.pdf"],
    // ["text", "line-printer", "restaurant_invoice_photo.pdf"],
    // ["text", "text", "handwritten-form.pdf"],
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
        waitForCompletion: true
      });


      const exp_basename = `${path.parse(input_file).name}.${processing_mode}.${output_mode}.txt`;
      const exp_file = path.join(data_dir, "expected", exp_basename);
      const expected_text = await fs.promises.readFile(exp_file, "utf-8");

      expect(typeof response).toBe("object");

      const extracted_text = response.extraction.result_text


      expect(response.status_code).toBe(200);
      const similarity = stringSimilarity.compareTwoStrings(extracted_text, expected_text);
      console.log(`Similarity: ${(similarity * 100).toFixed(2)}%`);
      expect(similarity * 100).toBeGreaterThan(80); // Expect at least 80% match

    },
    200000,
  );
});

// (async () => {
//   // usage_info = await client.getUsageInfo();
//   // console.log(usage_info);

//   whisper_result = await client.whisper({
//     filePath: 'data/restaurant_invoice_photo.pdf', waitForCompletion: true,
//     waitTimeout: 120,
//   });
//   console.log(whisper_result);



//   // whisper_result = await client.whisper({
//   //   filePath: 'data/test.json', waitForCompletion: true,
//   //   waitTimeout: 120,
//   // });
//   // console.log(whisper_result);

//   //result = await client.registerWebhook('https://webhook.site/2da127b3-003f-446d-a150-7a461a099f3c','','wb4');
//   //console.log(result);

//   //result = await client.getWebhookDetails('wb4');
//   //console.log(result);
// })();
