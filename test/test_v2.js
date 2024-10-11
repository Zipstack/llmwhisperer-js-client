const { LLMWhispererClientV2 } = require("../index");

var LLMWhispererClient = require("../index").LLMWhispererClient;

//const client = new LLMWhispererClient({apiKey:'c9b97420112f4c2aadae6fbda060680b'});
const client = new LLMWhispererClientV2();

(async () => {
  // usage_info = await client.getUsageInfo();
  // console.log(usage_info);
  whisper = await client.whisper({filePath: 'data/restaurant_invoice_photo.pdf'});
  //whisper = await client.whisper({url: 'https://storage.googleapis.com/pandora-static/samples/bill.jpg.pdf'});
  // whisper = await client.whisper({
  //     filePath: 'sample_files/credit_card.pdf',
  //     processingMode: 'text',
  //     forceTextProcessing: true,
  //     pagesToExtract: '1-2',
  // });
  console.log(whisper);

  //b4c25f17|5f1d285a7cf18d203de7af1a1abb0a3a
  //whisper_status = await client.whisperStatus('b4c25f17|5f1d285a7cf18d203de7af1a1abb0a3a');
  //console.log(whisper_status);
  // whisper_result = await client.whisperRetrieve('b4c25f17|5f1d285a7cf18d203de7af1a1abb0a3a');
  // console.log(whisper_result);

  // whisper = await client.whisper({
  //     filePath: 'sample_files/restaurant_invoice_photo.pdf',
  //     waitForCompletion: true,
  //     waitTimeout: 120,
  // });
  // console.log(whisper);

  //result = await client.registerWebhook('https://webhook.site/2da127b3-003f-446d-a150-7a461a099f3c','','wb4');
  //console.log(result);

  //result = await client.getWebhookDetails('wb4');
  //console.log(result);

//   whisper = await client.whisper({
//     filePath: "data/restaurant_invoice_photo.pdf",
//     useWebhook: "wb4",
//     webhookMetadata: "Sample Metadata",
//   });

  // whisper = await client.whisper({
  //     filePath: 'sample_files/credit_card.pdf',
  //     timeout: 1,
  //     storeMetadataForHighlighting: true,
  // });
  // //Keep checking the status until it is completed
  // statusX = whisper.status;
  // while (statusX === 'processing') {
  //     console.log('Processing... '+whisper['whisper-hash']);
  //     await new Promise(r => setTimeout(r, 3000));
  //     whisperStatus = await client.whisperStatus(whisper['whisper-hash']);
  //     statusX = whisperStatus.status;
  // }
  // if (statusX === 'processed') {
  //     //Retrieve the result
  //     whisper = await client.whisperRetrieve(whisper['whisper-hash']);
  //     console.log(whisper);
  // } else {
  //     console.log('Error');
  // }

  // //41ebb056|ba4473ee92b30823c4ed3da759ef670f
  // highlights = await client.highlightData('41ebb056|ba4473ee92b30823c4ed3da759ef670f', 'Pay by Computer');
  // console.log(highlights);
})();
