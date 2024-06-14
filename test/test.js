var LLMWhispererClient = require('../index').LLMWhispererClient;

const client = new LLMWhispererClient();


(async () => {
    // usage_info = await client.getUsageInfo();
    // console.log(usage_info);
    //whisper = await client.whisper({filePath: 'sample_files/restaurant_invoice_photo.pdf'});
    //whisper = await client.whisper({url: 'https://storage.googleapis.com/pandora-static/samples/bill.jpg.pdf'});
    // whisper = await client.whisper({
    //     filePath: 'sample_files/credit_card.pdf',
    //     processingMode: 'text',
    //     forceTextProcessing: true,
    //     pagesToExtract: '1-2',
    // });    
    //console.log(whisper);

    //6479fc48|ba4473ee92b30823c4ed3da759ef670f
    //whisper_status = await client.whisperStatus('6479fc48|ba4473ee92b30823c4ed3da759ef670f');
    //console.log(whisper_status);

    whisper = await client.whisper({
        filePath: 'sample_files/credit_card.pdf',
        timeout: 1,
        storeMetadataForHighlighting: true,
    });
    //Keep checking the status until it is completed
    statusX = whisper.status;
    while (statusX === 'processing') {
        console.log('Processing... '+whisper['whisper-hash']);
        await new Promise(r => setTimeout(r, 3000));
        whisperStatus = await client.whisperStatus(whisper['whisper-hash']);
        statusX = whisperStatus.status;
    }
    if (statusX === 'processed') {
        //Retrieve the result
        whisper = await client.whisperRetrieve(whisper['whisper-hash']);
        console.log(whisper);
    } else {
        console.log('Error');
    }

    //41ebb056|ba4473ee92b30823c4ed3da759ef670f
    highlights = await client.highlightData('41ebb056|ba4473ee92b30823c4ed3da759ef670f', 'Pay by Computer');
    console.log(highlights);

})();

