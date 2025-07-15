import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
  try {
    const body = req.body;

    // Verify webhook is valid Trello event
    if (!body || !body.action || !body.action.data || !body.action.data.card) {
      return res.status(400).send('Invalid Trello webhook format');
    }

    const cardId = body.action.data.card.id;
    console.log('📌 List moved to: Ready for AdPiler');
    console.log('🪪 Card ID:', cardId);

    // Fetch full card details from Trello
    const cardResp = await fetch(`https://api.trello.com/1/cards/${cardId}?attachments=true&customFieldItems=true&key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`);
    const card = await cardResp.json();
    console.log('📎 Full card response from Trello:', card);

    // Extract info from card
    const clientName = card.name.toLowerCase().split(':')[0].trim();
    console.log('👤 Client from card title:', clientName);

    const spreadsheetRes = await fetch(process.env.CLIENT_SPREADSHEET_JSON_URL);
    const clientData = await spreadsheetRes.json();
    const matched = clientData.find(row => row.client.toLowerCase() === clientName);
    const clientId = matched?.adpilerId;
    console.log('✅ Matched client ID:', clientId);

    if (!clientId) return res.status(400).send('No matching AdPiler client ID');

    const attachments = card.attachments.filter(att => att.mimeType?.startsWith('image/'));
    if (attachments.length === 0) return res.status(400).send('No image attachments found.');

    for (const [index, attachment] of attachments.entries()) {
      const form = new FormData();
      form.append('name', `${card.name} - Slide ${index + 1}`);
      form.append('width', 1080); // Replace with actual dimensions if known
      form.append('height', 1080);
      form.append('max_width', 1080);
      form.append('max_height', 1080);
      form.append('responsive_width', true);
      form.append('responsive_height', true);

      const imageResp = await fetch(attachment.url);
      const imageBuffer = await imageResp.arrayBuffer();
      form.append('file', Buffer.from(imageBuffer), attachment.fileName);

      const uploadRes = await fetch(`https://platform.adpiler.com/api/v1/banners`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.ADPILER_API_KEY}`,
        },
        body: form,
      });

      const result = await uploadRes.json();
      console.log('📤 Uploaded to AdPiler:', result);

      if (!uploadRes.ok) {
        throw new Error(JSON.stringify(result));
      }
    }

    return res.status(200).send('Uploaded to AdPiler');
  } catch (error) {
    console.error('❌ Upload handler error:', error);
    return res.status(500).send('Error uploading to AdPiler');
  }
}
