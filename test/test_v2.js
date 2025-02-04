
const { LLMWhispererClientV2 } = require("../index");

const client = new LLMWhispererClientV2();

(async () => {
  usage_info = await client.getUsageInfo();
  console.log(usage_info);

  whisper_result = await client.whisper({
    filePath: 'data/restaurant_invoice_photo.pdf', waitForCompletion: true,
    waitTimeout: 120,
  });
  console.log(whisper_result);



  whisper_result = await client.whisper({
    filePath: 'data/test.json', waitForCompletion: true,
    waitTimeout: 120,
  });
  console.log(whisper_result);

  //result = await client.registerWebhook('https://webhook.site/2da127b3-003f-446d-a150-7a461a099f3c','','wb4');
  //console.log(result);

  //result = await client.getWebhookDetails('wb4');
  //console.log(result);
})();
